import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Progress } from "@/app/components/ui/progress";
import type { KpiPeriod, KpiProgressRow } from "@/lib/types";

const PERIOD_LABEL: Record<KpiPeriod, string> = {
  daily: "Today",
  weekly: "This week",
  monthly: "This month",
};

function pct(achieved: number, target: number | null) {
  if (!target) return null;
  return Math.round((achieved / target) * 100);
}

function MetricCell({
  achieved,
  target,
  bonus,
  unit,
}: {
  achieved: number;
  target: number | null;
  bonus: number;
  unit: "pts" | "RM";
}) {
  const p = pct(achieved, target);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink">
          {unit === "RM" ? `RM${achieved.toFixed(0)}` : achieved}
          {target != null && (
            <span className="font-normal text-muted-foreground"> / {unit === "RM" ? `RM${target}` : `${target} pts`}</span>
          )}
        </span>
        {p != null && <span className="text-xs font-bold text-muted-foreground">{p}%</span>}
      </div>
      {target != null ? (
        <Progress
          value={Math.min(100, p ?? 0)}
          className="h-1.5 bg-meter-track"
          indicatorClassName={p != null && p >= 100 ? "bg-success" : "bg-primary"}
        />
      ) : (
        <p className="text-xs text-muted-foreground">No target set</p>
      )}
      {bonus > 0 && (
        <p className="mt-1 text-xs font-bold text-success">🎉 RM{bonus.toFixed(0)} bonus reached</p>
      )}
    </div>
  );
}

export default async function KpiPage() {
  const { supabase, profile } = await requireProfile();

  const { data } = await supabase.rpc("kpi_progress");
  const rows = (data ?? []) as KpiProgressRow[];

  const taskEnabled = rows.some((r) => r.task_enabled);
  const moneyEnabled = rows.some((r) => r.money_enabled);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Worker KPI</h1>
          <p className="text-sm text-muted-foreground">How each worker is tracking against their target.</p>
        </div>
        <Link href="/dashboard/settings" className="text-sm font-semibold text-primary hover:underline">
          KPI settings
        </Link>
      </div>

      {!taskEnabled && !moneyEnabled ? (
        <div className="card-shadow mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-ink">KPI tracking isn&apos;t set up yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn it on and set a target in{" "}
            <Link href="/dashboard/settings" className="text-primary underline">
              Settings
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="card-shadow mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <div
            className="grid gap-3 border-b border-border-strong bg-background px-5 py-3"
            style={{
              gridTemplateColumns: `1.4fr ${taskEnabled ? "1.3fr" : ""} ${moneyEnabled ? "1.3fr" : ""}`.trim(),
            }}
          >
            <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Worker</span>
            {taskEnabled && (
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                Tasks · {PERIOD_LABEL[rows[0]?.task_period ?? "daily"]}
              </span>
            )}
            {moneyEnabled && (
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
                Money · {PERIOD_LABEL[rows[0]?.money_period ?? "daily"]}
              </span>
            )}
          </div>
          {rows.map((r) => (
            <div
              key={r.worker_id}
              className="grid items-center gap-3 border-b border-divider px-5 py-3.5 last:border-b-0"
              style={{
                gridTemplateColumns: `1.4fr ${taskEnabled ? "1.3fr" : ""} ${moneyEnabled ? "1.3fr" : ""}`.trim(),
              }}
            >
              <span className="text-sm font-semibold text-ink">{r.full_name || "—"}</span>
              {taskEnabled && (
                <MetricCell achieved={r.task_achieved} target={r.task_target} bonus={r.task_bonus} unit="pts" />
              )}
              {moneyEnabled && (
                <MetricCell achieved={r.money_achieved} target={r.money_target} bonus={r.money_bonus} unit="RM" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
