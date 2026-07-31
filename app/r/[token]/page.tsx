import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadReportBundle } from "@/lib/report-data";
import type { Report } from "@/lib/types";
import ReportView from "@/app/components/ReportView";
import ReportBrandedHeader from "@/app/components/ReportBrandedHeader";
import ReportRating from "@/app/components/ReportRating";

// Public, unauthenticated. Served via the service-role key, scoped to a single
// report by its unguessable share token.
export const dynamic = "force-dynamic";

async function getBundle(token: string) {
  const admin = createAdminClient();
  const { data: report } = await admin
    .from("reports")
    .select("*")
    .eq("share_token", token)
    .eq("is_public", true)
    .single<Report>();
  if (!report) return null;
  return loadReportBundle(admin, report);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const bundle = await getBundle(token);
  if (!bundle) return { title: "Report not found" };
  return {
    title: `${bundle.report.title} | ${bundle.orgName}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bundle = await getBundle(token);
  if (!bundle) notFound();

  return (
    <main className="light min-h-screen bg-muted py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 print:px-0">
        <div className="card-shadow overflow-hidden rounded-2xl border border-border-strong print:rounded-none print:border-0 print:shadow-none">
          <ReportBrandedHeader orgName={bundle.orgName} />
          <ReportView bundle={bundle} />
        </div>
        <ReportRating
          token={token}
          initialRating={bundle.report.client_rating}
          initialFeedback={bundle.report.client_feedback}
        />
        <p className="mt-4 text-center text-xs text-muted-foreground print:hidden">Powered by JobSnap</p>
      </div>
    </main>
  );
}
