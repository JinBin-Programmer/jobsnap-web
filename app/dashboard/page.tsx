import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/app/components/Badges";
import { Plus, Loader2, CheckCircle2, Users, HardDrive, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";

export default async function DashboardOverview() {
  const { supabase, profile } = await requireProfile();
  const orgId = profile.org_id!;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const today = now.toISOString().slice(0, 10);

  const [
    { data: tasks },
    { count: activeTaskCount },
    { count: completedThisMonthCount },
    { count: workerCount },
    { data: checkinRows },
    { data: storage },
    { data: overdueTasks },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, priority, expected_end, assignee:assigned_to(full_name), client:client_id(name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["pending", "in_progress", "on_hold"]),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["completed", "verified"])
      .gte("updated_at", monthStart),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("role", "worker").eq("is_active", true),
    supabase.from("task_checkins").select("worker_id").eq("org_id", orgId).gte("checked_in_at", todayStart),
    supabase.rpc("org_storage_status").maybeSingle(),
    // Overdue: due date (expected_end, falling back to expected_start when
    // there's no end date) has passed and the job still isn't done.
    supabase
      .from("tasks")
      .select("id, title, expected_start, expected_end, assignee:assigned_to(full_name), client:client_id(name)")
      .eq("org_id", orgId)
      .in("status", ["pending", "in_progress", "on_hold"])
      .or(`and(expected_end.not.is.null,expected_end.lt.${today}),and(expected_end.is.null,expected_start.lt.${today})`)
      .order("expected_end", { ascending: true }),
  ]);

  const storageUsedBytes = (storage as { used_bytes: number } | null)?.used_bytes ?? 0;
  const storageLimitMb = (storage as { limit_mb: number | null } | null)?.limit_mb ?? null;

  const activeToday = new Set((checkinRows ?? []).map((r) => r.worker_id)).size;
  const totalWorkers = workerCount ?? 0;
  const overdueCount = overdueTasks?.length ?? 0;

  const firstName = (profile.full_name || "").trim().split(" ")[0];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
            {firstName ? `Welcome back, ${firstName}` : "Overview"}
          </h1>
          <p className="text-sm text-muted-foreground">A snapshot of your field operations.</p>
        </div>
        <Button asChild className="bg-primary shadow-sm shadow-primary/20 hover:bg-[var(--primary-hover)]">
          <Link href="/dashboard/tasks/new">
            <Plus className="h-4 w-4" />
            New task
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label="Active tasks" value={activeTaskCount ?? 0} icon={Loader2} color="steel" />
        <Stat label="Overdue" value={overdueCount} icon={AlertTriangle} color={overdueCount > 0 ? "destructive" : "success"} />
        <Stat label="Completed this month" value={completedThisMonthCount ?? 0} icon={CheckCircle2} color="success" />
        <Stat
          label="Workers active today"
          value={activeToday}
          suffix={`/${totalWorkers}`}
          icon={Users}
          color="primary"
        />
        <StorageStat usedBytes={storageUsedBytes} limitMb={storageLimitMb} />
      </div>

      {/* Overdue — needs attention */}
      {overdueCount > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-1.5 font-display text-lg font-bold text-destructive">
            <AlertTriangle className="h-4.5 w-4.5" />
            Needs attention — {overdueCount} overdue
          </h2>
          <div className="card-shadow overflow-hidden rounded-2xl border border-destructive/30 bg-card">
            {(overdueTasks ?? []).map((t) => {
              const assignee = t.assignee as unknown as { full_name: string | null } | null;
              const client = t.client as unknown as { name: string } | null;
              const dueDate = t.expected_end || t.expected_start;
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tasks/${t.id}`}
                  className="flex items-center justify-between border-t border-divider px-5 py-3 first:border-t-0 hover:bg-muted"
                >
                  <div>
                    <p className="mb-0.5 text-sm font-semibold text-ink">{t.title}</p>
                    <p className="text-[12.5px] text-muted-foreground">
                      {client?.name ?? "—"} · {assignee?.full_name ?? "Unassigned"}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-destructive">Due {dueDate}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent tasks */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Recent tasks</h2>
          <Link href="/dashboard/tasks" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="card-shadow overflow-hidden rounded-2xl border border-border bg-card">
          {tasks && tasks.length > 0 ? (
            tasks.map((t) => {
              const assignee = t.assignee as unknown as { full_name: string | null } | null;
              const client = t.client as unknown as { name: string } | null;
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tasks/${t.id}`}
                  className="flex items-center justify-between border-t border-divider px-5 py-3 first:border-t-0 hover:bg-muted"
                >
                  <div>
                    <p className="mb-0.5 text-sm font-semibold text-ink">{t.title}</p>
                    <p className="text-[12.5px] text-muted-foreground">
                      {client?.name ?? "—"} · {assignee?.full_name ?? "Unassigned"}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              );
            })
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No tasks yet.{" "}
              <Link href="/dashboard/tasks/new" className="font-medium text-primary hover:underline">
                Create your first task
              </Link>
              .
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STAT_COLORS = {
  steel: "bg-steel/10 text-steel",
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
} as const;

function Stat({
  label,
  value,
  suffix,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
  color: keyof typeof STAT_COLORS;
}) {
  return (
    <div className="card-lift card-shadow rounded-2xl border border-border bg-card p-[22px]">
      <span className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${STAT_COLORS[color]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mb-1.5 text-[12.5px] font-semibold text-muted-foreground">{label}</p>
      <p className="text-[30px] font-extrabold tracking-tight text-ink">
        {value}
        {suffix && <span className="text-base font-semibold text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}

function formatMb(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

function StorageStat({ usedBytes, limitMb }: { usedBytes: number; limitMb: number | null }) {
  const limitBytes = limitMb != null ? limitMb * 1024 * 1024 : null;
  const pct = limitBytes ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  const isNearLimit = pct >= 90;

  return (
    <div className="card-lift card-shadow rounded-2xl border border-border bg-card p-[22px]">
      <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <HardDrive className="h-4 w-4" />
      </span>
      <p className="mb-2.5 text-[12.5px] font-semibold text-muted-foreground">Storage used</p>
      {limitBytes != null ? (
        <>
          <Progress
            value={pct}
            className="mb-2 h-[7px] bg-meter-track"
            indicatorClassName={isNearLimit ? "bg-destructive" : "bg-primary"}
          />
          <p className="text-xs text-muted-foreground">
            {formatMb(usedBytes)} of {formatMb(limitBytes)}
          </p>
        </>
      ) : (
        <p className="text-[13px] text-muted-foreground">{formatMb(usedBytes)} used (unlimited plan)</p>
      )}
    </div>
  );
}
