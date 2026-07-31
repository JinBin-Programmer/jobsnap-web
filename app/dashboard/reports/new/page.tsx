import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createReport } from "@/app/dashboard/reports/actions";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { task: taskId } = await searchParams;
  if (!taskId) notFound();

  const { data: task } = await supabase
    .from("tasks")
    .select("title, client:client_id(name)")
    .eq("id", taskId)
    .eq("org_id", profile.org_id)
    .single();
  if (!task) notFound();

  const client = task.client as unknown as { name: string } | null;

  return (
    <div>
      <Link
        href={`/dashboard/tasks/${taskId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to task
      </Link>

      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink">Generate report</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Bundles {task.title}&apos;s timeline into a branded, shareable page{client ? ` for ${client.name}` : ""}.
      </p>

      <div className="card-shadow mt-6 max-w-lg rounded-2xl border border-border bg-card p-6">
        <p className="mb-3.5 text-[13px] font-bold text-ink">Report settings</p>
        <form action={createReport.bind(null, taskId)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-body-text">Report title</label>
            <Input name="title" defaultValue={`${task.title} — Service Report`} />
          </div>
          <div>
            <p className="mb-1.5 block text-[13px] font-semibold text-body-text">Include</p>
            <p className="text-[13.5px] text-body-text">☑ All timeline entries &nbsp; ☑ GPS coordinates &nbsp; ☑ Photos</p>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-[var(--primary-hover)]">
            Preview client report →
          </Button>
        </form>
      </div>
    </div>
  );
}
