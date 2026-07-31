import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createTask } from "../actions";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import LocationSection from "../LocationSection";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function NewTaskPage() {
  const { supabase, profile } = await requireProfile();
  const orgId = profile.org_id!;

  const [{ data: jobTypes }, { data: clients }, { data: workers }] = await Promise.all([
    supabase.from("job_types").select("id, name").eq("org_id", orgId).order("name"),
    supabase.from("clients").select("id, name").eq("org_id", orgId).order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("org_id", orgId)
      .eq("role", "worker")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/tasks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </Link>

      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight">New task</h1>

      <form action={createTask} className="mt-6 space-y-5 rounded-xl border border-border bg-card p-6">
        <Field label="Title" required>
          <Input name="title" required placeholder="e.g. Service 3 aircon units at Lot 5" />
        </Field>

        <Field label="Description">
          <Textarea name="description" rows={3} placeholder="Scope of work, instructions for the worker…" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Job type">
            <select name="job_type_id" className={selectClass} defaultValue="">
              <option value="">— Select —</option>
              {jobTypes?.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Client">
            <select name="client_id" className={selectClass} defaultValue="">
              <option value="">— Select —</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assign to worker">
            <select name="assigned_to" className={selectClass} defaultValue="">
              <option value="">— Unassigned —</option>
              {workers?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name || w.email}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority">
            <select name="priority" className={selectClass} defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>

          <Field label="Expected start">
            <Input type="date" name="expected_start" />
          </Field>

          <Field label="Expected end">
            <Input type="date" name="expected_end" />
          </Field>
        </div>

        <LocationSection defaultRadiusM={150} />

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/tasks">Cancel</Link>
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            Create task
          </Button>
        </div>
      </form>

      {(!jobTypes?.length || !clients?.length || !workers?.length) && (
        <p className="mt-4 text-sm text-muted-foreground">
          Tip: add{" "}
          {!clients?.length && (
            <Link href="/dashboard/clients" className="text-primary hover:underline">
              clients
            </Link>
          )}
          {!clients?.length && (!jobTypes?.length || !workers?.length) && ", "}
          {!jobTypes?.length && (
            <Link href="/dashboard/job-types" className="text-primary hover:underline">
              job types
            </Link>
          )}
          {!jobTypes?.length && !workers?.length && ", "}
          {!workers?.length && (
            <Link href="/dashboard/workers" className="text-primary hover:underline">
              workers
            </Link>
          )}{" "}
          first so you can pick them here.
        </p>
      )}
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
