"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

export default function AddWorker() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    setForm({ full_name: "", email: "", phone: "", password: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90">
        <UserPlus className="h-4 w-4" />
        Add worker
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Add worker</h2>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          They&apos;ll log in to the mobile app with this email &amp; password.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <Input
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
          <Input
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <Input
            type="text"
            placeholder="Temporary password (min 6 chars)"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            minLength={6}
            required
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? "Creating…" : "Create worker"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
