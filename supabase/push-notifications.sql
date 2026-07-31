-- ============================================================================
-- JobSnap — Push notifications ("New job assigned" / "New stops added").
-- Run this after schema.sql. Idempotent.
--
-- No new RLS policies needed: profiles_self_update already lets a worker
-- write their own row (id = auth.uid()), which covers the mobile app saving
-- its own push token, and profiles_self_select already lets a manager read
-- any profile in their org, which covers the web dashboard looking up a
-- worker's token to send to. See lib/notifications.ts (mobile, writes it)
-- and lib/push.ts (web, reads + sends via Expo's push API).
-- ============================================================================

alter table public.profiles add column if not exists push_token text;
