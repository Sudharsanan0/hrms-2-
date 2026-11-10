# Supabase setup — Clixhora HRMS

This guide connects the HRMS to a real Supabase project. Everything in the app
(Employees, Admin Dashboard, Attendance Management, Payslips, Employee profile)
reads from **one** data source, so this single setup makes all of those pages
live at the same time.

---

## 1. Create the project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Pick a region close to your team (Mumbai / Singapore for India).
3. Save the **database password** — you need it for the CLI and for SQL editor
   access.
4. Wait for the project to finish provisioning (usually ~2 minutes).

---

## 2. Get the public credentials

**Project Settings → API** (or *Data API* in the new dashboard).

You need exactly two values:

| Variable | Where it comes from | Safe in the browser? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `Project URL` → `https://<project-ref>.supabase.co` | yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `Publishable key` (`sb_publishable_…`) | yes |
| `VITE_SUPABASE_ANON_KEY` | `anon public` key (legacy projects) | yes |

> **Never** put the `service_role` / `secret` key into a `VITE_*` variable.
> Everything prefixed with `VITE_` is compiled into the browser bundle.
> The app detects a leaked service-role key, refuses to use it and shows a
> configuration error — but the right fix is to remove it from `.env`.

Create your local environment file:

```bash
cp .env.example .env
```

```dotenv
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
```

Restart the dev server afterwards — Vite only reads `.env` on startup.

---

## 3. Apply the migrations

The migrations live in [`supabase/migrations`](../supabase/migrations) and run in
this order:

| File | Purpose |
| --- | --- |
| `20260101000000_core_schema.sql` | tables, indexes, `updated_at` triggers |
| `20260101000001_row_level_security.sql` | RLS policies, role helpers, self-update column guard |
| `20260101000002_reference_data.sql` | departments, designations, policy, holidays |
| `20260101000003_import_test_employees.sql` | the six test employees (CLX-01 … CLX-06) |
| `20260101000004_announcements.sql` | announcements table + audience-aware RLS |

### Option A — Supabase CLI (recommended)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### Option B — SQL editor (no CLI needed)

Open **SQL Editor → New query** and run each file from top to bottom. Every
statement is idempotent, so re-running a file is safe.

---

## 4. Create the admin user

1. **Authentication → Users → Add user** (email + password, *Auto confirm* on).
2. Copy the user's UUID (the `#` next to the user id).
3. Run this in the SQL editor:

```sql
insert into public.profiles (id, role, full_name, company_id)
values ('<USER_UUID>', 'admin', 'Your Name',
        'c0000000-0000-4000-8000-000000000001')
on conflict (id) do update set role = 'admin';
```

Employees get a `role = 'employee'` profile — they can then see only their own
attendance, leave requests and published payslips.

An employee may update their own row, but only the contact fields
(`contact_number`, `address`, `personal_email`). The RLS policy locks the row
and the `employees_guard_self_update` trigger blocks changes to status,
department, designation and every other protected column.

---

## 5. Link a user to an employee record

Set `auth_user_id` on the employee row whose `work_email` matches the login:

```sql
update public.employees
set auth_user_id = '<USER_UUID>'
where work_email = 'arun.kumar.test@example.com';
```

Until this is done the app signs the user in, but the employee pages show
*"No employee record linked to your login"*.

---

## 6. Verify the connection

```bash
node scripts/inspect-supabase.mjs
```

The script reads `.env` (and `.env.local`), checks every table the app needs,
verifies that the reference data is seeded and prints the employee and
attendance counts. It never writes anything.

Expected output:

```
Tables
  ✓ departments — 5 rows
  ✓ employees — 6 rows
  ...
Reference data
  ✓ departments seeded — 5 departments
  ✓ attendance policy present — weekly off: Sunday
Employee data
  ✓ employees readable — 6 employees
    · 6 test record(s): CLX-01, CLX-02, CLX-03, CLX-04, CLX-05, CLX-06
```

---

## 7. Data modes

| Mode | When | Behaviour |
| --- | --- | --- |
| `supabase` | `.env` is complete | Real, persistent database |
| `demo` | no `.env`, running `npm run dev` | Six clearly-labelled sample employees stored in `localStorage` (`clixhora.demo.v1`). Never used in a production build. |
| `unconfigured` | no `.env`, production build | The UI shows an explicit setup error instead of fake numbers |

The mode is shown in a banner on the Employees, Dashboard, Attendance and
Payroll pages, so you always know which source you are looking at.

---

## 8. The six test employees

The six records (CLX-01 … CLX-06) are fictional — they use `@example.com`
addresses. They are imported by
`supabase/migrations/20260101000003_import_test_employees.sql`, or from the app:
**Employees → Import Test Employees** (development builds only).

The import is idempotent and never overwrites an existing record. If a code is
already taken, the record keeps the next free `CLX-xx` code.

To remove all of them again:

```sql
delete from public.employees where is_test_data = true;
```

---

## 9. Local verification

The repository ships with a test suite that runs against the demo adapter, so it
never touches a real project:

```bash
npm test        # 62 tests — services, repositories and page rendering
npm run lint    # oxlint
npm run build   # tsc -b + production bundle
```

`vite.config.ts` forces empty `VITE_SUPABASE_*` values for the test run, so a
real `.env` in the folder cannot leak into the tests.

`npm audit --omit=dev` is expected to report **0 vulnerabilities**. The remaining
advisories in `npm audit` come from the Tailwind 3 / PostCSS build chain, which
only runs while building CSS — they are not part of the shipped bundle and are
fixed by the Tailwind 4 major upgrade.

---

## 10. What lives where

Every module reads and writes through one shared data layer
(`src/services/*` + `src/hooks/useHrmsData.ts`), so a change in one module is
visible in the dashboard and the other portals immediately.

| Module | Table | Notes |
| --- | --- | --- |
| Employees | `employees`, `employee_salaries`, `employee_bank_details`, `employee_statutory_details` | Employees may only update their own contact fields; the `employees_guard_self_update` trigger blocks everything else |
| Attendance | `attendance_records`, `attendance_correction_requests` | One record per employee and date, corrections are audited; admins review them from **Admin → Attendance → Corrections** |
| Leave | `leave_requests`, `leave_balances` | Employees raise requests, admins approve or reject them from **Admin → Attendance → Leave Requests** |
| Payroll | `payroll_runs`, `payslips` | Employees only see published payslips of their own |
| Announcements | `announcements` | Employees see published (or due scheduled) announcements for their own department; admins can archive and permanently delete them |
| Settings | `settings`, `holidays` | Company profile, attendance/leave policy, payroll policy and the holiday calendar |

### Request workflow in demo mode

The browser-local adapter stores leave requests, attendance corrections and
announcements in `localStorage` under `clixhora.demo.v1`, so the full request
loop works without Supabase:

1. An employee raises a leave request or an attendance correction from
   **My Attendance**.
2. The request shows up on the employee's own tabs (Leave Requests, Corrections)
   with a `pending` badge.
3. An admin opens **Admin → Attendance → Leave Requests / Corrections** and
   approves or rejects it; the dashboard counters update immediately.

---

## 11. Common problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Supabase is not configured" banner | `.env` missing or still a placeholder | Copy `.env.example` → `.env`, fill in the real URL + public key, restart the dev server |
| `relation "public.employees" does not exist` | Migrations not applied | `supabase db push` (or run the SQL files in the SQL editor) |
| `permission denied for table employees` | RLS policy blocks the request | Make sure a row exists in `public.profiles` with the right role |
| Employee pages show "No employee record linked" | `auth_user_id` not set | Run the `update public.employees set auth_user_id = …` statement from step 5 |
| Dashboard shows `0` everywhere but the Employees page has data | Two different environments (e.g. `.env` vs `.env.local`) | Run `node scripts/inspect-supabase.mjs` and confirm the project ref |
