import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/workers — manager creates a worker account.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!me?.org_id || (me.role !== "owner" && me.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim() || null;
  const password = String(body.password || "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create the auth user (email pre-confirmed so the worker can log in immediately).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message || "Failed to create user" }, { status: 400 });
  }

  // Attach them to this org as a worker (upsert in case the signup trigger already inserted a bare row).
  const { error: profErr } = await admin.from("profiles").upsert({
    id: created.user.id,
    org_id: me.org_id,
    full_name: fullName,
    email,
    phone,
    role: "worker",
    is_active: true,
  });
  if (profErr) {
    // Roll back the auth user so the email isn't left orphaned.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
