import type { SupabaseClient } from "@supabase/supabase-js";

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

// Fires a push and reports whether Expo says this token is permanently dead
// (DeviceNotRegistered — e.g. the app was reinstalled or data cleared) so
// callers can clear it from profiles.push_token. Other errors (rate limits,
// malformed message, Expo briefly down) are left alone — only
// DeviceNotRegistered means "never send to this token again."
async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ deviceNotRegistered: boolean }> {
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, sound: "default", title, body, data }),
    });
    const json = (await res.json()) as { data?: ExpoPushTicket };
    return { deviceNotRegistered: json.data?.details?.error === "DeviceNotRegistered" };
  } catch {
    return { deviceNotRegistered: false };
  }
}

// Fire-and-forget push notification to a worker's phone via Expo's push
// service. Best-effort: swallows all errors so a missing/invalid token (or
// Expo being briefly unreachable) never blocks a task save. Requires the
// worker's mobile app to have registered a push token — see
// jobsnap-mobile/lib/notifications.ts, which writes it to
// profiles.push_token on login.
export async function sendPushToWorker(
  supabase: SupabaseClient,
  workerId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("push_token")
      .eq("id", workerId)
      .single();
    const token = profile?.push_token as string | null | undefined;
    if (!token) return;
    const { deviceNotRegistered } = await sendExpoPush(token, title, body, data);
    if (deviceNotRegistered) {
      await supabase.from("profiles").update({ push_token: null }).eq("id", workerId);
    }
  } catch {
    // best-effort — a push failure should never block the task save
  }
}

// Same idea, but to every owner/admin in the org — used for "a worker
// completed a job" and overdue-task reminders. Managers only get a push if
// they've logged into the mobile app at least once (that's what registers
// a token); nothing breaks if none have.
export async function sendPushToManagers(
  supabase: SupabaseClient,
  orgId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    const { data: managers } = await supabase
      .from("profiles")
      .select("id, push_token")
      .eq("org_id", orgId)
      .in("role", ["owner", "admin"])
      .not("push_token", "is", null);

    await Promise.all(
      (managers ?? []).map(async (m) => {
        const token = m.push_token as string | null;
        if (!token) return;
        const { deviceNotRegistered } = await sendExpoPush(token, title, body, data);
        if (deviceNotRegistered) {
          await supabase.from("profiles").update({ push_token: null }).eq("id", m.id as string);
        }
      })
    );
  } catch {
    // best-effort
  }
}
