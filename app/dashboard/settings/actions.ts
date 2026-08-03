"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, isManager } from "@/lib/auth";
import type { KpiMetric } from "@/lib/types";

function numOrNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function saveKpiSettings(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const { error } = await supabase
    .from("kpi_settings")
    .update({
      kpi_enabled: formData.get("kpi_enabled") === "true",
      task_kpi_enabled: formData.get("task_kpi_enabled") === "true",
      task_kpi_period: String(formData.get("task_kpi_period") || "daily"),
      task_kpi_target: numOrNull(formData.get("task_kpi_target")),
      money_kpi_enabled: formData.get("money_kpi_enabled") === "true",
      money_kpi_period: String(formData.get("money_kpi_period") || "daily"),
      money_kpi_target: numOrNull(formData.get("money_kpi_target")),
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", profile.org_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/kpi");
}

// Replaces the org's whole bonus ladder for one metric — no worker progress
// is tied to a specific tier row, so a full delete-then-reinsert on save is
// simplest and safe (same reasoning as other full-replace list saves here).
export async function saveBonusTiers(metric: KpiMetric, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  let tiers: { threshold_pct: number; bonus_amount: number }[] = [];
  try {
    tiers = JSON.parse(String(formData.get("tiers_json") || "[]"));
  } catch {
    throw new Error("Invalid tier data");
  }

  const { error: delErr } = await supabase
    .from("kpi_bonus_tiers")
    .delete()
    .eq("org_id", profile.org_id)
    .eq("metric", metric);
  if (delErr) throw new Error(delErr.message);

  const rows = tiers
    .filter((t) => Number.isFinite(t.threshold_pct) && Number.isFinite(t.bonus_amount))
    .map((t) => ({
      org_id: profile.org_id,
      metric,
      threshold_pct: t.threshold_pct,
      bonus_amount: t.bonus_amount,
    }));

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("kpi_bonus_tiers").insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/kpi");
}

// One worker's two overrides (task target, money target) saved together.
// Empty input clears that override (falls back to the org default).
export async function setWorkerKpiTargets(workerId: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const taskTarget = numOrNull(formData.get("task_target"));
  const moneyTarget = numOrNull(formData.get("money_target"));

  for (const [metric, target] of [
    ["task", taskTarget],
    ["money", moneyTarget],
  ] as [KpiMetric, number | null][]) {
    if (target === null) {
      const { error } = await supabase
        .from("worker_kpi_targets")
        .delete()
        .eq("org_id", profile.org_id)
        .eq("worker_id", workerId)
        .eq("metric", metric);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("worker_kpi_targets")
        .upsert(
          { org_id: profile.org_id, worker_id: workerId, metric, target, updated_at: new Date().toISOString() },
          { onConflict: "worker_id,metric" }
        );
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/kpi");
}
