"use client";

import { useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { AlertTriangle } from "lucide-react";

// Catches errors thrown anywhere inside /dashboard (e.g. a server action
// throwing a raw Postgres error) without taking down the whole app — the
// sidebar (from dashboard/layout.tsx, which wraps this) stays usable so a
// manager can navigate away instead of being stuck on a crash screen.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-border bg-card p-10 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
      <h2 className="mb-1.5 font-display text-lg font-bold text-ink">Something went wrong</h2>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        That action didn&apos;t go through. Nothing was lost — try again, or head back and try a
        different page.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()} className="bg-primary hover:bg-[var(--primary-hover)]">
          Try again
        </Button>
        <Button asChild variant="outline">
          <a href="/dashboard">Back to overview</a>
        </Button>
      </div>
    </div>
  );
}
