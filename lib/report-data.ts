import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report, TaskStatus, TaskPriority, MediaType } from "@/lib/types";

export interface ReportMedia {
  url: string;
  type: MediaType;
}

export interface ReportUpdate {
  id: string;
  remark: string | null;
  status: TaskStatus | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  worker_name: string | null;
  media: ReportMedia[];
}

export interface ReportBundle {
  report: Report;
  orgName: string;
  task: {
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    expected_start: string | null;
    expected_end: string | null;
    location_address: string | null;
    client_name: string | null;
    job_type_name: string | null;
  };
  updates: ReportUpdate[];
}

// Loads everything a report needs to render. Works with the authed manager client
// (RLS-scoped) OR the service-role client (public page, by share token).
export async function loadReportBundle(
  supabase: SupabaseClient,
  report: Report
): Promise<ReportBundle | null> {
  const [{ data: org }, { data: task }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", report.org_id).single(),
    supabase
      .from("tasks")
      .select(
        "title, description, status, priority, expected_start, expected_end, location_address, client:client_id(name), job_type:job_type_id(name)"
      )
      .eq("id", report.task_id)
      .single(),
  ]);

  if (!task) return null;
  const t = task as Record<string, unknown>;

  const { data: updates } = await supabase
    .from("task_updates")
    .select("id, remark, status, lat, lng, created_at, worker:worker_id(full_name)")
    .eq("task_id", report.task_id)
    .order("created_at", { ascending: true });

  const { data: media } = await supabase
    .from("task_update_media")
    .select("update_id, storage_path, type")
    .eq("task_id", report.task_id);

  // Sign all media URLs in one call.
  const mediaByUpdate: Record<string, ReportMedia[]> = {};
  if (media && media.length) {
    const paths = media.map((m) => m.storage_path as string);
    const { data: signed } = await supabase.storage.from("task-media").createSignedUrls(paths, 3600);
    media.forEach((m, i) => {
      const url = signed?.[i]?.signedUrl;
      if (!url) return;
      (mediaByUpdate[m.update_id as string] ||= []).push({ url, type: m.type as MediaType });
    });
  }

  const builtUpdates: ReportUpdate[] = (updates ?? []).map((u) => {
    const worker = u.worker as { full_name?: string } | null;
    return {
      id: u.id as string,
      remark: (u.remark as string) ?? null,
      status: (u.status as TaskStatus) ?? null,
      lat: (u.lat as number) ?? null,
      lng: (u.lng as number) ?? null,
      created_at: u.created_at as string,
      worker_name: worker?.full_name ?? null,
      media: mediaByUpdate[u.id as string] ?? [],
    };
  });

  return {
    report,
    orgName: (org?.name as string) ?? "JobSnap",
    task: {
      title: t.title as string,
      description: (t.description as string) ?? null,
      status: t.status as TaskStatus,
      priority: t.priority as TaskPriority,
      expected_start: (t.expected_start as string) ?? null,
      expected_end: (t.expected_end as string) ?? null,
      location_address: (t.location_address as string) ?? null,
      client_name: (t.client as { name?: string } | null)?.name ?? null,
      job_type_name: (t.job_type as { name?: string } | null)?.name ?? null,
    },
    updates: builtUpdates,
  };
}
