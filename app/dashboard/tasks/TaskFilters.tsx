"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const selectClass =
  "rounded-lg border border-input bg-card px-3 py-[9px] text-[13.5px] text-ink outline-none focus-visible:border-ring";

export default function TaskFilters({
  clients,
  workers,
}: {
  clients: string[];
  workers: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "All") params.delete(key);
    else params.set(key, value);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  // Debounce the free-text search so we're not navigating on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== (searchParams.get("q") ?? "")) setParam("q", search);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="mb-4 flex flex-wrap gap-2.5">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search title, client, worker..."
        className="min-w-[220px] flex-1 rounded-lg border border-input bg-card px-3 py-[9px] text-[13.5px] text-ink outline-none focus-visible:border-ring"
      />
      <select
        defaultValue={searchParams.get("client") ?? "All"}
        onChange={(e) => setParam("client", e.target.value)}
        className={selectClass}
      >
        <option>All</option>
        {clients.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select
        defaultValue={searchParams.get("worker") ?? "All"}
        onChange={(e) => setParam("worker", e.target.value)}
        className={selectClass}
      >
        <option>All</option>
        {workers.map((w) => (
          <option key={w}>{w}</option>
        ))}
      </select>
      <select
        defaultValue={searchParams.get("date") ?? "This month"}
        onChange={(e) => setParam("date", e.target.value)}
        className={selectClass}
      >
        <option>This month</option>
        <option>Last month</option>
        <option>All time</option>
      </select>
    </div>
  );
}
