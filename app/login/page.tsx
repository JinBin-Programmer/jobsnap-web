"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import Logo from "@/app/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-background px-6 py-10">
      <div className="card-shadow w-full max-w-[380px] rounded-[18px] border border-border bg-card p-9">
        <Link href="/" className="mb-7 flex items-center gap-2.5">
          <Logo size={28} />
          <span className="text-[17px] font-extrabold text-primary">JobSnap</span>
        </Link>
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">Welcome back</h1>
        <p className="mb-6 text-sm text-muted-foreground">Log in to your dashboard.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-[var(--primary-hover)]">
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[13.5px] text-muted-foreground">
          No account?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Start free trial
          </Link>
        </p>
      </div>
    </main>
  );
}
