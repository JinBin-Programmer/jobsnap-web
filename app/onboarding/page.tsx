import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createOrganization } from "./actions";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already in an org? Skip onboarding.
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (profile?.org_id) redirect("/dashboard");

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-background px-6 py-10">
      <div className="card-shadow w-full max-w-[420px] rounded-[18px] border border-border bg-card p-9">
        <p className="mb-2 font-mono text-xs text-muted-foreground">STEP 1 OF 1</p>
        <h1 className="mb-1.5 text-[22px] font-extrabold text-ink">Name your company</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This appears on client reports and worker invites.
        </p>

        <form action={createOrganization} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org_name">Company name</Label>
            <Input id="org_name" name="org_name" required placeholder="e.g. Selamat Pest Control Sdn Bhd" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <select id="industry" name="industry" className={selectClass} defaultValue="Pest control">
              <option>Pest control</option>
              <option>Aircond servicing</option>
              <option>Commercial cleaning</option>
              <option>Facility maintenance</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team_size">Team size</Label>
            <select id="team_size" name="team_size" className={selectClass} defaultValue="1–5 workers">
              <option>1–5 workers</option>
              <option>6–15 workers</option>
              <option>16+ workers</option>
            </select>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-[var(--primary-hover)]">
            Go to dashboard
          </Button>
        </form>
      </div>
    </main>
  );
}
