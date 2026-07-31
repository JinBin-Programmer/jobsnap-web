"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is OFF, we get a session immediately → go to onboarding.
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    // Email confirmation ON → user must verify first.
    setMessage(
      "Check your email to confirm your account, then log in to finish setting up your company."
    );
    setLoading(false);
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-background px-6 py-10">
      <div className="card-shadow w-full max-w-[400px] rounded-[18px] border border-border bg-card p-9">
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">Start your free trial</h1>
        <p className="mb-6 text-sm text-muted-foreground">No credit card required.</p>

        {message ? (
          <p className="rounded-lg bg-secondary p-4 text-sm text-secondary-foreground">{message}</p>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Lim Wei Xuan"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-[var(--primary-hover)]">
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-[13.5px] text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
