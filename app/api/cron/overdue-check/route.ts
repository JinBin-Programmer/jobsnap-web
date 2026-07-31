import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToWorker, sendPushToManagers } from "@/lib/push";

// Runs once a day (see vercel.json) — finds tasks whose due date has passed
// while still open, and sends a one-time push to the assigned worker + the
// org's managers. "One-time" via overdue_notified_at so this doesn't nag
// daily for the same task; the dashboard's overdue indicator stays visible
// regardless.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: overdueTasks, error } = await admin
    .from("tasks")
    .select("id, org_id, title, assigned_to, expected_start, expected_end")
    .in("status", ["pending", "in_progress", "on_hold"])
    .is("overdue_notified_at", null)
    .or(`and(expected_end.not.is.null,expected_end.lt.${today}),and(expected_end.is.null,expected_start.lt.${today})`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let notified = 0;
  for (const task of overdueTasks ?? []) {
    const dueDate = task.expected_end || task.expected_start;
    const body = `"${task.title}" was due ${dueDate} and still isn't marked done.`;

    await Promise.all([
      task.assigned_to
        ? sendPushToWorker(admin, task.assigned_to, "Job overdue", body, { taskId: task.id })
        : Promise.resolve(),
      sendPushToManagers(admin, task.org_id, "Job overdue", body, { taskId: task.id }),
    ]);

    await admin.from("tasks").update({ overdue_notified_at: new Date().toISOString() }).eq("id", task.id);
    notified++;
  }

  return NextResponse.json({ checked: overdueTasks?.length ?? 0, notified });
}
