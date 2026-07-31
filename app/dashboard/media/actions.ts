"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, isManager } from "@/lib/auth";

export async function deleteMedia(mediaId: string) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const { data: row } = await supabase
    .from("task_update_media")
    .select("storage_path")
    .eq("id", mediaId)
    .eq("org_id", profile.org_id)
    .single();
  if (!row) throw new Error("Photo not found");

  const { error: storageErr } = await supabase.storage.from("task-media").remove([row.storage_path]);
  if (storageErr) throw new Error(storageErr.message);

  const { error: dbErr } = await supabase
    .from("task_update_media")
    .delete()
    .eq("id", mediaId)
    .eq("org_id", profile.org_id);
  if (dbErr) throw new Error(dbErr.message);

  revalidatePath("/dashboard/media");
  revalidatePath("/dashboard/workers");
}
