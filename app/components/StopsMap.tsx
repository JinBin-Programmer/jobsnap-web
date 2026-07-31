"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L, { type LeafletEvent } from "leaflet";
import "leaflet/dist/leaflet.css";

// Kuala Lumpur — sensible default center until a pin exists.
const DEFAULT_CENTER: [number, number] = [3.15905, 101.71204];
const DEFAULT_ZOOM = 12;

const SINGLE_COLOR = "#24343A"; // primary — the classic one-site pin
const PENDING_COLOR = "#4C7A94"; // steel — stop not done yet
const DONE_COLOR = "#215C40"; // completed fg — stop delivered

// Leaflet's default marker icon references relative image paths that break
// under Next's bundler (404s, no pin renders). Sidestep that entirely with a
// tiny inline teardrop divIcon instead of L.Icon.Default — also lets us
// color pins by done/pending without juggling multiple image assets.
function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.45)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}

export interface StopPin {
  id: string;
  lat: number;
  lng: number;
  done?: boolean;
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface StopsMapProps {
  pins: StopPin[];
  mode: "single" | "multi";
  editable?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onPinMove?: (id: string, lat: number, lng: number) => void;
  height?: number;
}

export default function StopsMap({
  pins,
  mode,
  editable = false,
  onMapClick,
  onPinMove,
  height = 280,
}: StopsMapProps) {
  const center: [number, number] = pins[0] ? [pins[0].lat, pins[0].lng] : DEFAULT_CENTER;

  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border border-input">
      <MapContainer
        center={center}
        zoom={pins.length ? 15 : DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        {/* CartoDB's free dark basemap (same OSM data, no API key) — matches
            the dashboard's dark theme; this map only ever renders inside it. */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {editable && onMapClick && <ClickHandler onMapClick={onMapClick} />}
        {pins.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={pinIcon(mode === "multi" ? (p.done ? DONE_COLOR : PENDING_COLOR) : SINGLE_COLOR)}
            draggable={editable}
            eventHandlers={
              editable && onPinMove
                ? {
                    dragend: (e: LeafletEvent) => {
                      const marker = e.target as L.Marker;
                      const { lat, lng } = marker.getLatLng();
                      onPinMove(p.id, lat, lng);
                    },
                  }
                : undefined
            }
          />
        ))}
      </MapContainer>
    </div>
  );
}
