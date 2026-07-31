import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { updateTask } from "@/app/dashboard/tasks/actions";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { STATUS_LABELS, type Task, type TaskStatus, type TaskStop } from "@/lib/types";
import LocationSection from "@/app/dashboard/tasks/LocationSection";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const orgId = profile.org_id!;

  const [{ data: task }, { data: jobTypes }, { data: clients }, { data: workers }, { data: stops }] =
    await Promise.all([
      supabase.from("tasks").select("*").eq("id", id).eq("org_id", orgId).single(),
      supabase.from("job_types").select("id, name").eq("org_id", orgId).order("name"),
      supabase.from("clients").select("id, name").eq("org_id", orgId).order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("org_id", orgId)
        .eq("role", "worker")
        .eq("is_active", true)
        .order("full_name"),
      supabase.from("task_stops").select("*").eq("task_id", id).order("created_at"),
    ]);

  if (!task) notFound();
  const t = task as Task;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/dashboard/tasks/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to task
      </Link>

      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight">Edit task</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        As the boss, you can change anything here at any time — the job doesn&apos;t need to be
        pending or unassigned to edit it.
      </p>

      <form
        action={updateTask.bind(null, id)}
        className="mt-6 space-y-5 rounded-xl border border-border bg-card p-6"
      >
        <Field label="Title" required>
          <Input name="title" required defaultValue={t.title} />
        </Field>

        <Field label="Description">
          <Textarea name="description" rows={3} defaultValue={t.description ?? ""} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Job type">
            <select name="job_type_id" className={selectClass} defaultValue={t.job_type_id ?? ""}>
              <option value="">— Select —</option>
              {jobTypes?.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Client">
            <select name="client_id" className={selectClass} defaultValue={t.client_id ?? ""}>
              <option value="">— Select —</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assign to worker">
            <select name="assigned_to" className={selectClass} defaultValue={t.assigned_to ?? ""}>
              <option value="">— Unassigned —</option>
              {workers?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name || w.email}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority">
            <select name="priority" className={selectClass} defaultValue={t.priority}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>

          <Field label="Status">
            <select name="status" className={selectClass} defaultValue={t.status}>
              {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>

          <div />

          <Field label="Expected start">
            <Input type="date" name="expected_start" defaultValue={t.expected_start ?? ""} />
          </Field>

          <Field label="Expected end">
            <Input type="date" name="expected_end" defaultValue={t.expected_end ?? ""} />
          </Field>
        </div>

        <LocationSection
          defaultAddress={t.location_address}
          defaultLat={t.location_lat}
          defaultLng={t.location_lng}
          defaultRadiusM={t.upload_radius_m}
          initialHasStops={t.has_stops}
          initialStops={(stops ?? []) as TaskStop[]}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/tasks/${id}`}>Cancel</Link>
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}
