import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Loads the signed-in user + their profile. Sends to /login or /onboarding as needed.
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");
  if (!profile.org_id) redirect("/onboarding");

  return { supabase, user, profile };
}

export function isManager(profile: Profile) {
  return profile.role === "owner" || profile.role === "admin";
}
