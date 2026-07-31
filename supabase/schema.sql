-- ============================================================================
-- JobSnap — Field Job Tracking SaaS
-- Multi-tenant schema (Supabase Postgres + RLS)
-- Run this whole file in the Supabase SQL editor. Idempotent where practical.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('owner', 'admin', 'worker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('pending', 'in_progress', 'on_hold', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('photo', 'video');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- The tenant. One row per company that buys JobSnap.
create table if not exists public.organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  plan        text not null default 'starter',   -- starter | pro
  owner_id    uuid,                                -- profiles.id of the owner (set after onboarding)
  created_at  timestamptz not null default now()
);

-- Users. id == auth.users.id. Every user belongs to exactly one org.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      uuid references public.organizations(id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  role        user_role not null default 'worker',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- The boss's customers (target of future client reports).
create table if not exists public.clients (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  name         text not null,
  contact_name text,
  email        text,
  phone        text,
  address      text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- Catalog of job types (e.g. "Aircon servicing", "Landscaping").
create table if not exists public.job_types (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  description text,
  color       text default '#10b981',
  created_at  timestamptz not null default now()
);

-- The core entity.
create table if not exists public.tasks (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  description     text,
  job_type_id     uuid references public.job_types(id) on delete set null,
  client_id       uuid references public.clients(id) on delete set null,
  assigned_to     uuid references public.profiles(id) on delete set null,
  status          task_status not null default 'pending',
  priority        task_priority not null default 'medium',
  expected_start  date,
  expected_end    date,
  location_address text,
  location_lat    double precision,
  location_lng    double precision,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Each on-site submission from a worker (remark + status + GPS).
create table if not exists public.task_updates (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  task_id      uuid not null references public.tasks(id) on delete cascade,
  worker_id    uuid references public.profiles(id) on delete set null,
  remark       text,
  status       task_status,          -- status the worker set with this update (nullable = note only)
  lat          double precision,
  lng          double precision,
  accuracy     double precision,     -- GPS accuracy in metres
  created_at   timestamptz not null default now()
);

-- Photos / videos attached to an update. Stored in the private 'task-media' bucket.
create table if not exists public.task_update_media (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  update_id     uuid not null references public.task_updates(id) on delete cascade,
  task_id       uuid not null references public.tasks(id) on delete cascade,
  storage_path  text not null,
  type          media_type not null default 'photo',
  created_at    timestamptz not null default now()
);

-- Indexes
create index if not exists idx_profiles_org      on public.profiles(org_id);
create index if not exists idx_clients_org       on public.clients(org_id);
create index if not exists idx_job_types_org     on public.job_types(org_id);
create index if not exists idx_tasks_org         on public.tasks(org_id);
create index if not exists idx_tasks_assigned    on public.tasks(assigned_to);
create index if not exists idx_tasks_status      on public.tasks(status);
create index if not exists idx_updates_task      on public.task_updates(task_id);
create index if not exists idx_media_update      on public.task_update_media(update_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on profiles)
-- ---------------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner','admin') from public.profiles where id = auth.uid()), false)
$$;

-- keep tasks.updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_tasks_touch on public.tasks;
create trigger trg_tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- Auto-create a bare profile when a user signs up (org assigned later in onboarding).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stop a logged-in user from escalating their own role / switching org.
-- Service-role calls (auth.uid() is null — onboarding & worker creation) are exempt.
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (new.role is distinct from old.role or new.org_id is distinct from old.org_id)
     and not public.is_manager() then
    raise exception 'You are not allowed to change role or organization.';
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations    enable row level security;
alter table public.profiles          enable row level security;
alter table public.clients           enable row level security;
alter table public.job_types         enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_updates      enable row level security;
alter table public.task_update_media enable row level security;

-- organizations: members can read their own org; managers can update it.
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select
  using (id = public.current_org_id());

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations for update
  using (id = public.current_org_id() and public.is_manager());

-- profiles: a user can always read/insert their OWN row (needed for onboarding).
-- Members can read other profiles in the same org. Managers can update org profiles.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select
  using (id = auth.uid() or org_id = public.current_org_id());

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid() or (org_id = public.current_org_id() and public.is_manager()));

-- Generic org-scoped tables: managers manage, members read.
-- clients
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select using (org_id = public.current_org_id());
drop policy if exists clients_write on public.clients;
create policy clients_write on public.clients for all
  using (org_id = public.current_org_id() and public.is_manager())
  with check (org_id = public.current_org_id() and public.is_manager());

-- job_types
drop policy if exists job_types_select on public.job_types;
create policy job_types_select on public.job_types for select using (org_id = public.current_org_id());
drop policy if exists job_types_write on public.job_types;
create policy job_types_write on public.job_types for all
  using (org_id = public.current_org_id() and public.is_manager())
  with check (org_id = public.current_org_id() and public.is_manager());

-- tasks: managers see/manage all org tasks; workers see only tasks assigned to them.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select
  using (org_id = public.current_org_id() and (public.is_manager() or assigned_to = auth.uid()));
drop policy if exists tasks_manager_write on public.tasks;
create policy tasks_manager_write on public.tasks for all
  using (org_id = public.current_org_id() and public.is_manager())
  with check (org_id = public.current_org_id() and public.is_manager());
-- workers may update status of their own task (e.g. mark in_progress/completed)
drop policy if exists tasks_worker_update on public.tasks;
create policy tasks_worker_update on public.tasks for update
  using (org_id = public.current_org_id() and assigned_to = auth.uid())
  with check (org_id = public.current_org_id() and assigned_to = auth.uid());

-- task_updates: managers read all; workers read/insert their own task's updates.
drop policy if exists updates_select on public.task_updates;
create policy updates_select on public.task_updates for select
  using (org_id = public.current_org_id() and (public.is_manager() or worker_id = auth.uid()));
drop policy if exists updates_insert on public.task_updates;
create policy updates_insert on public.task_updates for insert
  with check (
    org_id = public.current_org_id()
    and worker_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and t.assigned_to = auth.uid())
  );

-- task_update_media
drop policy if exists media_select on public.task_update_media;
create policy media_select on public.task_update_media for select
  using (org_id = public.current_org_id() and (public.is_manager()
         or exists (select 1 from public.task_updates u where u.id = update_id and u.worker_id = auth.uid())));
drop policy if exists media_insert on public.task_update_media;
create policy media_insert on public.task_update_media for insert
  with check (org_id = public.current_org_id()
    and exists (select 1 from public.task_updates u where u.id = update_id and u.worker_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: private bucket for photos/videos.
-- Path convention: <org_id>/<task_id>/<update_id>/<timestamp>_<filename>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('task-media', 'task-media', false)
on conflict (id) do nothing;

drop policy if exists task_media_read on storage.objects;
create policy task_media_read on storage.objects for select
  using (bucket_id = 'task-media'
         and (storage.foldername(name))[1] = public.current_org_id()::text);

drop policy if exists task_media_write on storage.objects;
create policy task_media_write on storage.objects for insert
  with check (bucket_id = 'task-media'
              and (storage.foldername(name))[1] = public.current_org_id()::text);

drop policy if exists task_media_delete on storage.objects;
create policy task_media_delete on storage.objects for delete
  using (bucket_id = 'task-media'
         and (storage.foldername(name))[1] = public.current_org_id()::text
         and public.is_manager());

-- ============================================================================
-- Done. Next: workers are created server-side via the service-role key
-- (see app/api/workers/route.ts), which sets their org_id + role.
-- ============================================================================
