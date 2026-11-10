-- ============================================================
-- Clixhora HRMS — Reference data
--
-- Departments, designations, the attendance / leave policy and the company
-- row. Everything here is idempotent: running the migration twice never
-- creates duplicates and never overwrites your own edits.
-- ============================================================

-- ─── Company ───────────────────────────────────────────────────

insert into public.companies (id, name, slug)
values ('c0000000-0000-4000-8000-000000000001',
        'Clixhora Digital Marketing & Technology',
        'clixhora')
on conflict (id) do nothing;

-- ─── Departments ───────────────────────────────────────────────

insert into public.departments (id, name, slug, description) values
  ('d1000000-0000-4000-8000-000000000001', 'Marketing Team',   'marketing',   'Performance marketing, ads and content'),
  ('d1000000-0000-4000-8000-000000000002', 'Production Team',  'production',  'Video, photography and creative production'),
  ('d1000000-0000-4000-8000-000000000003', 'Software Team',    'software',    'Engineering, design and QA'),
  ('d1000000-0000-4000-8000-000000000004', 'Telecalling Team', 'telecalling', 'Inbound and outbound calling'),
  ('d1000000-0000-4000-8000-000000000005', 'Sales Team',       'sales',       'Online and offline sales')
on conflict (id) do nothing;

-- ─── Designations ──────────────────────────────────────────────
-- The id is derived from the department + name so the statement is stable
-- and can be re-run safely.

insert into public.designations (id, name, department_id)
select
  md5(d.slug || '::' || t.name)::uuid,
  t.name,
  d.id
from (values
  ('marketing', 'Meta Ads Specialist'),
  ('marketing', 'Google Ads Specialist'),
  ('marketing', 'Performance Marketing Specialist'),
  ('marketing', 'Digital Marketing Executive'),
  ('marketing', 'SEO Specialist'),
  ('marketing', 'Social Media Manager'),
  ('marketing', 'Content Creator'),
  ('marketing', 'Content Writer'),
  ('marketing', 'Script Writer'),
  ('marketing', 'Email Marketing Specialist'),
  ('marketing', 'Marketing Manager'),
  ('production', 'Video Editor'),
  ('production', 'Senior Video Editor'),
  ('production', 'Photographer'),
  ('production', 'Videographer'),
  ('production', 'Graphic Designer'),
  ('production', 'Motion Graphics Designer'),
  ('production', 'Creative Director'),
  ('production', 'Production Coordinator'),
  ('production', 'Production Manager'),
  ('software', 'Frontend Developer'),
  ('software', 'Backend Developer'),
  ('software', 'Full Stack Developer'),
  ('software', 'Web Developer'),
  ('software', 'Software Developer'),
  ('software', 'UI/UX Designer'),
  ('software', 'QA Engineer'),
  ('software', 'DevOps Engineer'),
  ('software', 'Mobile App Developer'),
  ('software', 'Technical Lead'),
  ('software', 'Software Team Lead'),
  ('telecalling', 'Telecaller'),
  ('telecalling', 'Senior Telecaller'),
  ('telecalling', 'Telecalling Team Lead'),
  ('telecalling', 'Telecalling Manager'),
  ('sales', 'Online Sales Executive'),
  ('sales', 'Offline Sales Executive'),
  ('sales', 'Sales Executive'),
  ('sales', 'Sales Representative'),
  ('sales', 'Business Development Executive'),
  ('sales', 'Sales Team Lead'),
  ('sales', 'Sales Manager')
) as t(dept_slug, name)
join public.departments d on d.slug = t.dept_slug
on conflict (id) do nothing;

-- ─── Attendance & leave policy ─────────────────────────────────

insert into public.settings (key, value) values
  ('attendance', '{
     "weeklyOffDays": ["Sunday"],
     "gracePeriodMinutes": 15,
     "halfDayThresholdMinutes": 240,
     "minimumFullDayMinutes": 360
   }'::jsonb),
  ('leave', '{
     "monthlyPaidLeaveEntitlement": 1,
     "carryForwardEnabled": false,
     "halfDayEnabled": true
   }'::jsonb),
  ('company', '{
     "name": "Clixhora Digital Marketing & Technology",
     "email": "hr@clixhora.com",
     "address": "Banaswadi, Bengaluru",
     "timezone": "Asia/Kolkata",
     "currency": "INR",
     "workLocation": "Banaswadi, Bengaluru"
   }'::jsonb),
  ('payroll', '{
     "payslipPublicationDay": 5,
     "payrollCutoffDay": 28,
     "standardWorkingHours": 9,
     "lopBasis": "calendar_days",
     "roundingPolicy": "round"
   }'::jsonb)
on conflict (key) do nothing;

-- ─── Holidays ──────────────────────────────────────────────────
-- Optional: replace the dates with the official 2026 holiday list.

insert into public.holidays (name, holiday_date, description, applicability, is_optional) values
  ('Republic Day', '2026-01-26', 'Government of India holiday', 'all', false),
  ('Independence Day', '2026-08-15', 'Government of India holiday', 'all', false),
  ('Ganesh Chaturthi', '2026-09-14', 'Festival holiday', 'all', false)
on conflict (holiday_date, name) do nothing;
