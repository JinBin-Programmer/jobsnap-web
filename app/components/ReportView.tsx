import { format } from "date-fns";
import { STATUS_LABELS } from "@/lib/types";
import type { ReportBundle } from "@/lib/report-data";

// A clean, print-friendly proof-of-work report. Used by both the manager preview
// and the public (client-facing) page.
export default function ReportView({ bundle }: { bundle: ReportBundle }) {
  const { report, task, updates } = bundle;
  const photoCount = updates.reduce((n, u) => n + u.media.filter((m) => m.type === "photo").length, 0);

  return (
    <div className="mx-auto max-w-3xl bg-white p-9 text-ink print:p-0">
      {/* Title + summary */}
      <div>
        <h2 className="font-display text-xl font-bold text-ink">{report.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {task.client_name ?? "No client"}
          {task.location_address ? ` · ${task.location_address}` : ""}
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Report date {format(new Date(report.created_at), "d MMM yyyy")}
        </p>
        {report.summary && (
          <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm leading-relaxed text-ink">
            {report.summary}
          </p>
        )}
      </div>

      {/* Job details */}
      <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border p-4 text-sm sm:grid-cols-4">
        <Detail label="Job" value={task.job_type_name || "—"} />
        <Detail label="Status" value={STATUS_LABELS[task.status]} />
        <Detail
          label="Started"
          value={task.expected_start ? format(new Date(task.expected_start), "d MMM yyyy") : "—"}
        />
        <Detail
          label="Completed"
          value={task.expected_end ? format(new Date(task.expected_end), "d MMM yyyy") : "—"}
        />
        {task.location_address && (
          <div className="col-span-2 sm:col-span-4">
            <Detail label="Location" value={task.location_address} />
          </div>
        )}
      </div>

      {task.description && (
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Scope</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{task.description}</p>
        </div>
      )}

      {/* Work log */}
      <div className="mt-8">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Work performed, step by step ({updates.length} {updates.length === 1 ? "step" : "steps"}, {photoCount} photos)
        </h3>

        {updates.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No site updates were recorded for this job.</p>
        ) : (
          <div className="relative mt-4 space-y-6 pl-8">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
            {updates.map((u, i) => (
              <div key={u.id} className="relative break-inside-avoid">
                <div className="absolute -left-8 top-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary text-xs font-bold text-primary">
                  {i + 1}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 font-mono text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Step {i + 1}</span>
                  <span>{format(new Date(u.created_at), "d MMM yyyy, h:mm a")}</span>
                  {u.worker_name && <span>· {u.worker_name}</span>}
                  {u.status && <span>· marked {STATUS_LABELS[u.status]}</span>}
                </div>
                {u.remark && <p className="mt-1.5 text-sm text-foreground">{u.remark}</p>}
                {u.media.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {u.media.map((m, j) =>
                      m.type === "video" ? (
                        // videos can't render in a printed PDF — show a note
                        <div
                          key={j}
                          className="flex aspect-square items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground"
                        >
                          🎥 Video clip
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={j}
                          src={m.url}
                          alt={`Work photo ${j + 1}`}
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                      )
                    )}
                  </div>
                )}
                {u.lat != null && u.lng != null && (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    📍 Recorded at {u.lat.toFixed(5)}, {u.lng.toFixed(5)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-border pt-4 text-center font-mono text-xs text-muted-foreground">
        Generated by JobSnap · jobsnap.my
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
    </div>
  );
}
