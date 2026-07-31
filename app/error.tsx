"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";

// Catches errors anywhere outside /dashboard (marketing site, login,
// signup, onboarding) that aren't caught by a more specific error.tsx.
export default function RootError({
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
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md">
        <h1 className="mb-2 font-display text-xl font-bold text-ink">Something went wrong</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          An unexpected error happened. Try again, or come back in a moment.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => reset()} className="bg-primary hover:bg-[var(--primary-hover)]">
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
