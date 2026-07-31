"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import AddressSearch from "@/app/components/AddressSearch";

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

interface LocationPickerProps {
  defaultLat?: number | null;
  defaultLng?: number | null;
  onAddressFound?: (address: string) => void;
}

// Replaces the old "right-click Google Maps, paste the coordinates" flow —
// search an address (geocoded via Nominatim) or tap the map to drop a pin,
// drag to adjust. Still just feeds the same location_lat/location_lng
// hidden fields the server action already reads.
export default function LocationPicker({ defaultLat, defaultLng, onAddressFound }: LocationPickerProps) {
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    defaultLat != null && defaultLng != null ? { lat: defaultLat, lng: defaultLng } : null
  );

  return (
    <div>
      <div className="mb-2">
        <AddressSearch
          onSelect={(lat, lng, displayName) => {
            setPin({ lat, lng });
            onAddressFound?.(displayName);
          }}
        />
      </div>
      <StopsMap
        mode="single"
        editable
        pins={pin ? [{ id: "pin", lat: pin.lat, lng: pin.lng }] : []}
        onMapClick={(lat, lng) => setPin({ lat, lng })}
        onPinMove={(_id, lat, lng) => setPin({ lat, lng })}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {pin
            ? `Pin set at ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} — tap the map or drag the pin to adjust.`
            : "Tap the map to drop a pin at the job site. Leave it unset and workers can upload from anywhere."}
        </p>
        {pin && (
          <button
            type="button"
            onClick={() => setPin(null)}
            className="shrink-0 text-xs font-medium text-destructive hover:underline"
          >
            Remove pin
          </button>
        )}
      </div>
      <input type="hidden" name="location_lat" value={pin?.lat ?? ""} />
      <input type="hidden" name="location_lng" value={pin?.lng ?? ""} />
    </div>
  );
}
