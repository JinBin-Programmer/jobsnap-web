import Link from "next/link";
import { Download, ShieldCheck } from "lucide-react";
import Logo from "@/app/components/Logo";

export const metadata = { title: "Download the JobSnap worker app" };

export default function DownloadPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <Logo size={34} />
        <span className="text-xl font-extrabold tracking-tight text-primary">JobSnap</span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 card-shadow">
        <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-ink">Get the worker app</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          This is the app your team uses to see their jobs, check in on-site, and send photo proof. Your manager
          will give you a login once they&apos;ve added you as a worker.
        </p>

        <a
          href="/downloads/jobsnap.apk"
          download
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-[9px] bg-primary px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(36,52,58,0.55)] transition hover:-translate-y-px hover:bg-[var(--primary-hover)]"
        >
          <Download className="h-5 w-5" />
          Download for Android
        </a>
        <p className="text-xs text-muted-foreground">
          Android 8.0 or newer. Not on the Play Store yet, so you&apos;ll need to allow &ldquo;install from unknown
          sources&rdquo; once — Android will prompt you for this automatically.
        </p>

        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-muted p-3.5 text-left">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-steel" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            This file comes straight from JobSnap&apos;s build system, not a third party. If your phone shows a
            warning, it&apos;s only because the app isn&apos;t listed on the Play Store yet.
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        iPhone user? Support for iOS is coming — for now, ask your manager about alternatives.
      </p>
    </main>
  );
}
