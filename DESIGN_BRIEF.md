# JobSnap — Design Brief

A brief for redesigning JobSnap's UI (marketing site + web dashboard + mobile app). Written to hand to a designer or design tool with no prior context on the product.

## What JobSnap is

A field job tracking SaaS for small service companies in Malaysia — aircond servicing, pest control, commercial cleaning, facility maintenance. A boss assigns jobs on a web dashboard; a worker opens the job on a mobile app, does the work, and snaps photo/video proof on-site (GPS location + timestamp attached automatically); the boss bundles that proof into a report and sends it to the client.

**The core loop, in one line:** assign → snap proof on-site → client sees exactly what was done, when, and where.

## Who uses it

- **The boss / admin** (web dashboard). Typically 35–55, runs a small crew (3–15 workers), WhatsApp-native, not deeply technical, price-sensitive, currently manages proof-of-work by scrolling through WhatsApp photo dumps. Wants to look credible and organized to clients — some industries (e.g. pest control) have clients who contractually expect treatment/service records. The boss has full permission over everything at all times — can edit any task, override any restriction, upload on behalf of workers.
- **The worker** (mobile app only). Field technician, needs a near-zero-training, one-screen flow: open job → snap photo → add a short remark → send. Workers can only upload photo proof when their phone's GPS shows they're actually at the job site (~150m radius) — this is enforced, not just a suggestion — because the proof needs to mean something.

## The one thing the design must communicate

**Efficiency and traceability.** Less time chasing workers over WhatsApp for proof; more confidence that every visit is verifiable — who went, when, where, and what they did, backed by GPS + timestamp + photo, laid out as a step-by-step timeline. This is the actual sale. Everything else is secondary to making that obvious in under 5 seconds on the homepage.

## Design directions already tried — and rejected (read this before proposing anything similar)

1. **Generic stock photos of workers** (aircon technician, pest control fogging, cleaning crew) — rejected as "weird," "fake." A stranger in a stock photo doesn't represent this business, and it read as disconnected/inauthentic. **Don't use stock photography of people.** If a photo is needed, it should show an actual completed work result — but even good "result" stock photos (a branded AC unit, a foreign-looking suburban house) had licensing/geography mismatches that made them feel wrong. Current safest choice: no stock photography at all — lead with real product UI instead.
2. **An illustrated "job ticket" hero** (a perforated tear-line card with a rotated ink-stamp graphic, styled like a physical work-order docket) — rejected as gimmicky and unprofessional, not what a skeptical SME boss wants to see representing his business.
3. **Heavy decorative monospace/uppercase styling** used everywhere (eyebrows, labels, section headers) — came across as trying too hard. Keep monospace narrowly for what it's actually good for: real stamped data like GPS coordinates and timestamps, not decoration.
4. **Custom Google Fonts** (a condensed display face + a separate body face) — caused a real rendering bug in production (letters rendering with broken, exaggerated spacing). Whatever type choices are made, they need to be robust — well-tested fonts or a safe system-font stack. Don't gamble reliability for personality.
5. The generic "AI SaaS default" look — dark navy-to-blue gradient hero, `blue-600` everywhere, an Inter-like font, `rounded-xl` cards with soft shadows — is what every AI-generated SaaS site looks like right now. Worth deliberately avoiding, same as the above.

## What's worked so far

- Leading with the **real product UI** (an accurate, small mockup of the actual dashboard/task list) instead of an illustration or metaphor — reads as credible because it's the actual software, not a stand-in.
- A navy primary color (`#1D3557`) on a warm, slightly off-white background instead of stark white — feels a little more considered than default SaaS white-and-blue, without being a stunt.
- Plain, specific copy over marketing fluff. Existing headline: *"Stop digging through WhatsApp groups for proof of work."* Malay-language WhatsApp outreach copy exists too — the brand needs to work for a bilingual (EN/BM) Malaysian audience, plainspoken, not corporate.

## Screens that need a design

**Marketing site**
- Landing page: hero, pain/before-after ("without JobSnap" vs "with JobSnap"), how-it-works (3 steps), feature highlights, pricing (3 tiers: Starter/Pro/Business), FAQ
- Login, signup, onboarding (name your company)

**Web dashboard (boss)**
- Overview (stat cards, storage-usage meter, recent tasks)
- Task list (filterable by status)
- Task detail — status/priority, a **step-by-step timeline** of worker updates (each with remark + photos + GPS + timestamp), an "Add update" upload form (boss can add proof from a PC too, not just workers from mobile), an "Edit task" action always available
- Workers, Clients, Job Types (simple CRUD lists)
- Reports — generate a client-shareable report from a task's timeline; a public, no-login page the client opens (branded, printable/PDF)

**Mobile app (worker)**
- Task list (assigned jobs only)
- Task detail / "add proof" screen — camera capture, gallery picker, remark field, status selector, GPS auto-capture, blocked from submitting photos if not on-site

## Data/status vocabulary the design needs to support

- Task status: Pending, In Progress, On Hold, Completed, Cancelled
- Task priority: Low, Medium, High, Urgent
- Subscription plans: Starter (RM99/mo, 5 workers, 1GB storage), Pro (RM249/mo, 20 workers, 5GB), Business (RM499/mo, unlimited workers & storage)
- Roles: Owner/Admin (boss, full access) vs Worker (mobile-only, sees only their assigned jobs)

## Current technical constraints

- Web: Next.js 16 (App Router) + Tailwind CSS v4 + shadcn/ui component primitives already installed (button, card, badge, input, select, table, avatar, progress, dropdown-menu, etc.)
- Mobile: Expo / React Native
- Both share one Supabase backend (Postgres + Auth + Storage)

These aren't necessarily binding on a fresh design — but any design system handed back should be feasible to implement with Tailwind CSS + shadcn primitives on the web side, since that's what the codebase already uses.
