-- ============================================================================
-- JobSnap — Let managers post photo updates from the web dashboard too.
-- Run this after schema.sql (and reports.sql / storage-limits.sql, if run).
-- Idempotent.
--
-- Previously only the assigned worker could insert a task_updates row (via
-- the mobile app). This widens the insert policy so a manager can also post
-- an update on ANY task in their org — used by the new "Add update" form on
-- the task detail page in the web dashboard. worker_id is still forced to
-- auth.uid(), so task_update_media's existing policy (which checks
-- u.worker_id = auth.uid()) keeps working unchanged for manager-authored
-- updates too.
-- ============================================================================

drop policy if exists updates_insert on public.task_updates;
create policy updates_insert on public.task_updates for insert
  with check (
    org_id = public.current_org_id()
    and worker_id = auth.uid()
    and (
      exists (select 1 from public.tasks t where t.id = task_id and t.assigned_to = auth.uid())
      or public.is_manager()
    )
  );
