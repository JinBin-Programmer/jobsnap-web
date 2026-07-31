"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import AddressSearch from "@/app/components/AddressSearch";
import type { TaskStop } from "@/lib/types";

const StopsMap = dynamic(() => import("@/app/components/StopsMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-input bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  );
}

export interface StopDraft {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  radius_m: number;
  notes: string;
}

function toDraft(stops: TaskStop[]): StopDraft[] {
  return stops.map((s) => ({
    id: s.id,
    label: s.label,
    address: s.address ?? "",
    lat: s.lat,
    lng: s.lng,
    radius_m: s.radius_m,
    notes: s.notes ?? "",
  }));
}

interface StopsEditorProps {
  initialStops: TaskStop[];
}

// A map you tap to drop a pin per stop (drag to adjust) + a matching row
// list. Serializes to a hidden stops_json field so it plugs straight into
// the existing FormData-based createTask/updateTask server actions. Mounted
// by LocationSection.tsx when the "multiple stops" toggle is on.
export default function StopsEditor({ initialStops }: StopsEditorProps) {
  const [stops, setStops] = useState<StopDraft[]>(() => toDraft(initialStops));

  const addStopAt = (lat: number, lng: number, address = "") => {
    setStops((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: `Stop ${prev.length + 1}`,
        address,
        lat,
        lng,
        radius_m: 50,
        notes: "",
      },
    ]);
  };

  const moveStop = (id: string, lat: number, lng: number) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, lat, lng } : s)));
  };

  const updateStop = (id: string, patch: Partial<StopDraft>) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <AddressSearch
        placeholder="Search an address to add it as a stop…"
        onSelect={(lat, lng, displayName) => addStopAt(lat, lng, displayName)}
      />
      <StopsMap
        mode="multi"
        editable
        pins={stops.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, done: false }))}
        onMapClick={addStopAt}
        onPinMove={moveStop}
      />
      <p className="text-xs text-muted-foreground">
        Search an address above, or tap the map to add a stop. Drag a pin to move it.
      </p>

      <div className="space-y-3">
        {stops.length === 0 && (
          <p className="text-sm text-muted-foreground">No stops yet — tap the map above to add the first one.</p>
        )}
        {stops.map((s, i) => (
          <div key={s.id} className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-muted-foreground">Stop {i + 1}</span>
              <button
                type="button"
                onClick={() => removeStop(s.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove stop"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Label (e.g. Parcel 3 — Ahmad)"
                value={s.label}
                onChange={(e) => updateStop(s.id, { label: e.target.value })}
              />
              <Input
                placeholder="Address (optional)"
                value={s.address}
                onChange={(e) => updateStop(s.id, { address: e.target.value })}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Upload radius
                <Input
                  type="number"
                  min={20}
                  max={300}
                  step={10}
                  value={s.radius_m}
                  onChange={(e) => updateStop(s.id, { radius_m: Number(e.target.value) || 50 })}
                  className="w-24"
                />
                m
              </label>
              <Input
                placeholder="Notes for the worker (optional)"
                value={s.notes}
                onChange={(e) => updateStop(s.id, { notes: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      <input type="hidden" name="stops_json" value={JSON.stringify(stops)} />
    </div>
  );
}
