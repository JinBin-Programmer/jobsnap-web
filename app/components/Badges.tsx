import { STATUS_LABELS, PRIORITY_LABELS, type TaskStatus, type TaskPriority } from "@/lib/types";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/status-colors";

// Status is a colored pill; priority is colored text only (no pill) — per
// the design handoff. Colors are exact per-value hex, so these use inline
// styles rather than Tailwind classes (dynamic per status/priority value).
export function StatusBadge({ status }: { status: TaskStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className="text-[12.5px] font-bold whitespace-nowrap" style={{ color: PRIORITY_COLORS[priority] }}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
