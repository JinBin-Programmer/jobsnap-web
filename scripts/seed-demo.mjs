// Seed realistic demo data into an existing JobSnap org.
//
// Prereqs:
//   1. You have signed up on the web app and completed onboarding (org created).
//   2. .env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
//
// Usage:
//   node scripts/seed-demo.mjs your-boss-email@example.com
//
// Creates: 3 workers (password: demo1234), 4 job types, 4 clients, 8 tasks
// across all statuses, with on-site updates (remarks + GPS) on the active ones.
// Safe to re-run: skips workers/job types/clients that already exist by name.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// --- load .env.local (no dotenv dependency) ---
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  let text;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    console.error("❌ .env.local not found. Copy .env.local.example and fill it in first.");
    process.exit(1);
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env.local");
  process.exit(1);
}

const bossEmail = process.argv[2];
if (!bossEmail) {
  console.error("Usage: node scripts/seed-demo.mjs <boss-email>");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const WORKER_PASSWORD = "demo1234";
const WORKERS = [
  { full_name: "Ahmad Faizal", email: "faizal.demo@jobsnap.test", phone: "012-3456789" },
  { full_name: "Ravi Kumar", email: "ravi.demo@jobsnap.test", phone: "013-9876543" },
  { full_name: "Tan Wei Jian", email: "weijian.demo@jobsnap.test", phone: "016-5551234" },
];

const JOB_TYPES = [
  { name: "Aircond Servicing", color: "#2563eb", description: "Routine cleaning & gas top-up" },
  { name: "Chemical Wash", color: "#0891b2", description: "Full chemical overhaul" },
  { name: "Installation", color: "#16a34a", description: "New unit installation" },
  { name: "Repair & Troubleshoot", color: "#dc2626", description: "Breakdown / fault visits" },
];

const CLIENTS = [
  { name: "Menara Suria Management", contact_name: "En. Rahman", phone: "03-2161 0000", address: "Menara Suria, Jalan Ampang, 50450 Kuala Lumpur" },
  { name: "Restoran Selera Kampung", contact_name: "Puan Zainab", phone: "012-771 2233", address: "12, Jalan SS15/4, 47500 Subang Jaya, Selangor" },
  { name: "Klinik Dr. Tan", contact_name: "Dr. Tan", phone: "03-7877 5511", address: "45, Jalan Gasing, 46000 Petaling Jaya, Selangor" },
  { name: "Puan Aishah (Residensi Vista)", contact_name: "Puan Aishah", phone: "019-334 5566", address: "A-12-3, Residensi Vista, Jalan Cheras, 56000 Kuala Lumpur" },
];

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  // 1. Find the boss + org
  const { data: boss, error: bossErr } = await db
    .from("profiles")
    .select("id, org_id, full_name")
    .eq("email", bossEmail)
    .single();
  if (bossErr || !boss?.org_id) {
    console.error(`❌ No onboarded profile found for ${bossEmail}. Sign up + complete onboarding on the web app first.`);
    process.exit(1);
  }
  const orgId = boss.org_id;
  console.log(`✔ Seeding org ${orgId} (boss: ${boss.full_name ?? bossEmail})`);

  // 2. Workers
  const workerIds = [];
  for (const w of WORKERS) {
    const { data: existing } = await db.from("profiles").select("id").eq("email", w.email).maybeSingle();
    if (existing) {
      workerIds.push(existing.id);
      console.log(`• Worker exists: ${w.full_name}`);
      continue;
    }
    const { data: created, error } = await db.auth.admin.createUser({
      email: w.email,
      password: WORKER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: w.full_name },
    });
    if (error) { console.error(`❌ Create worker ${w.email}: ${error.message}`); continue; }
    const uid = created.user.id;
    await db.from("profiles").upsert({
      id: uid, org_id: orgId, full_name: w.full_name, email: w.email, phone: w.phone, role: "worker",
    });
    workerIds.push(uid);
    console.log(`✔ Worker created: ${w.full_name} (${w.email} / ${WORKER_PASSWORD})`);
  }

  // 3. Job types
  const jobTypeIds = {};
  for (const jt of JOB_TYPES) {
    const { data: existing } = await db.from("job_types").select("id").eq("org_id", orgId).eq("name", jt.name).maybeSingle();
    if (existing) { jobTypeIds[jt.name] = existing.id; continue; }
    const { data, error } = await db.from("job_types").insert({ ...jt, org_id: orgId }).select("id").single();
    if (error) { console.error(`❌ Job type ${jt.name}: ${error.message}`); continue; }
    jobTypeIds[jt.name] = data.id;
    console.log(`✔ Job type: ${jt.name}`);
  }

  // 4. Clients
  const clientIds = {};
  for (const c of CLIENTS) {
    const { data: existing } = await db.from("clients").select("id").eq("org_id", orgId).eq("name", c.name).maybeSingle();
    if (existing) { clientIds[c.name] = existing.id; continue; }
    const { data, error } = await db.from("clients").insert({ ...c, org_id: orgId }).select("id").single();
    if (error) { console.error(`❌ Client ${c.name}: ${error.message}`); continue; }
    clientIds[c.name] = data.id;
    console.log(`✔ Client: ${c.name}`);
  }

  // 5. Tasks (skip if we've seeded before)
  const { count } = await db.from("tasks").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if ((count ?? 0) >= 8) {
    console.log("• Tasks already seeded, skipping.");
  } else {
    const T = (o) => ({ org_id: orgId, created_by: boss.id, ...o });
    const tasks = [
      T({
        title: "Servis 4 unit aircond — Tingkat 12",
        description: "Routine servicing, 4x wall-mounted units. Client complained unit 3 not cold.",
        job_type_id: jobTypeIds["Aircond Servicing"], client_id: clientIds["Menara Suria Management"],
        assigned_to: workerIds[0], status: "completed", priority: "medium",
        expected_start: daysFromNow(-3), expected_end: daysFromNow(-3),
        location_address: "Menara Suria, Jalan Ampang, KL", location_lat: 3.1615, location_lng: 101.7183,
        _updates: [
          { worker: 0, remark: "Sampai site, mula kerja unit 1 & 2.", status: "in_progress", lat: 3.1615, lng: 101.7183 },
          { worker: 0, remark: "Semua 4 unit siap servis. Unit 3 gas kurang — dah top up R32. Semua sejuk semula.", status: "completed", lat: 3.1616, lng: 101.7184 },
        ],
      }),
      T({
        title: "Chemical wash 2 unit — dapur restoran",
        description: "Heavy grease buildup, full chemical wash for 2 ceiling cassette units.",
        job_type_id: jobTypeIds["Chemical Wash"], client_id: clientIds["Restoran Selera Kampung"],
        assigned_to: workerIds[1], status: "completed", priority: "high",
        expected_start: daysFromNow(-1), expected_end: daysFromNow(-1),
        location_address: "Restoran Selera Kampung, SS15 Subang Jaya", location_lat: 3.0754, location_lng: 101.5867,
        _updates: [
          { worker: 1, remark: "Unit dah buka, memang tebal minyak. Start chemical wash.", status: "in_progress", lat: 3.0754, lng: 101.5867 },
          { worker: 1, remark: "Siap. Dua-dua unit dah pasang balik, test ok, air outlet clear.", status: "completed", lat: 3.0755, lng: 101.5866 },
        ],
      }),
      T({
        title: "Aircond bocor — bilik rawatan 2",
        description: "Water dripping from indoor unit onto equipment. Urgent.",
        job_type_id: jobTypeIds["Repair & Troubleshoot"], client_id: clientIds["Klinik Dr. Tan"],
        assigned_to: workerIds[2], status: "in_progress", priority: "urgent",
        expected_start: daysFromNow(0), expected_end: daysFromNow(0),
        location_address: "Klinik Dr. Tan, Jalan Gasing, PJ", location_lat: 3.0983, location_lng: 101.6486,
        _updates: [
          { worker: 2, remark: "On site. Drain pipe tersumbat — tengah vacuum & flush.", status: "in_progress", lat: 3.0983, lng: 101.6486 },
        ],
      }),
      T({
        title: "Pasang 1 unit 1.5HP — bilik utama",
        description: "New Daikin 1.5HP wall-mounted, piping ~4m, customer supplies bracket.",
        job_type_id: jobTypeIds["Installation"], client_id: clientIds["Puan Aishah (Residensi Vista)"],
        assigned_to: workerIds[0], status: "pending", priority: "medium",
        expected_start: daysFromNow(1), expected_end: daysFromNow(1),
        location_address: "Residensi Vista, Jalan Cheras, KL", location_lat: 3.0898, location_lng: 101.7292,
      }),
      T({
        title: "Servis berkala 6 unit — Tingkat 8 & 9",
        description: "Quarterly contract servicing.",
        job_type_id: jobTypeIds["Aircond Servicing"], client_id: clientIds["Menara Suria Management"],
        assigned_to: workerIds[1], status: "pending", priority: "low",
        expected_start: daysFromNow(2), expected_end: daysFromNow(2),
        location_address: "Menara Suria, Jalan Ampang, KL", location_lat: 3.1615, location_lng: 101.7183,
      }),
      T({
        title: "Ganti compressor — unit kedai depan",
        description: "Compressor dead, replacement part ordered. Waiting for part to arrive.",
        job_type_id: jobTypeIds["Repair & Troubleshoot"], client_id: clientIds["Restoran Selera Kampung"],
        assigned_to: workerIds[2], status: "on_hold", priority: "high",
        expected_start: daysFromNow(-2), expected_end: daysFromNow(3),
        location_address: "Restoran Selera Kampung, SS15 Subang Jaya", location_lat: 3.0754, location_lng: 101.5867,
        _updates: [
          { worker: 2, remark: "Confirm compressor rosak. Part kena order — ETA 3 hari. Hold dulu.", status: "on_hold", lat: 3.0754, lng: 101.5867 },
        ],
      }),
      T({
        title: "Servis 2 unit + cuci filter — rumah",
        description: "Annual servicing for master bedroom + living room units.",
        job_type_id: jobTypeIds["Aircond Servicing"], client_id: clientIds["Puan Aishah (Residensi Vista)"],
        assigned_to: workerIds[1], status: "pending", priority: "medium",
        expected_start: daysFromNow(3), expected_end: daysFromNow(3),
        location_address: "Residensi Vista, Jalan Cheras, KL", location_lat: 3.0898, location_lng: 101.7292,
      }),
      T({
        title: "Site survey — pasang 3 unit baru",
        description: "Survey wiring & piping route for 3 new units at clinic extension.",
        job_type_id: jobTypeIds["Installation"], client_id: clientIds["Klinik Dr. Tan"],
        assigned_to: workerIds[0], status: "pending", priority: "medium",
        expected_start: daysFromNow(4), expected_end: daysFromNow(4),
        location_address: "Klinik Dr. Tan, Jalan Gasing, PJ", location_lat: 3.0983, location_lng: 101.6486,
      }),
    ];

    for (const { _updates, ...task } of tasks) {
      const { data: created, error } = await db.from("tasks").insert(task).select("id, title").single();
      if (error) { console.error(`❌ Task "${task.title}": ${error.message}`); continue; }
      console.log(`✔ Task: ${created.title}`);
      for (const u of _updates ?? []) {
        const { error: uErr } = await db.from("task_updates").insert({
          org_id: orgId, task_id: created.id, worker_id: workerIds[u.worker],
          remark: u.remark, status: u.status, lat: u.lat, lng: u.lng, accuracy: 8,
        });
        if (uErr) console.error(`  ❌ Update: ${uErr.message}`);
      }
    }
  }

  console.log("\n🎉 Demo data ready.");
  console.log("Worker logins for the mobile app (password for all: " + WORKER_PASSWORD + "):");
  for (const w of WORKERS) console.log(`  • ${w.full_name}: ${w.email}`);
  console.log("\nDemo video flow: dashboard task list → open the urgent Klinik task →");
  console.log("worker phone: log in as Tan Wei Jian, snap a photo, mark completed →");
  console.log("dashboard: create report → open the client link. Total ~90 seconds.");
}

main().catch((e) => { console.error(e); process.exit(1); });
