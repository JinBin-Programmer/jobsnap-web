"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile, isManager } from "@/lib/auth";
import { sendPushToWorker } from "@/lib/push";
import type { TaskPriority, TaskStatus } from "@/lib/types";

const QUOTA_MESSAGE =
  "Storage limit reached for your plan. Upgrade the plan or remove old job photos before adding more.";

function emptyToNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function emptyToFloat(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

interface StopInput {
  id: string;
  label: string;
  address: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  notes: string | null;
}

// Reads the stops_json hidden field StopsEditor serializes. Deliberately
// returns rows WITHOUT is_done/completed_at/completed_by — callers upsert
// these as-is, and PostgREST's upsert only SETs columns present in the
// payload, so an edit here can never clobber a worker's completed progress.
function parseStops(formData: FormData): StopInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("stops_json") || "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const stops: StopInput[] = [];
  for (const item of parsed) {
    const s = item as Record<string, unknown>;
    const id = String(s.id ?? "").trim();
    const lat = Number(s.lat);
    const lng = Number(s.lng);
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    stops.push({
      id,
      label: String(s.label ?? "").trim() || "Stop",
      address: emptyToNull(String(s.address ?? "")),
      lat,
      lng,
      radius_m: Math.min(300, Math.max(20, Math.round(Number(s.radius_m) || 50))),
      notes: emptyToNull(String(s.notes ?? "")),
    });
  }
  return stops;
}

export async function createTask(formData: FormData) {
  const { supabase, user, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title is required");

  const hasStops = formData.get("has_stops") === "true";
  const stops = hasStops ? parseStops(formData) : [];
  if (hasStops && stops.length === 0) {
    throw new Error("Add at least one stop on the map, or turn off multi-stop mode.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      org_id: profile.org_id,
      title,
      description: emptyToNull(formData.get("description")),
      job_type_id: emptyToNull(formData.get("job_type_id")),
      client_id: emptyToNull(formData.get("client_id")),
      assigned_to: emptyToNull(formData.get("assigned_to")),
      priority: (emptyToNull(formData.get("priority")) as TaskPriority) || "medium",
      expected_start: emptyToNull(formData.get("expected_start")),
      expected_end: emptyToNull(formData.get("expected_end")),
      location_address: emptyToNull(formData.get("location_address")),
      // Multi-stop tasks carry their locations on task_stops instead —
      // leaving these null is what makes the mobile app's on-site check-in
      // gate ungate itself automatically for has_stops tasks.
      location_lat: hasStops ? null : emptyToFloat(formData.get("location_lat")),
      location_lng: hasStops ? null : emptyToFloat(formData.get("location_lng")),
      upload_radius_m: emptyToFloat(formData.get("upload_radius_m")) ?? 150,
      has_stops: hasStops,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (hasStops) {
    const { error: stopsErr } = await supabase
      .from("task_stops")
      .insert(stops.map((s) => ({ ...s, org_id: profile.org_id, task_id: data.id })));
    if (stopsErr) throw new Error(stopsErr.message);
  }

  const assignedTo = emptyToNull(formData.get("assigned_to"));
  if (assignedTo) {
    await sendPushToWorker(supabase, assignedTo, "New job assigned", title, { taskId: data.id });
  }

  revalidatePath("/dashboard/tasks");
  redirect(`/dashboard/tasks/${data.id}`);
}

// Full edit — every field, always available to a manager regardless of the
// task's current status.
export async function updateTask(taskId: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title is required");

  const radius = emptyToFloat(formData.get("upload_radius_m"));
  const hasStops = formData.get("has_stops") === "true";
  const stops = hasStops ? parseStops(formData) : [];
  if (hasStops && stops.length === 0) {
    throw new Error("Add at least one stop on the map, or turn off multi-stop mode.");
  }
  const assignedTo = emptyToNull(formData.get("assigned_to"));

  // Snapshot the current assignee + existing stop ids before applying
  // changes, so we can tell afterwards whether this save is a reassignment
  // or added new stops to an already-assigned run — either one is worth a
  // push notification, a plain "saved" isn't.
  const [{ data: before }, { data: existingStops }] = await Promise.all([
    supabase.from("tasks").select("assigned_to").eq("id", taskId).single(),
    hasStops
      ? supabase.from("task_stops").select("id").eq("task_id", taskId)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  const previousAssignee = before?.assigned_to ?? null;
  const existingStopIds = new Set((existingStops ?? []).map((s) => s.id as string));

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: emptyToNull(formData.get("description")),
      job_type_id: emptyToNull(formData.get("job_type_id")),
      client_id: emptyToNull(formData.get("client_id")),
      assigned_to: assignedTo,
      priority: (emptyToNull(formData.get("priority")) as TaskPriority) || "medium",
      status: (emptyToNull(formData.get("status")) as TaskStatus) || "pending",
      expected_start: emptyToNull(formData.get("expected_start")),
      expected_end: emptyToNull(formData.get("expected_end")),
      location_address: emptyToNull(formData.get("location_address")),
      location_lat: hasStops ? null : emptyToFloat(formData.get("location_lat")),
      location_lng: hasStops ? null : emptyToFloat(formData.get("location_lng")),
      upload_radius_m: radius ?? 150,
      has_stops: hasStops,
    })
    .eq("id", taskId)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(error.message);

  // Only sync task_stops when the task is (still) in multi-stop mode — the
  // checkbox is a display toggle, not a destructive action, so leaving it
  // off never touches existing stop rows or their completion history.
  if (hasStops) {
    const { error: upsertErr } = await supabase
      .from("task_stops")
      .upsert(
        stops.map((s) => ({ ...s, org_id: profile.org_id, task_id: taskId })),
        { onConflict: "id" }
      );
    if (upsertErr) throw new Error(upsertErr.message);

    const keepIds = stops.map((s) => s.id).join(",");
    const { error: deleteErr } = await supabase
      .from("task_stops")
      .delete()
      .eq("task_id", taskId)
      .not("id", "in", `(${keepIds})`);
    if (deleteErr) throw new Error(deleteErr.message);
  }

  if (assignedTo && assignedTo !== previousAssignee) {
    await sendPushToWorker(supabase, assignedTo, "New job assigned", title, { taskId });
  } else if (assignedTo && hasStops) {
    const newStopCount = stops.filter((s) => !existingStopIds.has(s.id)).length;
    if (newStopCount > 0) {
      await sendPushToWorker(
        supabase,
        assignedTo,
        "New stops added",
        `${newStopCount} new stop${newStopCount === 1 ? "" : "s"} added to ${title}`,
        { taskId }
      );
    }
  }

  revalidatePath(`/dashboard/tasks/${taskId}`);
  revalidatePath("/dashboard/tasks");
  redirect(`/dashboard/tasks/${taskId}`);
}

// Office correction — a manager marks a stop done/undone from the web
// dashboard directly, without the worker's phone.
export async function updateStopStatus(taskId: string, stopId: string, isDone: boolean) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const { error } = await supabase
    .from("task_stops")
    .update({
      is_done: isDone,
      completed_at: isDone ? new Date().toISOString() : null,
      completed_by: isDone ? profile.id : null,
    })
    .eq("id", stopId)
    .eq("task_id", taskId)
    .eq("org_id", profile.org_id);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/tasks/${taskId}`);
}

// Lets a manager post a photo/remark update directly from the web dashboard —
// previously only the assigned worker could do this, from the mobile app.
// Requires supabase/manager-web-updates.sql to have been run.
export async function addTaskUpdate(taskId: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");
  const orgId = profile.org_id!;

  const remark = emptyToNull(formData.get("remark"));
  const status = emptyToNull(formData.get("status")) as TaskStatus | null;
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  if (!remark && !status && photos.length === 0) {
    throw new Error("Add a photo, a remark, or a status change first.");
  }

  // Courtesy pre-check so we don't burn upload time before rejecting —
  // the DB trigger in storage-limits.sql is what actually enforces the cap.
  if (photos.length > 0) {
    const incomingBytes = photos.reduce((sum, f) => sum + f.size, 0);
    const { data: quota } = await supabase.rpc("org_storage_status").maybeSingle();
    const q = quota as { used_bytes: number; limit_mb: number | null } | null;
    if (q?.limit_mb != null && q.used_bytes + incomingBytes > q.limit_mb * 1024 * 1024) {
      throw new Error(QUOTA_MESSAGE);
    }
  }

  const { data: update, error: updErr } = await supabase
    .from("task_updates")
    .insert({ org_id: orgId, task_id: taskId, worker_id: profile.id, remark, status })
    .select("id")
    .single();
  if (updErr || !update) throw new Error(updErr?.message || "Failed to save update");

  for (let i = 0; i < photos.length; i++) {
    const file = photos[i];
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${orgId}/${taskId}/${update.id}/${Date.now()}_${i}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: upErr } = await supabase.storage
      .from("task-media")
      .upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { error: mediaErr } = await supabase.from("task_update_media").insert({
      org_id: orgId,
      update_id: update.id,
      task_id: taskId,
      storage_path: path,
      type: "photo",
      size_bytes: bytes.byteLength,
    });
    if (mediaErr) {
      throw new Error(mediaErr.message?.includes("STORAGE_LIMIT_REACHED") ? QUOTA_MESSAGE : mediaErr.message);
    }
  }

  if (status) {
    const { error: tErr } = await supabase.from("tasks").update({ status }).eq("id", taskId).eq("org_id", orgId);
    if (tErr) throw new Error(tErr.message);
  }

  revalidatePath(`/dashboard/tasks/${taskId}`);
}

export async function deleteTask(taskId: string) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  // A task with a client report already generated for it has a live public
  // link that may already be in a client's hands — deleting the task would
  // cascade-delete the report and silently 404 that link. Block it instead
  // of losing a customer's proof-of-work record by accident.
  const { count: reportCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId);
  if (reportCount && reportCount > 0) {
    throw new Error(
      "This task has a client report generated for it — delete the report first (Reports page) if you're sure, then delete the task."
    );
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("org_id", profile.org_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/tasks");
  redirect("/dashboard/tasks");
}

// Prefill a new task from an existing one — same client/job type/worker/
// description/location, blank dates and status, so a manager doesn't have
// to re-enter everything for a recurring job (e.g. "same aircon service,
// next month").
export async function duplicateTask(taskId: string) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const { data: original } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("org_id", profile.org_id)
    .single();
  if (!original) throw new Error("Task not found");

  const { data: stops } = original.has_stops
    ? await supabase.from("task_stops").select("*").eq("task_id", taskId)
    : { data: null };

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      org_id: profile.org_id,
      title: `${original.title} (copy)`,
      description: original.description,
      job_type_id: original.job_type_id,
      client_id: original.client_id,
      assigned_to: original.assigned_to,
      priority: original.priority,
      location_address: original.location_address,
      location_lat: original.location_lat,
      location_lng: original.location_lng,
      upload_radius_m: original.upload_radius_m,
      has_stops: original.has_stops,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (original.has_stops && stops && stops.length > 0) {
    const { error: stopsErr } = await supabase.from("task_stops").insert(
      stops.map((s) => ({
        org_id: profile.org_id,
        task_id: created.id,
        label: s.label,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        radius_m: s.radius_m,
        notes: s.notes,
      }))
    );
    if (stopsErr) throw new Error(stopsErr.message);
  }

  revalidatePath("/dashboard/tasks");
  redirect(`/dashboard/tasks/${created.id}/edit`);
}
