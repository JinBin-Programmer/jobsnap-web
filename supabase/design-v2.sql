-- ============================================================================
-- JobSnap — Schema additions for the "design v2" prototype handoff:
--   - a "Verified" status (boss reviewed the completed job)
--   - per-task upload radius (worker must be within this many metres to
--     upload photos — replaces the old hardcoded 150m constant)
--   - worker self-created tasks ("Added by you" jobs)
--   - check-in / visit sessions (elapsed-timer flow, "active today" status)
--   - company profile fields collected at onboarding (industry, team size)
-- Run this after schema.sql, reports.sql, storage-limits.sql, and
-- manager-web-updates.sql. Idempotent where practical.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- New task status: Verified (boss has reviewed a Completed job's proof).
-- Must be its own statement — a new enum value can't be referenced by other
-- statements in the same transaction/script it was added in, so nothing
-- below this line uses the literal 'verified'.
-- ---------------------------------------------------------------------------
alter type task_status add value if not exists 'verified' after 'completed';

-- ---------------------------------------------------------------------------
-- Tasks: per-task upload radius + self-created flag
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists upload_radius_m integer not null default 150;

alter table public.tasks
  add column if not exists self_created boolean not null default false;

-- Workers can create their own jobs ("Admin left this job out? Add it
-- yourself") — previously only managers could insert tasks at all.
drop policy if exists tasks_worker_self_create on public.tasks;
create policy tasks_worker_self_create on public.tasks for insert
  with check (
    org_id = public.current_org_id()
    and assigned_to = auth.uid()
    and created_by = auth.uid()
    and self_created = true
  );

-- ---------------------------------------------------------------------------
-- Organizations: collected at onboarding, shown on client reports/invites.
-- ---------------------------------------------------------------------------
alter table public.organizations add column if not exists industry text;
alter table public.organizations add column if not exists team_size text;

-- ---------------------------------------------------------------------------
-- Check-ins: one row per "visit" — a worker checking in on-site, working
-- through the job, then checking out. Powers the mobile elapsed-timer card,
-- the "X updates sent this visit" list, and the Workers page's
-- Active/Off-today status.
-- ---------------------------------------------------------------------------
create table if not exists public.task_checkins (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  task_id         uuid not null references public.tasks(id) on delete cascade,
  worker_id       uuid not null references public.profiles(id) on delete cascade,
  checked_in_at   timestamptz not null default now(),
  checked_out_at  timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_checkins_org    on public.task_checkins(org_id);
create index if not exists idx_checkins_task   on public.task_checkins(task_id);
create index if not exists idx_checkins_worker on public.task_checkins(worker_id);

alter table public.task_checkins enable row level security;

drop policy if exists checkins_select on public.task_checkins;
create policy checkins_select on public.task_checkins for select
  using (org_id = public.current_org_id() and (public.is_manager() or worker_id = auth.uid()));

drop policy if exists checkins_insert on public.task_checkins;
create policy checkins_insert on public.task_checkins for insert
  with check (
    org_id = public.current_org_id()
    and worker_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and t.assigned_to = auth.uid())
  );

-- Worker checks themself out (or a manager corrects a stuck session).
drop policy if exists checkins_update on public.task_checkins;
create policy checkins_update on public.task_checkins for update
  using (org_id = public.current_org_id() and (public.is_manager() or worker_id = auth.uid()))
  with check (org_id = public.current_org_id() and (public.is_manager() or worker_id = auth.uid()));

-- Ties each proof update to the visit it was sent during, so "sent this
-- visit" can be counted precisely instead of guessed from timestamps.
alter table public.task_updates
  add column if not exists checkin_id uuid references public.task_checkins(id) on delete set null;

-- ============================================================================
-- Done. Nothing else to backfill — existing rows default sensibly
-- (upload_radius_m=150 matches the old hardcoded behaviour, self_created and
-- checkin_id default to "not applicable" for historical rows).
-- ============================================================================
