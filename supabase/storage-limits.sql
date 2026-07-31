-- ============================================================================
-- JobSnap — Per-organization photo/video storage quota, tied to plan.
-- Run this after schema.sql (and reports.sql, if you've run it).
-- Idempotent where practical.
--
-- Why: workers upload photos/videos directly from the mobile app straight to
-- Supabase Storage — there is no Next.js server in that path to gate the
-- request, so the limit must be enforced in Postgres itself (a trigger),
-- not just checked in application code.
--
-- Keep the numbers in plan_storage_limit_mb() in sync with the
-- storageLimitMb values in lib/plans.ts (that copy is display-only, e.g. for
-- a pricing page; this copy is the one that actually gets enforced).
-- ============================================================================

-- How many bytes each uploaded file is, so we can total usage per org.
alter table public.task_update_media
  add column if not exists size_bytes bigint not null default 0;

-- Cached plan-derived cap on the org row itself (fast to read, kept in sync
-- by the trigger below whenever `plan` changes).
alter table public.organizations
  add column if not exists storage_limit_mb integer;

create index if not exists idx_media_org on public.task_update_media(org_id);

-- ---------------------------------------------------------------------------
-- Plan -> storage cap (MB). null = unlimited.
-- ---------------------------------------------------------------------------
create or replace function public.plan_storage_limit_mb(p_plan text)
returns integer language sql immutable as $$
  select case p_plan
    when 'starter'  then 1024   -- RM30/mo, 1 GB
    when 'pro'      then 5120   -- RM99/mo, 5 GB
    else 1024
  end
$$;

create or replace function public.sync_storage_limit()
returns trigger language plpgsql as $$
begin
  new.storage_limit_mb := public.plan_storage_limit_mb(new.plan);
  return new;
end $$;

drop trigger if exists trg_org_storage_limit on public.organizations;
create trigger trg_org_storage_limit
  before insert or update of plan on public.organizations
  for each row execute function public.sync_storage_limit();

-- Backfill any orgs that already exist.
update public.organizations set storage_limit_mb = public.plan_storage_limit_mb(plan);

-- ---------------------------------------------------------------------------
-- Read-side helper the web dashboard and mobile app can both call
-- (RPC, so it works under each caller's own RLS session).
-- ---------------------------------------------------------------------------
create or replace function public.org_storage_status()
returns table(used_bytes bigint, limit_mb integer)
language sql stable security definer set search_path = public as $$
  select
    coalesce((select sum(size_bytes) from public.task_update_media
              where org_id = public.current_org_id()), 0),
    (select storage_limit_mb from public.organizations
              where id = public.current_org_id())
$$;

-- ---------------------------------------------------------------------------
-- Enforcement: reject the insert once the org is over its plan's cap.
-- This is the authoritative check — the mobile app also pre-checks via
-- org_storage_status() so it can skip the upload instead of wasting bandwidth,
-- but this trigger is what actually protects your storage bill.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_media_storage_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit_mb integer;
  v_used     bigint;
begin
  select storage_limit_mb into v_limit_mb from public.organizations where id = new.org_id;

  if v_limit_mb is null then
    return new; -- unlimited plan
  end if;

  select coalesce(sum(size_bytes), 0) into v_used
    from public.task_update_media where org_id = new.org_id;

  if v_used + new.size_bytes > v_limit_mb::bigint * 1024 * 1024 then
    raise exception 'STORAGE_LIMIT_REACHED: org % has used %MB of its %MB plan limit',
      new.org_id, round(v_used / 1048576.0), v_limit_mb;
  end if;

  return new;
end $$;

drop trigger if exists trg_media_storage_limit on public.task_update_media;
create trigger trg_media_storage_limit
  before insert on public.task_update_media
  for each row execute function public.enforce_media_storage_limit();

-- ============================================================================
-- Done. To change a single customer's cap without changing their plan
-- (e.g. a one-off exception), just run:
--   update public.organizations set storage_limit_mb = 10240 where id = '<org-id>';
-- It stays put until their `plan` column is updated again, which re-derives it.
-- ============================================================================
