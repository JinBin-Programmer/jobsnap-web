import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Progress } from "@/app/components/ui/progress";
import { deleteMedia } from "./actions";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";

interface MediaRow {
  id: string;
  storage_path: string;
  type: "photo" | "video";
  size_bytes: number;
  created_at: string;
  task: { title: string } | null;
  update: { worker_id: string | null; worker: { full_name: string | null } | null } | null;
}

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ worker?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const orgId = profile.org_id!;
  const { worker: workerFilter } = await searchParams;

  const [{ data: media }, { data: workers }, { data: storage }] = await Promise.all([
    supabase
      .from("task_update_media")
      .select(
        "id, storage_path, type, size_bytes, created_at, task:task_id(title), update:update_id(worker_id, worker:worker_id(full_name))"
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("full_name").eq("org_id", orgId).eq("role", "worker").order("full_name"),
    supabase.rpc("org_storage_status").maybeSingle(),
  ]);

  const rows = (media ?? []) as unknown as MediaRow[];
  const filtered = workerFilter
    ? rows.filter((m) => m.update?.worker?.full_name === workerFilter)
    : rows;

  const paths = filtered.map((m) => m.storage_path);
  const signedByPath: Record<string, string> = {};
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from("task-media").createSignedUrls(paths, 3600);
    signed?.forEach((s, i) => {
      if (s.signedUrl) signedByPath[paths[i]] = s.signedUrl;
    });
  }

  const usedBytes = (storage as { used_bytes: number } | null)?.used_bytes ?? 0;
  const limitMb = (storage as { limit_mb: number | null } | null)?.limit_mb ?? null;
  const limitBytes = limitMb != null ? limitMb * 1024 * 1024 : null;
  const pct = limitBytes ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  const orgStorageLabel =
    limitBytes != null
      ? `${(usedBytes / 1024 / 1024 / 1024).toFixed(2)}GB of ${(limitBytes / 1024 / 1024 / 1024).toFixed(0)}GB used`
      : `${(usedBytes / 1024 / 1024).toFixed(0)}MB used (unlimited plan)`;

  const workerNames = (workers ?? []).map((w) => w.full_name).filter((n): n is string => !!n);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Media library</h1>
          <p className="text-sm text-muted-foreground">Every photo uploaded by your crew, in one place.</p>
        </div>
        <div className="min-w-[180px] text-right">
          <p className="mb-1 text-xs text-muted-foreground">{orgStorageLabel}</p>
          {limitBytes != null && (
            <Progress value={pct} className="ml-auto h-[7px] w-[180px] bg-divider" indicatorClassName="bg-primary" />
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip label="All" active={!workerFilter} />
        {workerNames.map((name) => (
          <FilterChip key={name} label={name} active={workerFilter === name} />
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {filtered.map((m) => (
            <div key={m.id} className="card-shadow relative overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative h-[100px] bg-muted">
                {signedByPath[m.storage_path] &&
                  (m.type === "video" ? (
                    <video src={signedByPath[m.storage_path]} className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={signedByPath[m.storage_path]} alt="" className="h-full w-full object-cover" />
                  ))}
              </div>
              <form action={deleteMedia.bind(null, m.id)}>
                <ConfirmSubmitButton
                  confirmMessage="Delete this photo/video permanently? This can't be undone."
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-xs text-white"
                  title="Delete"
                >
                  ✕
                </ConfirmSubmitButton>
              </form>
              <div className="p-2.5">
                <p className="mb-0.5 truncate text-[12.5px] font-semibold text-ink">
                  {m.update?.worker?.full_name ?? "—"}
                </p>
                <p className="mb-0.5 truncate text-[11.5px] text-muted-foreground">{m.task?.title ?? "—"}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {(m.size_bytes / 1024 / 1024).toFixed(1)}MB ·{" "}
                  {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })},{" "}
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No photos in this filter — try another worker or delete fewer.
        </p>
      )}
    </div>
  );
}

function FilterChip({ label, active }: { label: string; active: boolean }) {
  const href = label === "All" ? "/dashboard/media" : `/dashboard/media?worker=${encodeURIComponent(label)}`;
  return (
    <Link
      href={href}
      className="rounded-full border px-3.5 py-[7px] text-[13px] font-semibold"
      style={{
        borderColor: active ? "var(--primary)" : "var(--border-strong)",
        background: active ? "var(--primary)" : "var(--card)",
        color: active ? "var(--primary-foreground)" : "var(--body-text)",
      }}
    >
      {label}
    </Link>
  );
}
