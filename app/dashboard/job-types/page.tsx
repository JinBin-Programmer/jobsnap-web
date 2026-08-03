import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { addJobType, deleteJobType } from "./actions";
import type { JobType } from "@/lib/types";
import { Trash2, Pencil } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import ConfirmSubmitButton from "@/app/components/ConfirmSubmitButton";

export default async function JobTypesPage() {
  const { supabase, profile } = await requireProfile();

  const [{ data: jobTypes }, { data: kpiSettings }] = await Promise.all([
    supabase.from("job_types").select("*").eq("org_id", profile.org_id).order("name"),
    supabase.from("kpi_settings").select("task_kpi_enabled").eq("org_id", profile.org_id).single(),
  ]);
  const taskKpiEnabled = (kpiSettings as { task_kpi_enabled: boolean } | null)?.task_kpi_enabled ?? false;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Job Types</h1>
      <p className="text-sm text-muted-foreground">
        Categories of work you do (e.g. servicing, installation, repair).
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <form action={addJobType} className="space-y-3 card-shadow rounded-2xl border border-border bg-card p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold">Add job type</h2>
          <Input name="name" required placeholder="e.g. Aircon servicing" />
          <Textarea name="description" rows={2} placeholder="Description (optional)" />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Colour
            <input name="color" type="color" defaultValue="#24343A" className="h-8 w-12 rounded border border-input" />
          </label>
          {taskKpiEnabled && (
            <label className="block text-sm text-muted-foreground">
              <span className="mb-1 block text-xs">KPI points (1 = counts as one job)</span>
              <Input name="kpi_points" type="number" min={0.5} step={0.5} defaultValue={1} />
            </label>
          )}
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
            Add job type
          </Button>
        </form>

        <div className="lg:col-span-2">
          <div className="overflow-hidden card-shadow rounded-2xl border border-border bg-card">
            {jobTypes && jobTypes.length > 0 ? (
              <ul className="divide-y divide-border">
                {(jobTypes as JobType[]).map((j) => (
                  <li key={j.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: j.color || "#24343A" }}
                      />
                      <div>
                        <p className="text-sm font-medium">{j.name}</p>
                        {j.description && <p className="text-xs text-muted-foreground">{j.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {taskKpiEnabled && (
                        <span className="text-xs font-semibold text-muted-foreground">{j.kpi_points} pts</span>
                      )}
                      <Link
                        href={`/dashboard/job-types/${j.id}/edit`}
                        className="text-muted-foreground hover:text-primary"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <form action={deleteJobType.bind(null, j.id)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Delete "${j.name}"? Tasks using this job type will keep their history but lose the job type link.`}
                          className="text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">No job types yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
