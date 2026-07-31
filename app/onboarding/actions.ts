"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createOrganization(formData: FormData) {
  const orgName = String(formData.get("org_name") || "").trim();
  if (!orgName) return;
  const industry = String(formData.get("industry") || "").trim() || null;
  const teamSize = String(formData.get("team_size") || "").trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Create the organization.
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: orgName, industry, team_size: teamSize })
    .select("id")
    .single();
  if (orgErr || !org) throw new Error(orgErr?.message || "Failed to create organization");

  // Promote this user to owner of the new org.
  const { error: profErr } = await admin
    .from("profiles")
    .update({ org_id: org.id, role: "owner" })
    .eq("id", user.id);
  if (profErr) throw new Error(profErr.message);

  // Record the owner on the org.
  await admin.from("organizations").update({ owner_id: user.id }).eq("id", org.id);

  redirect("/dashboard");
}
