import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import BonusTierEditor from "./BonusTierEditor";
import { saveKpiSettings, saveBonusTiers, setWorkerKpiTargets } from "./actions";
import type { KpiSettings, KpiBonusTier, WorkerKpiTarget, Profile } from "@/lib/types";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function SettingsPage() {
  const { supabase, profile } = await requireProfile();
  const orgId = profile.org_id!;

  const [{ data: settings }, { data: tiers }, { data: workers }, { data: overrides }] = await Promise.all([
    supabase.from("kpi_settings").select("*").eq("org_id", orgId).single(),
    supabase.from("kpi_bonus_tiers").select("*").eq("org_id", orgId),
    supabase.from("profiles").select("*").eq("org_id", orgId).eq("role", "worker").eq("is_active", true).order("full_name"),
    supabase.from("worker_kpi_targets").select("*").eq("org_id", orgId),
  ]);

  const s = settings as KpiSettings;
  const allTiers = (tiers ?? []) as KpiBonusTier[];
  const taskTiers = allTiers.filter((t) => t.metric === "task");
  const moneyTiers = allTiers.filter((t) => t.metric === "money");
  const targetByWorkerMetric: Record<string, number> = {};
  (overrides as WorkerKpiTarget[] | null)?.forEach((o) => {
    targetByWorkerMetric[`${o.worker_id}:${o.metric}`] = o.target;
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Worker KPI tracking — set targets and JobSnap computes progress and bonus tiers automatically.
        JobSnap doesn&apos;t move money; this only shows you who earned what so you can pay them however you
        already do.
      </p>

      <form action={saveKpiSettings} className="mt-6 space-y-6">
        <div className="card-shadow rounded-2xl border border-border bg-card p-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              name="kpi_enabled"
              value="true"
              defaultChecked={s?.kpi_enabled}
              className="h-4 w-4 rounded border-input"
            />
            Track worker KPIs
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Off by default. Turn this on to start computing targets and bonuses below.
          </p>
        </div>

        <div className="card-shadow rounded-2xl border border-border bg-card p-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              name="task_kpi_enabled"
              value="true"
              defaultChecked={s?.task_kpi_enabled}
              className="h-4 w-4 rounded border-input"
            />
            Task-based KPI
          </label>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Counts completed jobs. Every job type is worth 1 point by default — give harder job types more
            points on the{" "}
            <Link href="/dashboard/job-types" className="text-primary underline">
              Job Types
            </Link>{" "}
            page to turn this into a scoring system instead of plain quantity.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Resets</span>
              <select name="task_kpi_period" defaultValue={s?.task_kpi_period ?? "daily"} className={selectClass}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Default target (points)</span>
              <Input
                type="number"
                name="task_kpi_target"
                min={0}
                step={1}
                defaultValue={s?.task_kpi_target ?? ""}
                placeholder="e.g. 10"
              />
            </label>
          </div>
        </div>

        <div className="card-shadow rounded-2xl border border-border bg-card p-5">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              name="money_kpi_enabled"
              value="true"
              defaultChecked={s?.money_kpi_enabled}
              className="h-4 w-4 rounded border-input"
            />
            Money-based KPI
          </label>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Tracks cash / e-wallet amounts workers log when they mark a job complete on mobile (photo proof
            attached, same as usual).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Resets</span>
              <select name="money_kpi_period" defaultValue={s?.money_kpi_period ?? "daily"} className={selectClass}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Default target (RM)</span>
              <Input
                type="number"
                name="money_kpi_target"
                min={0}
                step={1}
                defaultValue={s?.money_kpi_target ?? ""}
                placeholder="e.g. 100"
              />
            </label>
          </div>
        </div>

        <Button type="submit" className="bg-primary hover:bg-[var(--primary-hover)]">
          Save KPI settings
        </Button>
      </form>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <form action={saveBonusTiers.bind(null, "task")} className="card-shadow rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-bold text-ink">Task KPI bonus tiers</p>
          <BonusTierEditor initialTiers={taskTiers} />
          <Button type="submit" size="sm" variant="outline" className="mt-4">
            Save task tiers
          </Button>
        </form>

        <form action={saveBonusTiers.bind(null, "money")} className="card-shadow rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-bold text-ink">Money KPI bonus tiers</p>
          <BonusTierEditor initialTiers={moneyTiers} />
          <Button type="submit" size="sm" variant="outline" className="mt-4">
            Save money tiers
          </Button>
        </form>
      </div>

      <div className="card-shadow mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border-strong bg-background px-5 py-3">
          <p className="text-[13px] font-bold text-ink">Per-worker target overrides</p>
          <p className="text-xs text-muted-foreground">
            Leave blank to use the org default set above.
          </p>
        </div>
        {workers && workers.length > 0 ? (
          (workers as Profile[]).map((w) => (
            <form
              key={w.id}
              action={setWorkerKpiTargets.bind(null, w.id)}
              className="grid grid-cols-[1.6fr_1fr_1fr_auto] items-center gap-2 border-b border-divider px-5 py-3 last:border-b-0"
            >
              <span className="text-sm font-semibold text-ink">{w.full_name || w.email}</span>
              <Input
                type="number"
                name="task_target"
                min={0}
                step={1}
                placeholder="Task pts"
                defaultValue={targetByWorkerMetric[`${w.id}:task`] ?? ""}
              />
              <Input
                type="number"
                name="money_target"
                min={0}
                step={1}
                placeholder="RM"
                defaultValue={targetByWorkerMetric[`${w.id}:money`] ?? ""}
              />
              <Button type="submit" size="sm" variant="outline">
                Save
              </Button>
            </form>
          ))
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">No workers yet.</div>
        )}
      </div>
    </div>
  );
}
