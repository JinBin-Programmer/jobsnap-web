-- ============================================================================
-- JobSnap — Worker KPI tracking (task/points-based + money-based), with an
-- automated tiered bonus calculation. Run after all prior migrations
-- (schema.sql, reports.sql, storage-limits.sql, manager-web-updates.sql,
-- design-v2.sql, worker-media-delete.sql, task-stops.sql,
-- push-notifications.sql, audit-fixes.sql, billing.sql). Idempotent.
--
-- JobSnap does not move money — this only computes an incentive number from
-- data already in the system (jobs completed, amounts logged) so the boss
-- can see who earned what and pay them however they already do.
--
-- IMPORTANT — run this file in TWO steps if your database doesn't already
-- have the 'verified' task_status value (you'll know because the rest of
-- this script errors with "invalid input value for enum task_status:
-- verified"):
--   1. Run ONLY the next statement (the `alter type` line right below) by
--      itself, then let it finish.
--   2. Then run the rest of this file (including that same line again is
--      fine — it's a no-op the second time).
-- This is a hard Postgres rule, not a bug: a brand-new enum value can't be
-- referenced by any other statement in the same transaction that added it,
-- and the SQL editor runs a whole pasted script as one transaction.
-- ============================================================================

alter type task_status add value if not exists 'verified' after 'completed';

-- ---------------------------------------------------------------------------
-- One row per org. Seeded automatically (trigger below) so kpi_progress()
-- never has to special-case "no settings row yet".
-- ---------------------------------------------------------------------------
create table if not exists public.kpi_settings (
  org_id            uuid primary key references public.organizations(id) on delete cascade,
  kpi_enabled       boolean not null default false,   -- master "trace KPI at all" toggle
  task_kpi_enabled  boolean not null default false,
  task_kpi_period   text not null default 'daily' check (task_kpi_period in ('daily','weekly','monthly')),
  task_kpi_target   numeric,                            -- points per period, org default; null = not set
  money_kpi_enabled boolean not null default false,
  money_kpi_period  text not null default 'daily' check (money_kpi_period in ('daily','weekly','monthly')),
  money_kpi_target  numeric,                            -- RM per period, org default; null = not set
  updated_at        timestamptz not null default now()
);

insert into public.kpi_settings (org_id)
select id from public.organizations
on conflict (org_id) do nothing;

create or replace function public.seed_kpi_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.kpi_settings (org_id) values (new.id) on conflict (org_id) do nothing;
  return new;
end $$;

drop trigger if exists on_org_created_kpi on public.organizations;
create trigger on_org_created_kpi after insert on public.organizations
  for each row execute function public.seed_kpi_settings();

-- ---------------------------------------------------------------------------
-- Per-worker target override. Absence of a row = "use the org default".
-- ---------------------------------------------------------------------------
create table if not exists public.worker_kpi_targets (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  worker_id  uuid not null references public.profiles(id) on delete cascade,
  metric     text not null check (metric in ('task','money')),
  target     numeric not null,
  updated_at timestamptz not null default now(),
  unique (worker_id, metric)
);

-- ---------------------------------------------------------------------------
-- Bonus ladder per org per metric. Worker gets the highest tier whose
-- threshold they've reached — see kpi_bonus_amount() below.
-- ---------------------------------------------------------------------------
create table if not exists public.kpi_bonus_tiers (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  metric        text not null check (metric in ('task','money')),
  threshold_pct numeric not null,   -- e.g. 50, 100, 150
  bonus_amount  numeric not null,   -- RM, awarded once per that metric's period
  created_at    timestamptz not null default now()
);
create index if not exists idx_bonus_tiers_org on public.kpi_bonus_tiers(org_id, metric);

-- ---------------------------------------------------------------------------
-- Job types: weight used for the task/points metric. Default 1 = pure
-- quantity counting; an org can give harder job types more points to make
-- it a "scoring" system instead — same underlying mechanism either way.
-- ---------------------------------------------------------------------------
alter table public.job_types add column if not exists kpi_points numeric not null default 1;

-- ---------------------------------------------------------------------------
-- Tasks: when a task first becomes 'completed', stamp it — this is what the
-- task-metric query buckets into a period. Never cleared if status later
-- moves to 'verified' or is reopened, so historical achievement stays put.
-- ---------------------------------------------------------------------------
alter table public.tasks add column if not exists completed_at timestamptz;

create or replace function public.touch_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_tasks_completed_at on public.tasks;
create trigger trg_tasks_completed_at before update on public.tasks
  for each row execute function public.touch_completed_at();

create index if not exists idx_tasks_completed_at on public.tasks(completed_at);

-- ---------------------------------------------------------------------------
-- Task updates: the money a worker collected on-site, logged alongside the
-- existing proof photo (cash snap / e-wallet screenshot) — no new upload
-- path needed, it's just one more field on the same submission.
-- ---------------------------------------------------------------------------
alter table public.task_updates add column if not exists amount_collected numeric;
create index if not exists idx_updates_amount on public.task_updates(worker_id, created_at)
  where amount_collected is not null;

-- Managers had no UPDATE policy at all on task_updates before this (only
-- insert/select existed) — needed so a manager can correct a mistyped
-- amount from the web dashboard.
drop policy if exists updates_manager_write on public.task_updates;
create policy updates_manager_write on public.task_updates for update
  using (org_id = public.current_org_id() and public.is_manager())
  with check (org_id = public.current_org_id() and public.is_manager());

-- ---------------------------------------------------------------------------
-- RLS — settings/tiers are org-scoped read for everyone (workers should be
-- able to see their own company's incentive scheme), manager-only write.
-- Per-worker overrides are more sensitive: a worker can read only their own.
-- ---------------------------------------------------------------------------
alter table public.kpi_settings       enable row level security;
alter table public.worker_kpi_targets enable row level security;
alter table public.kpi_bonus_tiers    enable row level security;

drop policy if exists kpi_settings_select on public.kpi_settings;
create policy kpi_settings_select on public.kpi_settings for select
  using (org_id = public.current_org_id());
drop policy if exists kpi_settings_write on public.kpi_settings;
create policy kpi_settings_write on public.kpi_settings for update
  using (org_id = public.current_org_id() and public.is_manager())
  with check (org_id = public.current_org_id() and public.is_manager());

drop policy if exists worker_targets_select on public.worker_kpi_targets;
create policy worker_targets_select on public.worker_kpi_targets for select
  using (org_id = public.current_org_id() and (public.is_manager() or worker_id = auth.uid()));
drop policy if exists worker_targets_write on public.worker_kpi_targets;
create policy worker_targets_write on public.worker_kpi_targets for all
  using (org_id = public.current_org_id() and public.is_manager())
  with check (org_id = public.current_org_id() and public.is_manager());

drop policy if exists bonus_tiers_select on public.kpi_bonus_tiers;
create policy bonus_tiers_select on public.kpi_bonus_tiers for select
  using (org_id = public.current_org_id());
drop policy if exists bonus_tiers_write on public.kpi_bonus_tiers;
create policy bonus_tiers_write on public.kpi_bonus_tiers for all
  using (org_id = public.current_org_id() and public.is_manager())
  with check (org_id = public.current_org_id() and public.is_manager());

-- ---------------------------------------------------------------------------
-- The read-side RPC both apps call. Mirrors the org_storage_status() pattern
-- in storage-limits.sql exactly: SECURITY DEFINER so it can freely join
-- across tables, but manually scopes rows by current_org_id() and, for
-- non-managers, by auth.uid() — the same manual re-implementation of RLS
-- that org_storage_status/current_org_id already use elsewhere. A manager
-- gets one row per active worker; a worker gets one row, their own.
-- ---------------------------------------------------------------------------
create or replace function public.kpi_bonus_amount(p_org uuid, p_metric text, p_pct numeric)
returns numeric language sql stable as $$
  select coalesce(
    (select bonus_amount from public.kpi_bonus_tiers
     where org_id = p_org and metric = p_metric and threshold_pct <= p_pct
     order by threshold_pct desc
     limit 1),
    0
  )
$$;

create or replace function public.kpi_progress()
returns table (
  worker_id      uuid,
  full_name      text,
  task_enabled   boolean,
  task_period    text,
  task_target    numeric,
  task_achieved  numeric,
  task_bonus     numeric,
  money_enabled  boolean,
  money_period   text,
  money_target   numeric,
  money_achieved numeric,
  money_bonus    numeric
)
language sql stable security definer set search_path = public as $$
  with org as (
    select * from public.kpi_settings where org_id = public.current_org_id()
  ),
  task_bounds as (
    select
      (case task_kpi_period
         when 'daily'   then date_trunc('day',   now() at time zone 'Asia/Kuala_Lumpur')
         when 'weekly'  then date_trunc('week',  now() at time zone 'Asia/Kuala_Lumpur')
         when 'monthly' then date_trunc('month', now() at time zone 'Asia/Kuala_Lumpur')
       end) at time zone 'Asia/Kuala_Lumpur' as period_start,
      (case task_kpi_period
         when 'daily'   then date_trunc('day',   now() at time zone 'Asia/Kuala_Lumpur') + interval '1 day'
         when 'weekly'  then date_trunc('week',  now() at time zone 'Asia/Kuala_Lumpur') + interval '1 week'
         when 'monthly' then date_trunc('month', now() at time zone 'Asia/Kuala_Lumpur') + interval '1 month'
       end) at time zone 'Asia/Kuala_Lumpur' as period_end
    from org
  ),
  money_bounds as (
    select
      (case money_kpi_period
         when 'daily'   then date_trunc('day',   now() at time zone 'Asia/Kuala_Lumpur')
         when 'weekly'  then date_trunc('week',  now() at time zone 'Asia/Kuala_Lumpur')
         when 'monthly' then date_trunc('month', now() at time zone 'Asia/Kuala_Lumpur')
       end) at time zone 'Asia/Kuala_Lumpur' as period_start,
      (case money_kpi_period
         when 'daily'   then date_trunc('day',   now() at time zone 'Asia/Kuala_Lumpur') + interval '1 day'
         when 'weekly'  then date_trunc('week',  now() at time zone 'Asia/Kuala_Lumpur') + interval '1 week'
         when 'monthly' then date_trunc('month', now() at time zone 'Asia/Kuala_Lumpur') + interval '1 month'
       end) at time zone 'Asia/Kuala_Lumpur' as period_end
    from org
  ),
  workers as (
    select p.id as worker_id, p.full_name
    from public.profiles p
    where p.org_id = public.current_org_id()
      and p.role = 'worker'
      and p.is_active
      and (public.is_manager() or p.id = auth.uid())
  ),
  task_achieved as (
    select t.assigned_to as worker_id, sum(coalesce(jt.kpi_points, 1)) as achieved
    from public.tasks t
    left join public.job_types jt on jt.id = t.job_type_id
    cross join task_bounds b
    where t.org_id = public.current_org_id()
      and t.status in ('completed', 'verified')
      and t.completed_at >= b.period_start and t.completed_at < b.period_end
    group by t.assigned_to
  ),
  money_achieved as (
    select u.worker_id, sum(u.amount_collected) as achieved
    from public.task_updates u
    cross join money_bounds b
    where u.org_id = public.current_org_id()
      and u.amount_collected is not null
      and u.created_at >= b.period_start and u.created_at < b.period_end
    group by u.worker_id
  )
  select
    w.worker_id,
    w.full_name,
    org.task_kpi_enabled,
    org.task_kpi_period,
    coalesce(wt.target, org.task_kpi_target) as task_target,
    coalesce(ta.achieved, 0) as task_achieved,
    public.kpi_bonus_amount(public.current_org_id(), 'task',
      coalesce(ta.achieved, 0) / nullif(coalesce(wt.target, org.task_kpi_target), 0) * 100
    ) as task_bonus,
    org.money_kpi_enabled,
    org.money_kpi_period,
    coalesce(wm.target, org.money_kpi_target) as money_target,
    coalesce(ma.achieved, 0) as money_achieved,
    public.kpi_bonus_amount(public.current_org_id(), 'money',
      coalesce(ma.achieved, 0) / nullif(coalesce(wm.target, org.money_kpi_target), 0) * 100
    ) as money_bonus
  from workers w
  cross join org
  left join task_achieved ta on ta.worker_id = w.worker_id
  left join money_achieved ma on ma.worker_id = w.worker_id
  left join public.worker_kpi_targets wt on wt.worker_id = w.worker_id and wt.metric = 'task'
  left join public.worker_kpi_targets wm on wm.worker_id = w.worker_id and wm.metric = 'money'
$$;

-- ============================================================================
-- Done. Multi-stop ("delivery run") tasks need no special-casing: they still
-- carry a job_type_id and still transition tasks.status to 'completed' via
-- the existing maybeCompleteStopsTask(), so trg_tasks_completed_at fires the
-- same way and they're automatically counted by the task metric.
-- ============================================================================
