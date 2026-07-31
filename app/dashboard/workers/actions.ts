"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, isManager } from "@/lib/auth";

// Workers keep their account (so their job history stays attributed) but
// stop being selectable when assigning new tasks — task pickers already
// filter is_active=true. No delete: their proof-of-work history must stay
// intact regardless of employment status.
export async function setWorkerActive(id: string, isActive: boolean) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .eq("role", "worker");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/workers");
}
