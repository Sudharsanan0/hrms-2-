-- ============================================================
-- Clixhora HRMS — Row level security
--
-- The browser talks to Supabase with the anon / publishable key, so every
-- table needs an explicit policy. The app has two roles:
--
--   • admin       — full access (employees, attendance, payroll, settings)
--   • employee    — read the company directory, read/write ONLY their own
--                   attendance record, their own leave and correction requests
--                   and their own published payslips.
--
-- `public.is_admin()` reads the role from `public.profiles` for the signed in
-- user. The function is SECURITY DEFINER so the policy can read `profiles`
-- without recursing through its own policies.
-- ============================================================

-- ─── Role helper ───────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.auth_user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.current_employee_id() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_employee_id() to authenticated;

-- ─── Enable RLS ────────────────────────────────────────────────

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'companies','profiles','departments','designations','employees',
    'employee_salaries','employee_bank_details','employee_statutory_details',
    'attendance_records','attendance_correction_requests','audit_logs',
    'leave_requests','leave_balances','payroll_runs','payslips',
    'settings','holidays'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end;
$$;

-- ─── Directory tables: readable by any signed-in user ──────────

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated using (true);

drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select to authenticated using (true);

drop policy if exists designations_select on public.designations;
create policy designations_select on public.designations
  for select to authenticated using (true);

drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings
  for select to authenticated using (true);

drop policy if exists holidays_select on public.holidays;
create policy holidays_select on public.holidays
  for select to authenticated using (true);

drop policy if exists holidays_admin_write on public.holidays;
create policy holidays_admin_write on public.holidays
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Profiles ──────────────────────────────────────────────────

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- ─── Employees ─────────────────────────────────────────────────

drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
  for select to authenticated using (true);

drop policy if exists employees_admin_insert on public.employees;
create policy employees_admin_insert on public.employees
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists employees_admin_update on public.employees;
create policy employees_admin_update on public.employees
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists employees_admin_delete on public.employees;
create policy employees_admin_delete on public.employees
  for delete to authenticated using (public.is_admin());

-- Employees may only edit their own contact details.
-- The policy restricts the ROW, the trigger below restricts the COLUMNS.
drop policy if exists employees_self_update on public.employees;
create policy employees_self_update on public.employees
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Row level security cannot restrict columns, so a trigger guards the fields
-- an employee is allowed to change on their own record.
create or replace function public.guard_employee_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.employee_code           is distinct from old.employee_code
     or new.auth_user_id         is distinct from old.auth_user_id
     or new.full_name            is distinct from old.full_name
     or new.work_email           is distinct from old.work_email
     or new.date_of_birth        is distinct from old.date_of_birth
     or new.gender               is distinct from old.gender
     or new.department_id        is distinct from old.department_id
     or new.designation_id       is distinct from old.designation_id
     or new.date_joined          is distinct from old.date_joined
     or new.employment_type      is distinct from old.employment_type
     or new.employment_status    is distinct from old.employment_status
     or new.work_location        is distinct from old.work_location
     or new.reporting_manager_id is distinct from old.reporting_manager_id
     or new.invitation_status    is distinct from old.invitation_status
     or new.is_test_data         is distinct from old.is_test_data
  then
    raise exception 'Employees may only change their own contact details.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists employees_guard_self_update on public.employees;
create trigger employees_guard_self_update
  before update on public.employees
  for each row execute function public.guard_employee_self_update();

revoke all on function public.guard_employee_self_update() from public;
grant execute on function public.guard_employee_self_update() to authenticated;

-- ─── Salary / bank / statutory ─────────────────────────────────

drop policy if exists employee_salaries_select on public.employee_salaries;
create policy employee_salaries_select on public.employee_salaries
  for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists employee_salaries_admin_write on public.employee_salaries;
create policy employee_salaries_admin_write on public.employee_salaries
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists employee_bank_details_select on public.employee_bank_details;
create policy employee_bank_details_select on public.employee_bank_details
  for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists employee_bank_details_admin_write on public.employee_bank_details;
create policy employee_bank_details_admin_write on public.employee_bank_details
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists employee_statutory_details_select on public.employee_statutory_details;
create policy employee_statutory_details_select on public.employee_statutory_details
  for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists employee_statutory_details_admin_write on public.employee_statutory_details;
create policy employee_statutory_details_admin_write on public.employee_statutory_details
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Attendance ────────────────────────────────────────────────

drop policy if exists attendance_records_select on public.attendance_records;
create policy attendance_records_select on public.attendance_records
  for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin());

-- Admins mark anybody; employees may only record their own check-in/out.
drop policy if exists attendance_records_insert on public.attendance_records;
create policy attendance_records_insert on public.attendance_records
  for insert to authenticated
  with check (
    public.is_admin()
    or (employee_id = public.current_employee_id() and source = 'web')
  );

drop policy if exists attendance_records_update on public.attendance_records;
create policy attendance_records_update on public.attendance_records
  for update to authenticated
  using (public.is_admin() or employee_id = public.current_employee_id())
  with check (public.is_admin() or employee_id = public.current_employee_id());

drop policy if exists attendance_records_admin_delete on public.attendance_records;
create policy attendance_records_admin_delete on public.attendance_records
  for delete to authenticated using (public.is_admin());

-- ─── Correction requests ───────────────────────────────────────

drop policy if exists correction_requests_select on public.attendance_correction_requests;
create policy correction_requests_select on public.attendance_correction_requests
  for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists correction_requests_insert on public.attendance_correction_requests;
create policy correction_requests_insert on public.attendance_correction_requests
  for insert to authenticated
  with check (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists correction_requests_admin_update on public.attendance_correction_requests;
create policy correction_requests_admin_update on public.attendance_correction_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Audit log ─────────────────────────────────────────────────

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated with check (true);

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (public.is_admin());

-- ─── Leave ─────────────────────────────────────────────────────

drop policy if exists leave_requests_select on public.leave_requests;
create policy leave_requests_select on public.leave_requests
  for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists leave_requests_insert on public.leave_requests;
create policy leave_requests_insert on public.leave_requests
  for insert to authenticated
  with check (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists leave_requests_update on public.leave_requests;
create policy leave_requests_update on public.leave_requests
  for update to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin())
  with check (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists leave_balances_select on public.leave_balances;
create policy leave_balances_select on public.leave_balances
  for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_admin());

drop policy if exists leave_balances_admin_write on public.leave_balances;
create policy leave_balances_admin_write on public.leave_balances
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Payroll ───────────────────────────────────────────────────

drop policy if exists payroll_runs_select on public.payroll_runs;
create policy payroll_runs_select on public.payroll_runs
  for select to authenticated using (public.is_admin());

drop policy if exists payroll_runs_admin_write on public.payroll_runs;
create policy payroll_runs_admin_write on public.payroll_runs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists payslips_select on public.payslips;
create policy payslips_select on public.payslips
  for select to authenticated
  using (
    public.is_admin()
    or (employee_id = public.current_employee_id() and status in ('finalized', 'published'))
  );

drop policy if exists payslips_admin_write on public.payslips;
create policy payslips_admin_write on public.payslips
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
