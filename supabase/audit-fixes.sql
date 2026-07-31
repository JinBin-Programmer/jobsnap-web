-- ============================================================================
-- JobSnap — Fixes from a full-system audit. Run after all prior migrations
-- (schema.sql, reports.sql, storage-limits.sql, manager-web-updates.sql,
-- design-v2.sql, worker-media-delete.sql, task-stops.sql,
-- push-notifications.sql). Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Managers could delete a photo from storage but not its task_update_media
--    row (no manager DELETE policy existed on that table at all — only the
--    uploading worker's own-row policy from worker-media-delete.sql). Left
--    an orphaned DB row pointing at a deleted file whenever a manager
--    deleted another worker's upload from the Media Library.
-- ---------------------------------------------------------------------------
drop policy if exists media_delete_manager on public.task_update_media;
create policy media_delete_manager on public.task_update_media for delete
  using (org_id = public.current_org_id() and public.is_manager());

-- ---------------------------------------------------------------------------
-- 2. A worker could delete their own proof photos even after a client report
--    already referenced that task — undermines the tamper-proof pitch.
--    Once a report exists for the task, only a manager (policy above) can
--    remove media from it.
-- ---------------------------------------------------------------------------
drop policy if exists media_delete_own on public.task_update_media;
create policy media_delete_own on public.task_update_media for delete
  using (
    org_id = public.current_org_id()
    and exists (
      select 1 from public.task_updates u
      where u.id = update_id and u.worker_id = auth.uid()
    )
    and not exists (
      select 1 from public.reports r where r.task_id = task_update_media.task_id
    )
  );

-- ---------------------------------------------------------------------------
-- 3. guard_profile_privileges blocked a non-manager from changing their own
--    role/org_id, but not is_active — so a deactivated worker could flip
--    themselves back to active. Extend the same guard to cover it.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (
       new.role is distinct from old.role
       or new.org_id is distinct from old.org_id
       or new.is_active is distinct from old.is_active
     )
     and not public.is_manager() then
    raise exception 'You are not allowed to change role, organization, or active status.';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Missing index — both apps query task_updates by worker_id directly
--    (mobile's "My uploads" gallery + storage-used calculation).
-- ---------------------------------------------------------------------------
create index if not exists idx_updates_worker on public.task_updates(worker_id);

-- ---------------------------------------------------------------------------
-- 5. Reports were readable by any org member via RLS, not just managers —
--    narrow information exposure (workers don't use this feature anyway).
-- ---------------------------------------------------------------------------
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select
  using (org_id = public.current_org_id() and public.is_manager());

-- ---------------------------------------------------------------------------
-- 6. Client satisfaction rating on the public report page (no login needed,
--    same trust model as the rest of that page — submitted via the
--    service-role admin client after validating the share_token).
-- ---------------------------------------------------------------------------
alter table public.reports add column if not exists client_rating smallint;
alter table public.reports add column if not exists client_feedback text;
alter table public.reports add column if not exists rated_at timestamptz;

do $$ begin
  alter table public.reports
    add constraint reports_client_rating_range check (client_rating between 1 and 5);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 7. Marks when the overdue-task cron (app/api/cron/overdue-check) has
--    already sent its one-time reminder for a task, so it doesn't nag every
--    day the task stays overdue — just once, when it first crosses the line.
-- ---------------------------------------------------------------------------
alter table public.tasks add column if not exists overdue_notified_at timestamptz;

-- ============================================================================
-- Done. No changes needed for the "unvalidated stop IDs in a filter string"
-- finding — task_stops.id is a uuid column, so Postgres itself rejects any
-- non-UUID value with a type error before the query could run; that's
-- handled at the application layer instead (friendlier error message).
-- ============================================================================
