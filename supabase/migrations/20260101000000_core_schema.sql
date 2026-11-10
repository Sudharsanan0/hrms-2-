-- ============================================================
-- Clixhora HRMS — Core schema
--
-- Creates every table the app reads and writes, plus row level security
-- policies. The column names match the repositories in
-- src/services/repositories/* exactly (snake_case in the database,
-- camelCase in the app).
--
-- Apply with:  supabase db push        (CLI)
--           or: paste into the Supabase SQL editor and run once.
-- ============================================================

-- ─── Helper: keep `updated_at` in sync ───────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Company / profile (authentication bridge) ─────────────────

create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete set null,
  role        text not null default 'employee',
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Organisation catalogue ────────────────────────────────────

create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.designations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  department_id uuid references public.departments(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (department_id, name)
);

-- ─── Employees ─────────────────────────────────────────────────

create table if not exists public.employees (
  id                    uuid primary key default gen_random_uuid(),
  employee_code         text not null unique,
  auth_user_id          uuid unique references auth.users(id) on delete set null,
  full_name             text not null,
  work_email            text not null unique,
  personal_email        text,
  contact_number        text,
  date_of_birth         date,
  gender                text,
  address               text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  department_id         uuid references public.departments(id) on delete set null,
  designation_id        uuid references public.designations(id) on delete set null,
  date_joined           date not null default current_date,
  employment_type       text not null default 'full_time',
  employment_status     text not null default 'active',
  work_location         text,
  reporting_manager_id  uuid references public.employees(id) on delete set null,
  invitation_status     text not null default 'not_invited',
  is_test_data          boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists employees_employment_status_idx on public.employees (employment_status);
create index if not exists employees_department_idx on public.employees (department_id);

create table if not exists public.employee_salaries (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references public.employees(id) on delete cascade,
  effective_from   date not null,
  effective_to     date,
  basic_salary     numeric(12,2) not null default 0,
  hra              numeric(12,2) not null default 0,
  other_allowances numeric(12,2) not null default 0,
  gross_salary     numeric(12,2) not null default 0,
  pf_applicable    boolean not null default false,
  esi_applicable   boolean not null default false,
  pt_applicable    boolean not null default false,
  tds_applicable   boolean not null default false,
  payment_mode     text not null default 'bank_transfer',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.employee_bank_details (
  id                  uuid primary key default gen_random_uuid(),
  employee_id         uuid not null references public.employees(id) on delete cascade,
  bank_name           text,
  account_number      text,
  ifsc_code           text,
  account_holder_name text,
  payment_mode        text not null default 'bank_transfer',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.employee_statutory_details (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  pan_number    text,
  uan_number    text,
  pf_member_id  text,
  esi_number    text,
  pf_applicable boolean not null default false,
  esi_applicable boolean not null default false,
  pt_applicable boolean not null default false,
  tds_applicable boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Attendance ────────────────────────────────────────────────

create table if not exists public.attendance_records (
  id                uuid primary key default gen_random_uuid(),
  employee_id       uuid not null references public.employees(id) on delete cascade,
  attendance_date   date not null,
  status            text not null default 'not_marked',
  source            text not null default 'manual_admin',
  check_in_at       timestamptz,
  check_out_at      timestamptz,
  total_minutes     integer,
  notes             text,
  correction_reason text,
  created_by        uuid,
  updated_by        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- One record per employee per day — enforced by the database.
  unique (employee_id, attendance_date)
);

create index if not exists attendance_records_date_idx on public.attendance_records (attendance_date);

create table if not exists public.attendance_correction_requests (
  id                    uuid primary key default gen_random_uuid(),
  employee_id           uuid not null references public.employees(id) on delete cascade,
  attendance_record_id  uuid references public.attendance_records(id) on delete set null,
  attendance_date       date not null,
  requested_check_in    time,
  requested_check_out   time,
  requested_status      text,
  reason                text not null,
  status                text not null default 'pending',
  reviewed_by           uuid,
  reviewed_at           timestamptz,
  review_note           text,
  created_at            timestamptz not null default now()
);

create index if not exists correction_requests_employee_idx on public.attendance_correction_requests (employee_id);

create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_name    text,
  action        text not null,
  entity_type   text not null,
  entity_id     text not null,
  before_data   jsonb,
  after_data    jsonb,
  reason        text,
  created_at    timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ─── Leave ─────────────────────────────────────────────────────

create table if not exists public.leave_requests (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  leave_type   text not null default 'paid',
  start_date   date not null,
  end_date     date not null,
  duration     numeric(6,2) not null default 1,
  is_half_day  boolean not null default false,
  reason       text not null,
  status       text not null default 'pending',
  reviewed_by  uuid,
  reviewed_at  timestamptz,
  review_note  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists leave_requests_employee_idx on public.leave_requests (employee_id);

create table if not exists public.leave_balances (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(id) on delete cascade,
  leave_month     text not null,
  entitled_days   numeric(6,2) not null default 0,
  reserved_days   numeric(6,2) not null default 0,
  used_days       numeric(6,2) not null default 0,
  remaining_days  numeric(6,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (employee_id, leave_month)
);

-- ─── Payroll ───────────────────────────────────────────────────

create table if not exists public.payroll_runs (
  id                   uuid primary key default gen_random_uuid(),
  payroll_month        text not null unique,
  status               text not null default 'draft',
  prepared_at          timestamptz,
  finalized_at         timestamptz,
  payment_date         date,
  payment_confirmed_at timestamptz,
  published_at         timestamptz,
  total_gross          numeric(14,2) not null default 0,
  total_deductions     numeric(14,2) not null default 0,
  total_net            numeric(14,2) not null default 0,
  employee_count       integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.payslips (
  id                  uuid primary key default gen_random_uuid(),
  payroll_run_id      uuid references public.payroll_runs(id) on delete cascade,
  employee_id         uuid not null references public.employees(id) on delete cascade,
  payroll_month       text not null,
  version             integer not null default 1,
  status              text not null default 'draft',
  storage_path        text,
  generated_at        timestamptz,
  published_at        timestamptz,
  payslip_number      text not null,
  basic_salary        numeric(12,2) not null default 0,
  gross_salary        numeric(12,2) not null default 0,
  total_deductions    numeric(12,2) not null default 0,
  net_salary          numeric(12,2) not null default 0,
  payable_days        numeric(6,2) not null default 0,
  lop_days            numeric(6,2) not null default 0,
  earnings            jsonb not null default '[]'::jsonb,
  deductions          jsonb not null default '[]'::jsonb,
  attendance_summary  jsonb not null default '{}'::jsonb,
  date_joined         date,
  payment_mode        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (employee_id, payroll_month, version)
);

create index if not exists payslips_employee_idx on public.payslips (employee_id);

-- ─── Settings & holidays ───────────────────────────────────────

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.holidays (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  holiday_date date not null,
  description  text,
  applicability text not null default 'all',
  is_optional  boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (holiday_date, name)
);

-- ─── updated_at triggers ───────────────────────────────────────

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles','employees','employee_salaries','employee_bank_details',
    'employee_statutory_details','attendance_records','leave_requests',
    'leave_balances','payroll_runs','payslips','settings'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      tbl || '_set_updated_at', tbl
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      tbl || '_set_updated_at', tbl
    );
  end loop;
end;
$$;
