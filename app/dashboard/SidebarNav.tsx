"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Users, Building2, Tags, CalendarRange, Images, FileText } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/dashboard/workers", label: "Workers", icon: Users },
  { href: "/dashboard/clients", label: "Clients", icon: Building2 },
  { href: "/dashboard/job-types", label: "Job Types", icon: Tags },
  { href: "/dashboard/schedule", label: "Team Schedule", icon: CalendarRange },
  { href: "/dashboard/media", label: "Media Library", icon: Images },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 p-3">
      {nav.map((item) => {
        // Overview ("/dashboard") should only be active on an exact match;
        // everything else stays active for its sub-routes too.
        const active =
          item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
