import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import AddWorker from "./AddWorker";
import { setWorkerActive } from "./actions";
import { Progress } from "@/app/components/ui/progress";
import { Button } from "@/app/components/ui/button";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";
import type { Profile } from "@/lib/types";

export default async function WorkersPage() {
  const { supabase, profile } = await requireProfile();
  const orgId = profile.org_id!;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [{ data: workers }, { data: assignedRows }, { data: mediaRows }, { data: checkinRows }, { data: storage }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("org_id", orgId)
        .eq("role", "worker")
        .order("created_at", { ascending: false }),
      supabase.from("tasks").select("assigned_to").eq("org_id", orgId).not("assigned_to", "is", null),
      supabase
        .from("task_update_media")
        .select("size_bytes, update:update_id(worker_id)")
        .eq("org_id", orgId),
      supabase.from("task_checkins").select("worker_id").eq("org_id", orgId).gte("checked_in_at", todayStart),
      supabase.rpc("org_storage_status").maybeSingle(),
    ]);

  const limitMb = (storage as { limit_mb: number | null } | null)?.limit_mb ?? null;
  const limitBytes = limitMb != null ? limitMb * 1024 * 1024 : null;

  const assignedCountByWorker: Record<string, number> = {};
  (assignedRows ?? []).forEach((r) => {
    if (!r.assigned_to) return;
    assignedCountByWorker[r.assigned_to] = (assignedCountByWorker[r.assigned_to] || 0) + 1;
  });

  const usedBytesByWorker: Record<string, number> = {};
  (mediaRows ?? []).forEach((m) => {
    const workerId = (m.update as unknown as { worker_id: string | null } | null)?.worker_id;
    if (!workerId) return;
    usedBytesByWorker[workerId] = (usedBytesByWorker[workerId] || 0) + (m.size_bytes ?? 0);
  });

  const activeTodaySet = new Set((checkinRows ?? []).map((r) => r.worker_id));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Workers</h1>
          <p className="text-sm text-muted-foreground">Accounts that log in to the mobile app.</p>
        </div>
        <AddWorker />
      </div>

      <div className="card-shadow mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        {workers && workers.length > 0 ? (
          <>
            <div className="grid grid-cols-[1.6fr_1.2fr_0.9fr_1.4fr_0.9fr_auto] gap-2 border-b border-border-strong bg-background px-5 py-3">
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Name</span>
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Phone</span>
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Assigned</span>
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Photo storage</span>
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">Status</span>
              <span></span>
            </div>
            {(workers as Profile[]).map((w) => {
              const usedBytes = usedBytesByWorker[w.id] || 0;
              const usedMb = usedBytes / (1024 * 1024);
              const pct = limitBytes ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
              const activeToday = activeTodaySet.has(w.id);
              return (
                <div
                  key={w.id}
                  className={`grid grid-cols-[1.6fr_1.2fr_0.9fr_1.4fr_0.9fr_auto] items-center gap-2 border-b border-divider px-5 py-3.5 last:border-b-0 hover:bg-muted ${
                    w.is_active ? "" : "opacity-50"
                  }`}
                >
                  <Link
                    href={`/dashboard/media?worker=${encodeURIComponent(w.full_name || w.email || "")}`}
                    className="contents"
                  >
                    <span className="text-sm font-semibold text-ink">
                      {w.full_name || "—"}
                      {!w.is_active && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[13.5px] text-muted-foreground">{w.phone || "—"}</span>
                    <span className="text-[13.5px] text-muted-foreground">{assignedCountByWorker[w.id] || 0} jobs</span>
                    <div>
                      {limitBytes != null ? (
                        <>
                          <Progress value={pct} className="mb-1 h-1.5 w-[120px] bg-divider" indicatorClassName="bg-steel" />
                          <span className="text-[11.5px] text-muted-foreground">
                            {usedMb.toFixed(1)}MB of {(limitBytes / (1024 * 1024)).toFixed(0)}MB
                          </span>
                        </>
                      ) : (
                        <span className="text-[11.5px] text-muted-foreground">{usedMb.toFixed(1)}MB used</span>
                      )}
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{ color: activeToday ? "var(--success)" : "var(--muted-foreground)" }}
                    >
                      {w.is_active ? (activeToday ? "Active" : "Off today") : "Deactivated"}
                    </span>
                  </Link>
                  <form action={setWorkerActive.bind(null, w.id, !w.is_active)}>
                    {w.is_active ? (
                      <ConfirmSubmitButton
                        confirmMessage={`Deactivate ${w.full_name || "this worker"}? They'll keep their job history but won't be assignable to new tasks.`}
                        className="rounded-md border border-input px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive"
                      >
                        Deactivate
                      </ConfirmSubmitButton>
                    ) : (
                      <Button type="submit" size="sm" variant="outline">
                        Reactivate
                      </Button>
                    )}
                  </form>
                </div>
              );
            })}
          </>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No workers yet. Add your first worker to start assigning jobs.
          </div>
        )}
      </div>
    </div>
  );
}
