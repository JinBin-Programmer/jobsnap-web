import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireProfile } from "@/lib/auth";
import { StatusBadge, PriorityBadge } from "@/app/components/Badges";
import { STATUS_COLORS, PRIORITY_COLORS, ACTOR_DOT_COLORS } from "@/lib/status-colors";
import { ArrowLeft, Camera, Upload, Pencil, FileText, Check, Copy, Trash2 } from "lucide-react";
import {
  STATUS_LABELS,
  type Task,
  type TaskStatus,
  type TaskUpdate,
  type TaskUpdateMedia,
  type TaskStop,
} from "@/lib/types";
import { addTaskUpdate, updateStopStatus, duplicateTask, deleteTask } from "@/app/dashboard/tasks/actions";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import StopsMapDisplay from "@/app/components/StopsMapDisplay";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const orgId = profile.org_id!;

  const { data: task } = await supabase
    .from("tasks")
    .select(
      "*, job_type:job_type_id(name, color), client:client_id(name, contact_name, phone), assignee:assigned_to(full_name, email)"
    )
    .eq("id", id)
    .eq("org_id", orgId)
    .single();

  if (!task) notFound();
  const t = task as unknown as Task & {
    job_type: { name: string; color: string | null } | null;
    client: { name: string; contact_name: string | null; phone: string | null } | null;
    assignee: { full_name: string | null; email: string | null } | null;
  };

  // Worker updates + media (signed URLs for the private bucket)
  const { data: updates } = await supabase
    .from("task_updates")
    .select("*")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  const { data: media } = await supabase
    .from("task_update_media")
    .select("*")
    .eq("task_id", id);

  const { data: stops } = t.has_stops
    ? await supabase.from("task_stops").select("*").eq("task_id", id).order("created_at")
    : { data: null };

  const signedByUpdate: Record<string, { url: string; type: string }[]> = {};
  if (media && media.length) {
    const paths = (media as TaskUpdateMedia[]).map((m) => m.storage_path);
    const { data: signed } = await supabase.storage.from("task-media").createSignedUrls(paths, 3600);
    (media as TaskUpdateMedia[]).forEach((m, i) => {
      const url = signed?.[i]?.signedUrl;
      if (!url) return;
      (signedByUpdate[m.update_id] ||= []).push({ url, type: m.type });
    });
  }

  const taskStops = (stops ?? []) as TaskStop[];
  const stopLabelById: Record<string, string> = {};
  taskStops.forEach((s) => {
    stopLabelById[s.id] = s.label;
  });
  const doneCount = taskStops.filter((s) => s.is_done).length;
  const stopsProgressPct = taskStops.length ? Math.round((doneCount / taskStops.length) * 100) : 0;

  // Thumbnails for a given stop = media from every update tagged with that stop_id.
  const thumbsByStop: Record<string, { url: string; type: string }[]> = {};
  (updates as TaskUpdate[] | null)?.forEach((u) => {
    if (!u.stop_id) return;
    const imgs = signedByUpdate[u.id] || [];
    if (imgs.length) (thumbsByStop[u.stop_id] ||= []).push(...imgs);
  });

  const formatDate = (d: string | null) => (d ? format(new Date(d), "d MMM yyyy") : "—");
  const scheduled =
    t.expected_start || t.expected_end
      ? `${formatDate(t.expected_start)} – ${formatDate(t.expected_end)}`
      : "Not scheduled";

  return (
    <div>
      <Link
        href="/dashboard/tasks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[22px] font-extrabold text-ink">{t.title}</h1>
            <StatusBadge status={t.status} />
            <span className="text-[12.5px] font-bold" style={{ color: PRIORITY_COLORS[t.priority] }}>
              {t.priority} priority
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.client?.name ?? "No client"} · {t.location_address ?? "No address"} · assigned to{" "}
            {t.assignee?.full_name ?? "Unassigned"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/tasks/${id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit task
            </Link>
          </Button>
          <form action={duplicateTask.bind(null, t.id)}>
            <Button type="submit" variant="outline" size="sm">
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
          </form>
          <Button asChild size="sm" className="bg-primary hover:bg-[var(--primary-hover)]">
            <Link href={`/dashboard/reports/new?task=${t.id}`}>
              <FileText className="h-3.5 w-3.5" />
              Generate report
            </Link>
          </Button>
          <form action={deleteTask.bind(null, t.id)}>
            <ConfirmSubmitButton
              confirmMessage={`Delete "${t.title}" permanently? This removes its whole proof-of-work history. This can't be undone.`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input px-3 text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      {!t.has_stops && t.location_lat == null && (
        <p className="mt-2 text-xs text-muted-foreground">
          No GPS pin set —{" "}
          <Link href={`/dashboard/tasks/${id}/edit`} className="text-primary hover:underline">
            add one
          </Link>{" "}
          so the mobile app can confirm the worker is on-site.
        </p>
      )}
      {t.description && <p className="mt-3 whitespace-pre-wrap text-sm text-body-text">{t.description}</p>}

      {t.has_stops && (
        <div className="card-shadow mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-bold text-ink">
              Stops — {doneCount} of {taskStops.length} completed
            </p>
            <span className="text-[13px] font-bold text-primary">{stopsProgressPct}%</span>
          </div>
          <Progress value={stopsProgressPct} className="mb-4" />

          {taskStops.length > 0 ? (
            <>
              <StopsMapDisplay
                pins={taskStops.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, done: s.is_done }))}
              />
              <div className="mt-4 space-y-2.5">
                {taskStops.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-ink">{s.label}</span>
                        <span
                          className="inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={
                            s.is_done
                              ? { backgroundColor: STATUS_COLORS.completed.bg, color: STATUS_COLORS.completed.fg }
                              : { backgroundColor: STATUS_COLORS.pending.bg, color: STATUS_COLORS.pending.fg }
                          }
                        >
                          {s.is_done ? "Delivered" : "Pending"}
                        </span>
                      </div>
                      {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                      {s.is_done && s.completed_at && (
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {format(new Date(s.completed_at), "d MMM, h:mm a")}
                        </p>
                      )}
                      {thumbsByStop[s.id] && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {thumbsByStop[s.id].map((m, i) =>
                            m.type === "video" ? (
                              <video key={i} src={m.url} controls className="h-12 w-16 rounded object-cover" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={i} src={m.url} alt="Stop proof" className="h-12 w-16 rounded object-cover" />
                            )
                          )}
                        </div>
                      )}
                    </div>
                    <form action={updateStopStatus.bind(null, t.id, s.id, !s.is_done)}>
                      <Button type="submit" variant="outline" size="sm">
                        <Check className="h-3.5 w-3.5" />
                        {s.is_done ? "Mark pending" : "Mark delivered"}
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No stops set yet —{" "}
              <Link href={`/dashboard/tasks/${id}/edit`} className="text-primary hover:underline">
                add some
              </Link>
              .
            </p>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Main column */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-bold text-ink">Site visit timeline</p>
            <details className="group relative">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]">
                <Upload className="h-3.5 w-3.5" />
                Add update
              </summary>
              <form
                action={addTaskUpdate.bind(null, t.id)}
                className="absolute right-0 z-10 mt-2 w-80 space-y-3 rounded-xl border border-border-strong bg-card p-4 shadow-xl"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Photos</label>
                  <Input type="file" name="photos" accept="image/*" multiple className="text-xs" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Remark</label>
                  <Textarea name="remark" rows={3} placeholder="What was done on-site?" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Status (optional)</label>
                  <select name="status" defaultValue="" className={selectClass}>
                    <option value="">No change</option>
                    {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <Button className="w-full bg-primary hover:bg-[var(--primary-hover)]">Post update</Button>
              </form>
            </details>
          </div>

          <div className="card-shadow mb-5 rounded-2xl border border-border bg-card p-5">
            {updates && updates.length > 0 ? (
              <div className="space-y-5">
                {(updates as TaskUpdate[]).map((u) => {
                  const imgs = signedByUpdate[u.id] || [];
                  const isWorker = u.worker_id != null && u.worker_id === t.assigned_to;
                  const dotColor = isWorker ? ACTOR_DOT_COLORS.worker : ACTOR_DOT_COLORS.boss;
                  return (
                    <div key={u.id} className="flex gap-3.5 border-b border-divider pb-5 last:border-0 last:pb-0">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <p className="text-sm font-bold text-ink">
                            {isWorker ? t.assignee?.full_name ?? "Worker" : "Manager"}
                          </p>
                          {u.status && <StatusBadge status={u.status} />}
                          {u.stop_id && stopLabelById[u.stop_id] && (
                            <span className="text-[11.5px] font-semibold text-muted-foreground">
                              · {stopLabelById[u.stop_id]}
                            </span>
                          )}
                        </div>
                        {u.remark && <p className="mb-2 text-sm text-body-text">{u.remark}</p>}
                        {imgs.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {imgs.map((m, i) =>
                              m.type === "video" ? (
                                <video key={i} src={m.url} controls className="h-[70px] w-[90px] rounded-lg object-cover" />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={m.url} alt="Job photo" className="h-[70px] w-[90px] rounded-lg object-cover" />
                              )
                            )}
                          </div>
                        )}
                        <p className="font-mono text-[11.5px] text-muted-foreground">
                          {format(new Date(u.created_at), "h:mm a")}
                          {u.lat != null && u.lng != null && (
                            <>
                              {" "}
                              ·{" "}
                              <a
                                href={`https://maps.google.com/?q=${u.lat},${u.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {u.lat.toFixed(4)}°N, {u.lng.toFixed(4)}°E
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Camera className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                No updates yet. The assigned worker can post from the mobile app, or use{" "}
                <span className="font-medium text-ink">Add update</span> above to post one yourself.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <p className="mb-3 text-[13px] font-bold text-ink">Details</p>
          <div className="card-shadow rounded-2xl border border-border bg-card p-[18px]">
            <DetailRow label="Job type" value={t.job_type?.name ?? "—"} />
            <DetailRow label="Scheduled" value={scheduled} />
            <DetailRow
              label="Client contact"
              value={t.client?.contact_name ? `${t.client.contact_name}${t.client.phone ? ` · ${t.client.phone}` : ""}` : t.client?.phone || "—"}
              last
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={last ? "" : "mb-3.5"}>
      <p className="mb-0.5 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  );
}
