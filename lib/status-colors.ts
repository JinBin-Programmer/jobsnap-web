import type { TaskStatus, TaskPriority } from "./types";

// These read through CSS custom properties (defined in app/globals.css,
// both :root and .dark) rather than literal hex, so every StatusBadge /
// PriorityBadge / timeline dot repaints for dark mode automatically — no
// per-component dark-mode logic needed. Used as inline styles (not
// Tailwind arbitrary classes) since these are looked up dynamically per
// status/priority value.
export const STATUS_COLORS: Record<TaskStatus, { bg: string; fg: string }> = {
  pending: { bg: "var(--status-pending-bg)", fg: "var(--status-pending-fg)" },
  in_progress: { bg: "var(--status-in_progress-bg)", fg: "var(--status-in_progress-fg)" },
  on_hold: { bg: "var(--status-on_hold-bg)", fg: "var(--status-on_hold-fg)" },
  completed: { bg: "var(--status-completed-bg)", fg: "var(--status-completed-fg)" },
  verified: { bg: "var(--status-verified-bg)", fg: "var(--status-verified-fg)" },
  cancelled: { bg: "var(--status-cancelled-bg)", fg: "var(--status-cancelled-fg)" },
};

// Priority is shown as colored text only, no background (per design).
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "var(--priority-low)",
  medium: "var(--priority-medium)",
  high: "var(--priority-high)",
  urgent: "var(--priority-urgent)",
};

// Timeline entry dot color, by who logged it.
export const ACTOR_DOT_COLORS = {
  worker: "var(--actor-worker)",
  boss: "var(--actor-boss)",
} as const;
