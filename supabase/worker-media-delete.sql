-- ============================================================================
-- JobSnap — Let a worker delete their OWN uploaded photos (the mobile app's
-- new "My uploads" self-service storage screen).
--
-- Without this, the delete button in that screen fails silently: there is
-- currently no delete policy on task_update_media at all (RLS defaults to
-- deny), and storage.objects deletes are manager-only. This file only ADDS
-- new policies alongside the existing ones — it doesn't touch or narrow
-- anything managers already have.
--
-- Run this after schema.sql (and the other supabase/*.sql migrations).
-- ============================================================================

drop policy if exists media_delete_own on public.task_update_media;
create policy media_delete_own on public.task_update_media for delete
  using (
    org_id = public.current_org_id()
    and exists (
      select 1 from public.task_updates u
      where u.id = update_id and u.worker_id = auth.uid()
    )
  );

-- Multiple permissive storage.objects policies for the same command (delete)
-- are OR'd together by Postgres, so this is additive to the existing
-- manager-only task_media_delete policy in schema.sql, not a replacement.
drop policy if exists task_media_delete_own on storage.objects;
create policy task_media_delete_own on storage.objects for delete
  using (
    bucket_id = 'task-media'
    and (storage.foldername(name))[1] = public.current_org_id()::text
    and exists (
      select 1 from public.task_update_media m
      join public.task_updates u on u.id = m.update_id
      where m.storage_path = storage.objects.name and u.worker_id = auth.uid()
    )
  );
