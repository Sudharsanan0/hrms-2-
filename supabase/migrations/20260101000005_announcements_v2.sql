-- ============================================================
-- Clixhora HRMS — Announcements v2
--
-- Adds:
--   • is_pinned     — admin can pin important announcements
--   • theme         — optional visual theme for the card
--   • template_type — which template was used to create this announcement
--   • deleted_at    — soft-delete; employees never see deleted records
--
-- Safe to apply on top of migration 20260101000004.
-- ============================================================

-- ─── New columns ─────────────────────────────────────────────

alter table public.announcements
  add column if not exists is_pinned     boolean     not null default false,
  add column if not exists theme         text        not null default 'none'
                                         check (theme in ('none','red','firecrackers','flowers','ribbon','popup')),
  add column if not exists template_type text,
  add column if not exists deleted_at   timestamptz;

comment on column public.announcements.is_pinned     is 'Pinned announcements sort before unpinned ones.';
comment on column public.announcements.theme         is 'Visual theme applied to the announcement card.';
comment on column public.announcements.template_type is 'Template used to pre-fill the form (general, public_holiday, …).';
comment on column public.announcements.deleted_at    is 'Soft-delete timestamp. Non-null = deleted from employee-facing views.';

-- ─── Index for pin sort ───────────────────────────────────────
create index if not exists announcements_pinned_idx on public.announcements (is_pinned desc, publish_at desc);

-- ─── Updated select policy (hide soft-deleted rows) ──────────
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements
  for select to authenticated
  using (
    deleted_at is null
    and (
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
    )
  );

-- ─── Pin toggle helper (admin-only, callable from the browser) ─
create or replace function public.toggle_announcement_pin(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new boolean;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can pin announcements.';
  end if;

  update public.announcements
  set is_pinned = not is_pinned,
      updated_at = now()
  where id = p_id
    and deleted_at is null
  returning is_pinned into v_new;

  return coalesce(v_new, false);
end;
$$;

revoke all on function public.toggle_announcement_pin(uuid) from public;
grant execute on function public.toggle_announcement_pin(uuid) to authenticated;
