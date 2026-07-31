import Link from "next/link";
import { requireProfile, isManager } from "@/lib/auth";
import { Smartphone } from "lucide-react";
import SignOutButton from "@/app/components/SignOutButton";
import SidebarNav from "./SidebarNav";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { getPlan } from "@/lib/plans";
import Logo from "@/app/components/Logo";

function formatGb(mb: number) {
  return `${(mb / 1024).toFixed(1)}GB`;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireProfile();
  const [{ data: org }, { data: storage }] = await Promise.all([
    supabase.from("organizations").select("name, plan").eq("id", profile.org_id!).single(),
    supabase.rpc("org_storage_status").maybeSingle(),
  ]);

  // The web dashboard is the manager tool. Workers use the mobile app.
  if (!isManager(profile)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          <Smartphone className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-display text-xl font-bold">Use the JobSnap mobile app</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;re signed in as a worker. Your jobs, photo capture and location features
            live in the JobSnap mobile app. The web dashboard is for managers.
          </p>
          <div className="mt-6 flex justify-center">
            <SignOutButton />
          </div>
        </div>
      </main>
    );
  }

  const displayName = profile.full_name || profile.email || "";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "?";

  const plan = getPlan(org?.plan);
  const usedBytes = (storage as { used_bytes: number } | null)?.used_bytes ?? 0;
  const limitMb = (storage as { limit_mb: number | null } | null)?.limit_mb ?? null;
  const usedMb = usedBytes / (1024 * 1024);
  const usagePct = limitMb ? Math.min(100, (usedMb / limitMb) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card sm:flex">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-[22px]">
          <Logo size={26} />
          <Link href="/dashboard" className="text-[16px] font-extrabold text-primary">
            JobSnap
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
        <div className="p-3">
          <div className="rounded-xl border border-border bg-background p-3.5">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-steel">
              {plan.name} plan
            </p>
            {limitMb != null ? (
              <>
                <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-meter-track">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {usedMb < 1024 ? `${usedMb.toFixed(0)}MB` : formatGb(usedMb)} of {formatGb(limitMb)} used
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Unlimited storage</p>
            )}
          </div>
        </div>
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2.5">
            <Avatar>
              <AvatarFallback className="bg-secondary text-xs font-bold text-secondary-foreground">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
              <p className="text-xs capitalize text-muted-foreground">{profile.role}</p>
            </div>
          </div>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 bg-muted">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:hidden">
          <span className="font-display font-bold text-primary">JobSnap</span>
          <SignOutButton />
        </div>
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </div>
    </div>
  );
}
