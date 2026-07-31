import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { loadReportBundle } from "@/lib/report-data";
import type { Report } from "@/lib/types";
import ReportView from "@/app/components/ReportView";
import ReportBrandedHeader from "@/app/components/ReportBrandedHeader";
import CopyLinkButton from "@/app/components/CopyLinkButton";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .single<Report>();
  if (!report) notFound();

  const bundle = await loadReportBundle(supabase, report);
  if (!bundle) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const shareUrl = `${proto}://${host}/r/${report.share_token}`;
  const waText = encodeURIComponent(`Here's the work report from ${bundle.orgName}: ${shareUrl}`);

  return (
    <div>
      {/* Toolbar (hidden when printing) */}
      <div className="print:hidden">
        <Link
          href="/dashboard/reports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to reports
        </Link>

        <div className="card-shadow mt-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-ink">Share this report with your client</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Anyone with the link can view it — no login needed. Send it via WhatsApp, email, or SMS.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="min-w-0 flex-1 rounded-lg border border-input bg-muted px-3 py-2 font-mono text-sm text-muted-foreground"
            />
            <CopyLinkButton url={shareUrl} />
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
            >
              Send on WhatsApp
            </a>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          </div>
        </div>

        {report.client_rating != null && (
          <div className="card-shadow mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold text-ink">
              Client rating:{" "}
              <span style={{ color: "var(--priority-high)" }}>
                {"★".repeat(report.client_rating)}
                <span className="text-muted-foreground">{"★".repeat(5 - report.client_rating)}</span>
              </span>
            </p>
            {report.client_feedback && (
              <p className="mt-1.5 text-sm text-muted-foreground">&ldquo;{report.client_feedback}&rdquo;</p>
            )}
          </div>
        )}
      </div>

      {/* The report itself — forced back to light regardless of the dark
          dashboard around it, since this previews exactly what the client
          will see on the public report page. */}
      <div className="light card-shadow mt-6 overflow-hidden rounded-2xl border border-border-strong print:mt-0 print:rounded-none print:border-0">
        <ReportBrandedHeader orgName={bundle.orgName} />
        <ReportView bundle={bundle} />
      </div>
    </div>
  );
}
