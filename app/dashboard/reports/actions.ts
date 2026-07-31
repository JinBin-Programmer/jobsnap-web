"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile, isManager } from "@/lib/auth";

export async function createReport(taskId: string, formData: FormData) {
  const { supabase, user, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  // Pull the task title as a sensible default report title.
  const { data: task } = await supabase
    .from("tasks")
    .select("title")
    .eq("id", taskId)
    .eq("org_id", profile.org_id)
    .single();
  if (!task) throw new Error("Task not found");

  const title = String(formData.get("title") || "").trim() || `Work report — ${task.title}`;
  const summary = String(formData.get("summary") || "").trim() || null;
  const token = randomBytes(24).toString("base64url");

  const { data, error } = await supabase
    .from("reports")
    .insert({
      org_id: profile.org_id,
      task_id: taskId,
      title,
      summary,
      share_token: token,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/reports");
  redirect(`/dashboard/reports/${data.id}`);
}

export async function deleteReport(id: string) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const { error } = await supabase.from("reports").delete().eq("id", id).eq("org_id", profile.org_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/reports");
  redirect("/dashboard/reports");
}
