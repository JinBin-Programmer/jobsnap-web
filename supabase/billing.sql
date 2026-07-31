-- ============================================================================
-- JobSnap — Billing columns (Stripe)
-- Run AFTER schema.sql. Idempotent. `plan` already exists on organizations.
-- ============================================================================

alter table public.organizations
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status    text,        -- active | trialing | past_due | canceled
  add column if not exists plan_renews_at          timestamptz;

create index if not exists idx_org_stripe_customer on public.organizations(stripe_customer_id);
