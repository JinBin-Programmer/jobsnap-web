-- ============================================================================
-- JobSnap — Client Reports
-- Run this AFTER schema.sql in the Supabase SQL editor. Idempotent.
-- A report freezes a task's proof-of-work into something a manager can share
-- with the client via an unguessable public link (no client login needed).
-- ============================================================================

create table if not exists public.reports (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  task_id      uuid not null references public.tasks(id) on delete cascade,
  title        text not null,
  summary      text,                       -- manager's note to the client
  share_token  text not null unique,       -- random; used for the public /r/<token> page
  is_public    boolean not null default true,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_reports_org   on public.reports(org_id);
create index if not exists idx_reports_task  on public.reports(task_id);
create index if not exists idx_reports_token on public.reports(share_token);

alter table public.reports enable row level security;

-- Managers manage their own org's reports. The public page is served via the
-- service-role key (server-side), which bypasses RLS — so no anon policy needed.
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select
  using (org_id = public.current_org_id());

drop policy if exists reports_write on public.reports;
create policy reports_write on public.reports for all
  using (org_id = public.current_org_id() and public.is_manager())
  with check (org_id = public.current_org_id() and public.is_manager());
