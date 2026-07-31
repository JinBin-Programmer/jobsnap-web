"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, unauthenticated — a client rates the work from the report page
// they were sent, no login. Trust model matches the rest of this page:
// scoped strictly by the unguessable share_token, via the service-role
// client (same as loadReportBundle already does for reading it).
export async function submitReportRating(token: string, rating: number, feedback: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Invalid rating");
  }

  const admin = createAdminClient();
  const { data: report } = await admin
    .from("reports")
    .select("id")
    .eq("share_token", token)
    .eq("is_public", true)
    .single();
  if (!report) throw new Error("Report not found");

  const { error } = await admin
    .from("reports")
    .update({
      client_rating: rating,
      client_feedback: feedback.trim() || null,
      rated_at: new Date().toISOString(),
    })
    .eq("id", report.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/r/${token}`);
  revalidatePath(`/dashboard/reports/${report.id}`);
  revalidatePath("/dashboard/reports");
}
