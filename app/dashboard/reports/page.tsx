import Link from "next/link";
import { format } from "date-fns";
import { requireProfile } from "@/lib/auth";
import type { Report } from "@/lib/types";
import { FileText, ExternalLink } from "lucide-react";

export default async function ReportsPage() {
  const { supabase, profile } = await requireProfile();

  const { data: reports } = await supabase
    .from("reports")
    .select("*, task:task_id(title, client:client_id(name))")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Reports</h1>
      <p className="text-sm text-muted-foreground">Proof-of-work reports you&apos;ve shared with clients.</p>

      <div className="mt-6 overflow-hidden card-shadow rounded-2xl border border-border bg-card">
        {reports && reports.length > 0 ? (
          <ul className="divide-y divide-border">
            {(reports as (Report & { task: { title: string; client: { name: string } | null } | null })[]).map(
              (r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <Link href={`/dashboard/reports/${r.id}`} className="font-medium hover:text-primary">
                        {r.title}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">
                        {r.task?.client?.name ? `${r.task.client.name} · ` : ""}
                        {format(new Date(r.created_at), "d MMM yyyy").toUpperCase()}
                        {r.client_rating != null && (
                          <span className="ml-2" style={{ color: "var(--priority-high)" }}>
                            {"★".repeat(r.client_rating)}
                            <span className="text-muted-foreground">{"★".repeat(5 - r.client_rating)}</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/r/${r.share_token}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View
                  </Link>
                </li>
              )
            )}
          </ul>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No reports yet. Open a task and click{" "}
            <span className="font-medium text-foreground">Create report</span> to generate one.
          </div>
        )}
      </div>
    </div>
  );
}
