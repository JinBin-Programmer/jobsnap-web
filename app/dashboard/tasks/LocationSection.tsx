"use client";

import { useState } from "react";
import { Input } from "@/app/components/ui/input";
import type { TaskStop } from "@/lib/types";
import LocationPicker from "./LocationPicker";
import StopsEditor from "./StopsEditor";

interface LocationSectionProps {
  defaultAddress?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
  defaultRadiusM?: number;
  initialHasStops?: boolean;
  initialStops?: TaskStop[];
}

// Owns the single "This job has multiple stops" toggle and switches between
// the classic one-pin picker (today's flow, unchanged behavior) and the
// multi-stop map + checklist editor. Both branches feed the same
// createTask/updateTask server action via named/hidden form fields.
export default function LocationSection({
  defaultAddress,
  defaultLat,
  defaultLng,
  defaultRadiusM = 150,
  initialHasStops = false,
  initialStops = [],
}: LocationSectionProps) {
  const [hasStops, setHasStops] = useState(initialHasStops);
  const [address, setAddress] = useState(defaultAddress ?? "");

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground">
          {hasStops ? "Route / area description" : "Location / address"}
        </span>
        <Input
          name="location_address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={hasStops ? "e.g. Subang Jaya & Puchong parcels — 30 Jul run" : "Job site address"}
        />
      </label>

      <div className="rounded-lg border border-dashed border-input p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            name="has_stops"
            value="true"
            checked={hasStops}
            onChange={(e) => setHasStops(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          This job has multiple stops (e.g. a delivery run)
        </label>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Off: one site pin, like a normal job. On: drop a pin per stop — parcel, unit, or site — and the
          worker gets a map + checklist with a rolling progress bar, completing stops in any order.
        </p>

        {hasStops ? (
          <StopsEditor initialStops={initialStops} />
        ) : (
          <>
            <p className="mb-2 text-sm font-medium text-foreground">
              GPS check <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            <LocationPicker defaultLat={defaultLat} defaultLng={defaultLng} onAddressFound={setAddress} />
            <div className="mt-4 max-w-[220px]">
              <span className="mb-1 block text-sm font-medium text-foreground">Upload radius (metres)</span>
              <Input name="upload_radius_m" type="number" min={50} max={500} step={10} defaultValue={defaultRadiusM} />
              <p className="mt-1 text-xs text-muted-foreground">
                Only used if you set a pin above — how close a worker must be to upload photos from mobile.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
