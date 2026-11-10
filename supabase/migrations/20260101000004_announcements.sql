-- ============================================================
-- Clixhora HRMS — Announcements
--
-- Announcements are company-wide (audience = 'all') or targeted at one or
-- more departments (audience = 'department' + audience_department_ids).
--
-- Access rules:
--   • admins  — read, create, edit, publish and archive every announcement
--   • employees — read published announcements that target them (company-wide
--     or their own department). Drafts, scheduled and archived announcements
--     stay invisible.
--
-- The employee read policy resolves the viewer's department through
-- public.current_employee_id(), so an employee can never read another
-- department's announcement by guessing an id.
-- ============================================================

create table if not exists public.announcements (
  id                      uuid primary key default gen_random_uuid(),
  title                   text        not null,
  body                    text        not null,
  audience                text        not null default 'all'
                                      check (audience in ('all', 'department')),
  audience_department_ids uuid[]      not null default '{}',
  status                  text        not null default 'draft'
                                      check (status in ('draft', 'scheduled', 'published', 'archived')),
  publish_at              timestamptz,
  expires_at              timestamptz,
  created_by              uuid references public.profiles (id) on delete set null,
  created_by_name         text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.announcements is 'Company-wide and department announcements.';

create index if not exists announcements_status_idx on public.announcements (status);
create index if not exists announcements_publish_at_idx on public.announcements (publish_at);

-- ─── Row level security ───────────────────────────────────────

alter table public.announcements enable row level security;

create or replace function public.current_employee_department_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(e.department_id), '{}')
  from public.employees e
  where e.auth_user_id = auth.uid()
    and e.department_id is not null;
$$;

revoke all on function public.current_employee_department_ids() from public;
grant execute on function public.current_employee_department_ids() to authenticated;

drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements
  for select to authenticated
  using (
    public.is_admin()
    or (
      status = 'published'
      and (
        audience = 'all'
        or audience_department_ids && public.current_employee_department_ids()
      )
    )
    or (
      status = 'scheduled'
      and publish_at is not null
      and publish_at <= now()
      and (
        audience = 'all'
        or audience_department_ids && public.current_employee_department_ids()
      )
    )
  );

drop policy if exists announcements_admin_write on public.announcements;
create policy announcements_admin_write on public.announcements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
