import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { updateJobType } from "@/app/dashboard/job-types/actions";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import type { JobType } from "@/lib/types";

export default async function EditJobTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();

  const [{ data: jobType }, { data: kpiSettings }] = await Promise.all([
    supabase.from("job_types").select("*").eq("id", id).eq("org_id", profile.org_id).single<JobType>(),
    supabase.from("kpi_settings").select("task_kpi_enabled").eq("org_id", profile.org_id).single(),
  ]);
  if (!jobType) notFound();
  const taskKpiEnabled = (kpiSettings as { task_kpi_enabled: boolean } | null)?.task_kpi_enabled ?? false;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/job-types"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to job types
      </Link>

      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight">Edit job type</h1>

      <form
        action={updateJobType.bind(null, id)}
        className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={jobType.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={2} defaultValue={jobType.description ?? ""} />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Colour
          <input
            name="color"
            type="color"
            defaultValue={jobType.color || "#24343A"}
            className="h-8 w-12 rounded border border-input"
          />
        </label>
        {taskKpiEnabled && (
          <div className="space-y-1.5">
            <Label htmlFor="kpi_points">KPI points (1 = counts as one job)</Label>
            <Input id="kpi_points" name="kpi_points" type="number" min={0.5} step={0.5} defaultValue={jobType.kpi_points} />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/job-types">Cancel</Link>
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
