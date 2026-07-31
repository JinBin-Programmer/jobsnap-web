"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile, isManager } from "@/lib/auth";

function emptyToNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function addJobType(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");

  const { error } = await supabase.from("job_types").insert({
    org_id: profile.org_id,
    name,
    description: emptyToNull(formData.get("description")),
    color: String(formData.get("color") || "#24343A"),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/job-types");
}

export async function updateJobType(id: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");

  const { error } = await supabase
    .from("job_types")
    .update({
      name,
      description: emptyToNull(formData.get("description")),
      color: String(formData.get("color") || "#24343A"),
    })
    .eq("id", id)
    .eq("org_id", profile.org_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/job-types");
  redirect("/dashboard/job-types");
}

export async function deleteJobType(id: string) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const { error } = await supabase.from("job_types").delete().eq("id", id).eq("org_id", profile.org_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/job-types");
}
