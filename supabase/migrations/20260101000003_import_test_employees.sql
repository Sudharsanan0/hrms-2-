-- ============================================================
-- Clixhora HRMS — Import of the six test employees
--
-- These are the six records (CLX-01 … CLX-06) that used to live only in the
-- browser session. This migration moves them into the database SAFELY:
--
--   • It never deletes or overwrites an existing record.
--   • It keeps the CLX-xx code only when that code is still free.
--   • It is idempotent — running it twice does not create duplicates.
--   • The rows are flagged with is_test_data = true so they can be found
--     and removed in one statement later:
--
--       delete from public.employees where is_test_data = true;
--
-- The same import can also be triggered from the app:
-- Employees page → "Import Test Employees" (development builds only).
-- ============================================================

with source(employee_code, full_name, work_email, contact_number, date_of_birth, gender,
            address, dept_slug, designation_name, date_joined, employment_type,
            work_location, basic_salary, hra, other_allowances, pf_applicable, esi_applicable) as (
  values
    ('CLX-01', 'Arun Kumar',            'arun.kumar.test@example.com',           '+91 98765 43201', '1995-03-15', 'male',   'Koramangala, Bengaluru',   'marketing',   'Meta Ads Specialist',        '2025-01-10', 'full_time', 'Banaswadi, Bengaluru', 28000, 12000, 5000, true,  false),
    ('CLX-02', 'Priya Sharma',          'priya.sharma.test@example.com',         '+91 98765 43202', '1997-07-22', 'female', 'Indiranagar, Bengaluru',   'production',  'Video Editor',               '2025-02-15', 'full_time', 'Banaswadi, Bengaluru', 25000, 10000, 4000, true,  false),
    ('CLX-03', 'Karthik Raj',           'karthik.raj.test@example.com',           '+91 98765 43203', '1994-11-08', 'male',   'HSR Layout, Bengaluru',     'software',    'Frontend Developer',         '2025-03-01', 'full_time', 'Banaswadi, Bengaluru', 35000, 14000, 6000, true,  false),
    ('CLX-04', 'Divya R',               'divya.r.test@example.com',               '+91 98765 43204', '1998-05-30', 'female', 'Whitefield, Bengaluru',     'telecalling', 'Telecaller',                 '2025-04-10', 'full_time', 'Banaswadi, Bengaluru', 18000,  8000, 3000, false, true),
    ('CLX-05', 'Sanjay Kumar',          'sanjay.kumar.test@example.com',          '+91 98765 43205', '1996-09-14', 'male',   'Marathahalli, Bengaluru',   'sales',       'Online Sales Executive',     '2025-05-20', 'full_time', 'Banaswadi, Bengaluru', 22000,  9000, 4000, true,  false),
    ('CLX-06', 'sudharsanan muthu',    'sudharsanan.muthu.test@example.com',    '+91 98765 43206', '1995-11-02', 'male',   'Hebbal, Bengaluru',        'marketing',   'Google Ads Specialist',      '2025-06-05', 'full_time', 'Banaswadi, Bengaluru', 26000, 11000, 4500, true,  false)
)
insert into public.employees (
  employee_code, full_name, work_email, contact_number, date_of_birth, gender, address,
  department_id, designation_id, date_joined, employment_type, employment_status,
  work_location, invitation_status, is_test_data, created_at, updated_at
)
select
  s.employee_code,
  s.full_name,
  s.work_email,
  s.contact_number,
  s.date_of_birth::date,
  s.gender,
  s.address,
  d.id,
  dg.id,
  s.date_joined::date,
  s.employment_type,
  'active',
  s.work_location,
  'not_invited',
  true,
  now(),
  now()
from source s
join public.departments d on d.slug = s.dept_slug
join public.designations dg
  on dg.name = s.designation_name
 and dg.department_id = d.id
-- Skip a record whose work email already exists (never overwrite).
where not exists (
  select 1 from public.employees e where lower(e.work_email) = s.work_email
)
-- Skip a record whose employee code is already taken by somebody else.
and not exists (
  select 1 from public.employees e where e.employee_code = s.employee_code
)
on conflict do nothing;

-- ─── Salary structures for the imported employees ───────────────

insert into public.employee_salaries (
  employee_id, effective_from, basic_salary, hra, other_allowances, gross_salary,
  pf_applicable, esi_applicable, payment_mode
)
select
  e.id,
  e.date_joined,
  s.basic_salary,
  s.hra,
  s.other_allowances,
  s.basic_salary + s.hra + s.other_allowances,
  s.pf_applicable,
  s.esi_applicable,
  'bank_transfer'
from public.employees e
join (values
  ('arun.kumar.test@example.com',         28000, 12000, 5000, true,  false),
  ('priya.sharma.test@example.com',       25000, 10000, 4000, true,  false),
  ('karthik.raj.test@example.com',        35000, 14000, 6000, true,  false),
  ('divya.r.test@example.com',            18000,  8000, 3000, false, true),
  ('sanjay.kumar.test@example.com',       22000,  9000, 4000, true,  false),
  ('sudharsanan.muthu.test@example.com', 26000, 11000, 4500, true,  false)
) as s(work_email, basic_salary, hra, other_allowances, pf_applicable, esi_applicable)
  on s.work_email = lower(e.work_email)
where e.is_test_data = true
  and not exists (
    select 1 from public.employee_salaries sal where sal.employee_id = e.id
  );
