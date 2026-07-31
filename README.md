# JobSnap — Field Job Tracking SaaS

Multi-tenant SaaS. A boss creates jobs on the web dashboard and assigns them to workers;
workers capture photo/video + GPS proof on the (separate) mobile app; managers turn the
proof into client reports.

- **Web dashboard** (this repo): Next.js 16 + Supabase — the manager tool.
- **Mobile app** (next phase): Expo — the worker tool. Shares the same Supabase project.

## Tech
Next.js 16 (App Router, Turbopack) · Supabase (Postgres + Auth + Storage + RLS) · Tailwind v4.

## Setup

1. **Create a Supabase project**, then run `supabase/schema.sql` in the SQL editor.
   It creates all tables, RLS policies, helper functions, triggers, and the private
   `task-media` storage bucket. Then run `supabase/storage-limits.sql` to cap how
   much photo/video storage each org can use, based on its plan. Then run
   `supabase/manager-web-updates.sql` so managers can also post photo updates
   from the web dashboard (not just workers, from mobile).

2. **Auth settings (Supabase → Authentication):** for the fastest dev flow, turn OFF
   "Confirm email" so a new boss lands straight in onboarding after signup. (With it ON,
   they must confirm via email first, then log in.)

3. **Env:** copy `.env.local.example` → `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` — **server only**, used by `/api/workers` to create worker
     accounts. Never expose it to the browser.

4. Install & run:
   ```bash
   npm install
   npm run dev
   ```

## Roles
- **owner / admin** → web dashboard (create tasks, manage workers/clients/job types).
- **worker** → mobile app only. If a worker logs into the web app they get a "use the
  mobile app" notice.

## Data model
`organizations` (tenant) → `profiles` (users w/ role) · `clients` · `job_types` · `tasks`
→ `task_updates` (worker remark + status + GPS) → `task_update_media` (photos/videos).

RLS isolates every row by `org_id`; workers only see tasks assigned to them.

## Storage path convention (mobile must match)
`<org_id>/<task_id>/<update_id>/<timestamp>_<filename>` in the private `task-media` bucket.

## Storage quota
Each org has a photo/video storage cap tied to its plan (Starter 1 GB / Pro 5 GB /
Business unlimited — see `lib/plans.ts` and `supabase/storage-limits.sql`). The mobile
app pre-checks before uploading; a Postgres trigger is the real enforcement, since
uploads go straight from the mobile app to Supabase Storage with no server in between.
The dashboard overview page shows current usage.

## Client reports
Open a task → **Create report** (sidebar). This writes a `reports` row with an unguessable
`share_token`. The manager gets a page at `/dashboard/reports/<id>` with:
- a **public share link** (`/r/<token>`) the client opens with no login,
- **Send on WhatsApp** and **Copy link** buttons,
- **Print / Save as PDF**.

The public page (`app/r/[token]`) is served via the **service-role key** scoped to that one
token, so clients never touch RLS or need an account.
Run `supabase/reports.sql` (after `schema.sql`) to create the table.

## Roadmap
- [x] Expo worker app (`../jobsnap-mobile`)
- [x] Client reports (shareable link + print to PDF)
- [ ] Email the report PDF directly (needs an email provider e.g. Resend)
- [ ] Subscription billing (Starter RM99 / Pro RM249 / Business RM499 per month)
