-- ============================================================================
-- JobSnap — Multi-stop tasks ("delivery run" mode).
-- Run this after schema.sql, reports.sql, storage-limits.sql,
-- manager-web-updates.sql, and design-v2.sql. Idempotent where practical.
--
-- A task can now optionally hold multiple "stops" (e.g. 10 parcels to
-- deliver in one run) instead of a single site location. This is additive:
-- has_stops defaults to false and every existing task keeps working exactly
-- as before. When has_stops is true, the task's own location_lat/lng stay
-- null (see app/dashboard/tasks/actions.ts) and each stop carries its own
-- pin + geofence radius instead.
-- ============================================================================

alter table public.tasks add column if not exists has_stops boolean not null default false;

create table if not exists public.task_stops (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  task_id       uuid not null references public.tasks(id) on delete cascade,
  label         text not null,               -- e.g. "Parcel 3 — Ahmad, Jalan SS15/4"
  address       text,
  lat           double precision not null,
  lng           double precision not null,
  radius_m      integer not null default 50, -- tighter than task-level (150) — stops sit close together
  notes         text,                         -- optional per-stop instructions for the worker
  is_done       boolean not null default false,
  completed_at  timestamptz,
  completed_by  uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_task_stops_task on public.task_stops(task_id);
create index if not exists idx_task_stops_org  on public.task_stops(org_id);

-- Ties a proof update to the specific stop it was captured for.
alter table public.task_updates add column if not exists stop_id uuid references public.task_stops(id) on delete set null;
create index if not exists idx_task_updates_stop on public.task_updates(stop_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — mirrors the tasks_select / tasks_manager_write /
-- tasks_worker_update pattern in schema.sql exactly.
-- ---------------------------------------------------------------------------
alter table public.task_stops enable row level security;

drop policy if exists task_stops_select on public.task_stops;
create policy task_stops_select on public.task_stops for select
  using (
    org_id = public.current_org_id()
    and (
      public.is_manager()
      or exists (select 1 from public.tasks t where t.id = task_id and t.assigned_to = auth.uid())
    )
  );

-- Managers create/edit/delete stops (via the task create/edit form on web).
drop policy if exists task_stops_manager_write on public.task_stops;
create policy task_stops_manager_write on public.task_stops for all
  using (org_id = public.current_org_id() and public.is_manager())
  with check (org_id = public.current_org_id() and public.is_manager());

-- Workers can only UPDATE (mark done/undone) a stop on their own assigned
-- task — no insert/delete. Same "trust the app to send the right columns"
-- model as tasks_worker_update; no worker-created-stop exception here
-- (unlike tasks_worker_self_create for whole tasks).
drop policy if exists task_stops_worker_update on public.task_stops;
create policy task_stops_worker_update on public.task_stops for update
  using (
    org_id = public.current_org_id()
    and exists (select 1 from public.tasks t where t.id = task_id and t.assigned_to = auth.uid())
  )
  with check (
    org_id = public.current_org_id()
    and exists (select 1 from public.tasks t where t.id = task_id and t.assigned_to = auth.uid())
  );

-- ============================================================================
-- Done. Nothing to backfill — has_stops defaults false, existing tasks are
-- untouched. No sequence/order column: stop order isn't enforced (workers
-- complete stops in whatever order suits their route), so stops just render
-- in created_at order.
-- ============================================================================
