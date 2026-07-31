"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile, isManager } from "@/lib/auth";

function emptyToNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function addClient(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");

  const { error } = await supabase.from("clients").insert({
    org_id: profile.org_id,
    name,
    contact_name: emptyToNull(formData.get("contact_name")),
    email: emptyToNull(formData.get("email")),
    phone: emptyToNull(formData.get("phone")),
    address: emptyToNull(formData.get("address")),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clients");
}

export async function updateClient(id: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name is required");

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      contact_name: emptyToNull(formData.get("contact_name")),
      email: emptyToNull(formData.get("email")),
      phone: emptyToNull(formData.get("phone")),
      address: emptyToNull(formData.get("address")),
      notes: emptyToNull(formData.get("notes")),
    })
    .eq("id", id)
    .eq("org_id", profile.org_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

export async function deleteClient(id: string) {
  const { supabase, profile } = await requireProfile();
  if (!isManager(profile)) throw new Error("Not allowed");

  const { error } = await supabase.from("clients").delete().eq("id", id).eq("org_id", profile.org_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/clients");
}
