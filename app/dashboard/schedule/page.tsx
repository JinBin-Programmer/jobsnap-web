import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/status-colors";

function parseMonth(param: string | undefined): { year: number; monthIdx: number } {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return { year: y, monthIdx: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIdx: now.getMonth() };
}

function monthParam(year: number, monthIdx: number) {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const orgId = profile.org_id!;
  const { month } = await searchParams;
  const { year, monthIdx } = parseMonth(month);

  const monthDate = new Date(year, monthIdx, 1);
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const monthStart = new Date(year, monthIdx, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, monthIdx, daysInMonth).toISOString().slice(0, 10);

  const prev = new Date(year, monthIdx - 1, 1);
  const next = new Date(year, monthIdx + 1, 1);

  const [{ data: workers }, { data: tasks }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("org_id", orgId)
      .eq("role", "worker")
      .order("full_name"),
    supabase
      .from("tasks")
      .select("id, title, status, assigned_to, expected_start, expected_end")
      .eq("org_id", orgId)
      .not("assigned_to", "is", null)
      .or(
        `and(expected_start.gte.${monthStart},expected_start.lte.${monthEnd}),and(expected_end.gte.${monthStart},expected_end.lte.${monthEnd})`
      ),
  ]);

  // Key each task to a single day-of-month: expected_start, falling back to
  // expected_end. Tasks with neither don't render a block anywhere.
  const tasksByWorkerDay = new Map<string, { id: string; title: string; status: TaskStatus }>();
  (tasks ?? []).forEach((t) => {
    const dateStr = t.expected_start || t.expected_end;
    if (!dateStr || !t.assigned_to) return;
    const d = new Date(dateStr);
    if (d.getFullYear() !== year || d.getMonth() !== monthIdx) return;
    tasksByWorkerDay.set(`${t.assigned_to}_${d.getDate()}`, {
      id: t.id,
      title: t.title,
      status: t.status,
    });
  });

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dow = new Date(year, monthIdx, day).getDay();
    return { day, isWeekend: dow === 0 || dow === 6 };
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Team schedule</h1>
          <p className="text-sm text-muted-foreground">Every worker&apos;s jobs across the month, at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/schedule?month=${monthParam(prev.getFullYear(), prev.getMonth())}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-card text-primary hover:bg-accent"
          >
            ‹
          </Link>
          <span className="min-w-[120px] text-center text-[13.5px] font-bold text-ink">{monthLabel}</span>
          <Link
            href={`/dashboard/schedule?month=${monthParam(next.getFullYear(), next.getMonth())}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-card text-primary hover:bg-accent"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="mb-3.5 flex flex-wrap gap-4">
        {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS[s].fg }} />
            <span className="text-xs text-body-text">{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      <div className="card-shadow overflow-x-auto rounded-2xl border border-border bg-card">
        <div style={{ minWidth: 150 + daysInMonth * 26 }}>
          <div
            className="grid border-b border-border-strong"
            style={{ gridTemplateColumns: `150px repeat(${daysInMonth}, 26px)` }}
          >
            <div className="sticky left-0 bg-background px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Worker
            </div>
            {days.map((d) => (
              <div
                key={d.day}
                className="bg-background py-2.5 text-center text-[10.5px] font-semibold"
                style={{ color: d.isWeekend ? "var(--destructive)" : "var(--body-text)" }}
              >
                {d.day}
              </div>
            ))}
          </div>

          {(workers ?? []).length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No workers yet.</p>
          ) : (
            (workers ?? []).map((w) => (
              <div
                key={w.id}
                className="grid border-b border-divider last:border-b-0"
                style={{ gridTemplateColumns: `150px repeat(${daysInMonth}, 26px)` }}
              >
                <div className="sticky left-0 bg-card px-3 py-2.5 text-[13px] font-semibold text-ink">
                  {w.full_name || w.email}
                </div>
                {days.map((d) => {
                  const task = tasksByWorkerDay.get(`${w.id}_${d.day}`);
                  if (!task) return <div key={d.day} className="h-[34px] border-r border-divider" />;
                  const colors = STATUS_COLORS[task.status];
                  return (
                    <Link
                      key={d.day}
                      href={`/dashboard/tasks/${task.id}`}
                      title={`${task.title} — ${STATUS_LABELS[task.status]}`}
                      className="h-[34px] border-r border-divider"
                      style={{ backgroundColor: colors.bg, borderLeft: `3px solid ${colors.fg}` }}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
