import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { StatusBadge, PriorityBadge } from "@/app/components/Badges";
import { Plus } from "lucide-react";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/status-colors";
import { Button } from "@/app/components/ui/button";
import TaskFilters from "./TaskFilters";

type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "urgent";
  expected_start: string | null;
  expected_end: string | null;
  has_stops: boolean;
  assignee: { full_name: string | null } | null;
  client: { name: string } | null;
};

type StatusFilterValue = TaskStatus | "All";

const STATUS_FILTERS: StatusFilterValue[] = [
  "All",
  "pending",
  "in_progress",
  "on_hold",
  "completed",
  "verified",
  "cancelled",
];

function chipLabel(f: StatusFilterValue) {
  return f === "All" ? "All" : STATUS_LABELS[f];
}

const OPEN_STATUSES: TaskStatus[] = ["pending", "in_progress", "on_hold"];

function isOverdue(t: TaskRow, todayStr: string) {
  if (!OPEN_STATUSES.includes(t.status)) return false;
  const dueDate = t.expected_end || t.expected_start;
  return !!dueDate && dueDate < todayStr;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; client?: string; worker?: string; date?: string; q?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const orgId = profile.org_id!;
  const params = await searchParams;
  const statusFilter: string = params.status || "All";
  const clientFilter = params.client || "All";
  const workerFilter = params.worker || "All";
  const dateFilter = params.date || "This month";
  const q = (params.q || "").trim().toLowerCase();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [{ data: allTasks }, { data: clients }, { data: workers }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, expected_start, expected_end, has_stops, assignee:assigned_to(full_name), client:client_id(name)"
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("name").eq("org_id", orgId).order("name"),
    supabase.from("profiles").select("full_name").eq("org_id", orgId).eq("role", "worker").order("full_name"),
  ]);

  const tasks = ((allTasks ?? []) as unknown as TaskRow[]).map((t) => ({
    ...t,
    assignee: t.assignee as unknown as { full_name: string | null } | null,
    client: t.client as unknown as { name: string } | null,
  }));

  // Stop-completion rollup for the "X/Y stops" subtext on has_stops rows.
  const stopsTaskIds = tasks.filter((t) => t.has_stops).map((t) => t.id);
  const stopCounts: Record<string, { done: number; total: number }> = {};
  if (stopsTaskIds.length > 0) {
    const { data: stopRows } = await supabase
      .from("task_stops")
      .select("task_id, is_done")
      .in("task_id", stopsTaskIds);
    (stopRows ?? []).forEach((s) => {
      const c = (stopCounts[s.task_id] ||= { done: 0, total: 0 });
      c.total += 1;
      if (s.is_done) c.done += 1;
    });
  }

  const now = new Date();
  const inDateRange = (t: TaskRow) => {
    const dateStr = t.expected_start || t.expected_end;
    if (!dateStr || dateFilter === "All time") return true;
    const d = new Date(dateStr);
    if (dateFilter === "This month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    if (dateFilter === "Last month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    }
    return true;
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    if (clientFilter !== "All" && t.client?.name !== clientFilter) return false;
    if (workerFilter !== "All" && t.assignee?.full_name !== workerFilter) return false;
    if (!inDateRange(t)) return false;
    if (q) {
      const haystack = `${t.title} ${t.client?.name ?? ""} ${t.assignee?.full_name ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const todoTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  const buildHref = (status: TaskStatus | "All") => {
    const p = new URLSearchParams();
    if (status !== "All") p.set("status", status);
    if (clientFilter !== "All") p.set("client", clientFilter);
    if (workerFilter !== "All") p.set("worker", workerFilter);
    if (dateFilter !== "This month") p.set("date", dateFilter);
    if (q) p.set("q", q);
    const qs = p.toString();
    return qs ? `/dashboard/tasks?${qs}` : "/dashboard/tasks";
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Tasks</h1>
          <p className="text-sm text-muted-foreground">{filteredTasks.length} jobs</p>
        </div>
        <Button asChild className="bg-primary shadow-sm shadow-primary/20 hover:bg-[var(--primary-hover)]">
          <Link href="/dashboard/tasks/new">
            <Plus className="h-4 w-4" />
            New task
          </Link>
        </Button>
      </div>

      {/* Mini board */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <MiniBoard title="To-do" dotColor={STATUS_COLORS.pending.fg} tasks={todoTasks} emptyLabel="Nothing to-do." />
        <MiniBoard
          title="In progress"
          dotColor={STATUS_COLORS.in_progress.fg}
          tasks={inProgressTasks}
          emptyLabel="Nothing in progress."
        />
      </div>

      <TaskFilters clients={(clients ?? []).map((c) => c.name)} workers={(workers ?? []).map((w) => w.full_name || "").filter(Boolean)} />

      {/* Status chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = f === statusFilter;
          const colors = f === "All" ? null : STATUS_COLORS[f];
          return (
            <Link
              key={f}
              href={buildHref(f)}
              className="rounded-full border px-3.5 py-[7px] text-[13px] font-semibold"
              style={
                f === "All"
                  ? {
                      borderColor: active ? "var(--primary)" : "var(--border-strong)",
                      background: active ? "var(--accent)" : "var(--card)",
                      color: active ? "var(--primary)" : "var(--body-text)",
                    }
                  : {
                      borderColor: active ? colors!.fg : "var(--border-strong)",
                      background: active ? colors!.bg : "var(--card)",
                      color: colors!.fg,
                    }
              }
            >
              {chipLabel(f)}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="card-shadow overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[2.2fr_1.3fr_1.3fr_1fr_1fr] gap-2 border-b border-border-strong bg-background px-5 py-3">
          <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Task</span>
          <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Client</span>
          <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Worker</span>
          <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Priority</span>
          <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Status</span>
        </div>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/tasks/${t.id}`}
              className="grid grid-cols-[2.2fr_1.3fr_1.3fr_1fr_1fr] items-center gap-2 border-b border-divider px-5 py-3.5 last:border-b-0 hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="block truncate text-sm font-semibold text-ink">{t.title}</span>
                  {isOverdue(t, todayStr) && (
                    <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
                      Overdue
                    </span>
                  )}
                </span>
                {t.has_stops && stopCounts[t.id] && (
                  <span className="text-[11.5px] font-medium text-muted-foreground">
                    {stopCounts[t.id].done}/{stopCounts[t.id].total} stops
                  </span>
                )}
              </span>
              <span className="truncate text-[13.5px] text-muted-foreground">{t.client?.name ?? "—"}</span>
              <span className="truncate text-[13.5px] text-muted-foreground">{t.assignee?.full_name ?? "Unassigned"}</span>
              <PriorityBadge priority={t.priority} />
              <StatusBadge status={t.status} />
            </Link>
          ))
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">No tasks match these filters.</p>
        )}
      </div>
    </div>
  );
}

function MiniBoard({
  title,
  dotColor,
  tasks,
  emptyLabel,
}: {
  title: string;
  dotColor: string;
  tasks: TaskRow[];
  emptyLabel: string;
}) {
  return (
    <div className="card-shadow overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-divider px-4 py-3">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
        <p className="text-[13px] font-bold text-ink">{title}</p>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      {tasks.length > 0 ? (
        tasks.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/tasks/${t.id}`}
            className="block border-b border-divider px-4 py-[11px] last:border-b-0 hover:bg-muted"
          >
            <p className="mb-0.5 text-[13.5px] font-semibold text-ink">{t.title}</p>
            <p className="text-xs text-muted-foreground">
              {t.client?.name ?? "—"} · {t.assignee?.full_name ?? "Unassigned"}
            </p>
          </Link>
        ))
      ) : (
        <p className="p-4 text-[13px] text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
