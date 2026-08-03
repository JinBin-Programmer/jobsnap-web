import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Loads the signed-in user + their profile. Sends to /login or /onboarding as needed.
//
// proxy.ts already calls supabase.auth.getUser() once per request (a real
// network round-trip to Supabase Auth) to gate /dashboard routes, then
// forwards the verified id via the x-user-id header. Trusting that header
// here skips a second, identical network round-trip on every single
// protected page/action — meaningful given Vercel's iad1 function region is
// far from most of this app's users. Falls back to a real getUser() call if
// the header is missing (e.g. a route outside proxy's matcher).
export async function requireProfile() {
  const supabase = await createClient();

  let userId = (await headers()).get("x-user-id");
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userId = user.id;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (!profile) redirect("/login");
  if (!profile.org_id) redirect("/onboarding");

  return { supabase, user: { id: userId }, profile };
}

export function isManager(profile: Profile) {
  return profile.role === "owner" || profile.role === "admin";
}
