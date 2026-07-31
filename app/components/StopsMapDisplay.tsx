"use client";

import dynamic from "next/dynamic";
import type { StopPin } from "./StopsMap";

const StopsMap = dynamic(() => import("./StopsMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  );
}

// Read-only multi-pin view for the task detail page — pins colored by
// done/pending, no editing.
export default function StopsMapDisplay({ pins }: { pins: StopPin[] }) {
  return <StopsMap mode="multi" pins={pins} height={320} />;
}
