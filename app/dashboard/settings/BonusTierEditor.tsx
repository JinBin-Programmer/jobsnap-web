"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import type { KpiBonusTier } from "@/lib/types";

interface TierDraft {
  threshold_pct: number;
  bonus_amount: number;
}

function toDraft(tiers: KpiBonusTier[]): TierDraft[] {
  return tiers
    .map((t) => ({ threshold_pct: t.threshold_pct, bonus_amount: t.bonus_amount }))
    .sort((a, b) => a.threshold_pct - b.threshold_pct);
}

interface BonusTierEditorProps {
  initialTiers: KpiBonusTier[];
}

// Dynamic list of {threshold %, bonus amount} rows serialized to a hidden
// tiers_json field, mirroring the stops_json pattern in
// app/dashboard/tasks/StopsEditor.tsx. A worker's bonus for this metric is
// whichever tier's threshold they've reached, highest wins — see
// kpi_bonus_amount() in supabase/kpi.sql.
export default function BonusTierEditor({ initialTiers }: BonusTierEditorProps) {
  const [tiers, setTiers] = useState<TierDraft[]>(() => toDraft(initialTiers));

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    setTiers((prev) => [
      ...prev,
      { threshold_pct: last ? last.threshold_pct + 50 : 50, bonus_amount: last ? last.bonus_amount + 5 : 5 },
    ]);
  };

  const updateTier = (i: number, patch: Partial<TierDraft>) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };

  const removeTier = (i: number) => {
    setTiers((prev) => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      {tiers.length === 0 && (
        <p className="text-xs text-muted-foreground">No bonus tiers yet — add one below.</p>
      )}
      {tiers.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">At</span>
          <Input
            type="number"
            min={1}
            step={5}
            value={t.threshold_pct}
            onChange={(e) => updateTier(i, { threshold_pct: Number(e.target.value) || 0 })}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground">% of target, pay RM</span>
          <Input
            type="number"
            min={0}
            step={1}
            value={t.bonus_amount}
            onChange={(e) => updateTier(i, { bonus_amount: Number(e.target.value) || 0 })}
            className="w-24"
          />
          <button
            type="button"
            onClick={() => removeTier(i)}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Remove tier"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addTier}
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" />
        Add tier
      </button>

      <input type="hidden" name="tiers_json" value={JSON.stringify(tiers)} />
    </div>
  );
}
