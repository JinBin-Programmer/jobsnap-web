# JobSnap — Go-Live Checklist

Do these in order. Total time: ~2–3 hours. After this you are demo-ready.

## 1. Supabase (~20 min)

1. Create a project at https://supabase.com (free tier is fine to start).
2. SQL Editor → paste and run `supabase/schema.sql` (whole file).
3. SQL Editor → run `supabase/reports.sql`.
4. SQL Editor → run `supabase/storage-limits.sql` (per-org photo/video storage cap, enforced by plan).
5. SQL Editor → run `supabase/manager-web-updates.sql` (lets managers post photo updates from the web dashboard, not just workers from mobile).
6. SQL Editor → run `supabase/design-v2.sql` ("Verified" status, per-task upload radius, worker self-created jobs, check-in/visit sessions, company industry/team size).
7. SQL Editor → run `supabase/worker-media-delete.sql` (lets a worker delete their own uploaded photos from the mobile "My uploads" screen).
8. SQL Editor → run `supabase/task-stops.sql` (multi-stop "delivery run" tasks — a manager can drop several pins on one task, a worker checks each one off with its own proof).
9. SQL Editor → run `supabase/push-notifications.sql` (adds `profiles.push_token`, so a worker's phone can be notified when a job is assigned).
10. SQL Editor → run `supabase/audit-fixes.sql` (RLS gaps, a privilege-escalation guard, a missing index, and the client-report rating columns).
11. (Skip `billing.sql` for now — you don't need billing until customer #3.)
5. Storage → confirm the private `task-media` bucket exists (schema.sql creates it; if not, create it, **private**).
6. Authentication → Providers → Email → turn **OFF** "Confirm email" (workers are created by the boss; no email flow needed).
7. Project Settings → API: copy the **URL**, **anon key**, and **service_role key**.

## 2. Local env + smoke test (~15 min)

1. Copy `.env.local.example` → `.env.local`, fill in the three values from step 1.7.
2. `npm run dev` → sign up as yourself → complete onboarding (creates your org).
3. Seed the demo company: `node scripts/seed-demo.mjs <your-signup-email>`
4. Check the dashboard — you should see 8 realistic aircond jobs, 3 workers, 4 clients.

## 3. GitHub + Vercel (~20 min)

1. `git init` (if needed), commit, push to a **private** GitHub repo.
2. vercel.com → New Project → import the repo.
3. Add the same 3 env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), plus a new `CRON_SECRET` (any random string — protects `/api/cron/overdue-check` from being called by randoms; Vercel sends it automatically once set).
4. Deploy. Use the free `jobsnap-xxx.vercel.app` URL for now — **don't buy a domain yet**; buy it after the first paying customer.
5. The daily overdue-task reminder (`vercel.json`) only runs once deployed on Vercel — it does nothing on localhost.

## 4. Landing page personalisation (~5 min)

1. `app/page.tsx` → set `WHATSAPP_NUMBER` to your real number (60XXXXXXXXX, digits only).
2. Redeploy (git push).
3. Open the live site on your phone → tap "WhatsApp us" → confirm it opens a chat with you.

## 5. Mobile worker app (~1 hour, needs your Android phone)

1. In `jobsnap-mobile`: copy `.env.example` → `.env` with the SAME Supabase URL + anon key.
2. Run `eas init` once (creates/links an EAS project, needed for push notifications to actually issue a token — safe to skip this specific step if you don't care about push yet).
3. `npm install`, then `npx expo run:android` with your phone plugged in (USB debugging on).
   Camera, GPS, the delivery-run map, and push notifications all need this dev build — Expo Go is not enough.
4. Log in as a seeded worker (e.g. `weijian.demo@jobsnap.test` / `demo1234`).
5. Full smoke test: open a job → snap photo → add remark → mark completed → submit.
6. Verify on the web dashboard: photo, GPS pin, and status appeared on the task.
7. Reassign a job to that worker from the web dashboard → confirm their phone gets a push notification.
8. **The snap-photo loop is your demo video.** Screen-record it (phone + laptop side by side), 90 seconds.

For pilots: install the dev build APK directly on workers' phones (`npx expo run:android` produces one under `android/app/build/outputs/apk/`). Play Store submission can wait until you have paying customers.

## 6. Before the first demo

- [ ] Live URL works, WhatsApp button opens your chat
- [ ] Demo video recorded + uploaded (YouTube unlisted)
- [ ] Dashboard seeded and looking like a real company
- [ ] Worker app installed + logged in on your phone
- [ ] Read `marketing/outreach-kit.md` — scripts, demo flow, objection answers

## Known gaps (fine for pilots, fix later)

- No billing system — invoice manually, collect by bank transfer (faster anyway).
- No email sending — reports are shared via link/WhatsApp/print, which suits this market.
- Worker app is Android-first for pilots; iPhone workers need an EAS build (do it when a pilot actually has iPhone workers).
