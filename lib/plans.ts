// Subscription plans. `storageLimitMb: null` = unlimited. Two tiers, storage
// is the only real difference — full feature set on both, no worker cap
// (nothing in the codebase actually enforces workerLimit; it was display
// copy only, so simplifying to "unlimited" here doesn't remove a real gate).
//
// storageLimitMb is display-only here (e.g. for a pricing page). The number
// that's actually enforced lives in supabase/storage-limits.sql
// (plan_storage_limit_mb) — if you change a value here, change it there too.

export type PlanId = "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string; // display only
  priceMyr: number;
  workerLimit: number | null;
  storageLimitMb: number | null;
  features: string[];
  stripePriceEnv: string; // env var name holding the Stripe price id
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceLabel: "RM30/mo",
    priceMyr: 30,
    workerLimit: null,
    storageLimitMb: 1024,
    features: [
      "Unlimited workers",
      "Unlimited tasks",
      "Photo & video proof",
      "GPS-verified check-ins",
      "Client report links",
      "1 GB photo storage",
    ],
    stripePriceEnv: "STRIPE_PRICE_STARTER",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "RM99/mo",
    priceMyr: 99,
    workerLimit: null,
    storageLimitMb: 5120,
    features: [
      "Everything in Starter",
      "5 GB photo storage",
      "Priority support",
    ],
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "pro"];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) ?? "starter"] ?? PLANS.starter;
}

export function workerLimitFor(planId: string | null | undefined): number | null {
  return getPlan(planId).workerLimit;
}

export function storageLimitMbFor(planId: string | null | undefined): number | null {
  return getPlan(planId).storageLimitMb;
}
