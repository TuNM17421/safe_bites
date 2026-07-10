'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { compatBand, COMPAT_BAND_VAR } from '@/lib/compat-band';
import type { ClientLocation, RestaurantListItem } from '@/features/restaurants/restaurants-client';

export type LatLng = [number, number];

// Colour-blind-safe map pin: band colour + the % number. Semantic tokens only (the --sb-* vars
// are global on :root, so they resolve inside the injected divIcon HTML).
function pinIcon(percent: number | null): L.DivIcon {
  const color = `hsl(var(${COMPAT_BAND_VAR[compatBand(percent)]}))`;
  const label = percent === null ? '?' : String(percent);
  return L.divIcon({
    className: 'sb-compat-pin',
    html: `<div style="display:grid;place-items:center;width:30px;height:30px;border-radius:9999px;background:${color};border:2px solid hsl(var(--sb-surface));color:hsl(var(--sb-primary-foreground));font:800 11px system-ui;box-shadow:0 1px 4px rgba(15,23,42,.45)">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function userIcon(): L.DivIcon {
  return L.divIcon({
    className: 'sb-user-dot',
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:hsl(var(--sb-brand));border:3px solid hsl(var(--sb-surface));box-shadow:0 0 0 4px hsl(var(--sb-brand) / 0.28)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Keep the view following the active centre (geolocation grant / city fallback) without
// resetting the user's zoom.
function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function MapCanvas({
  center,
  userLocation,
  items,
  onSelect,
}: {
  center: LatLng;
  userLocation: ClientLocation | null;
  items: RestaurantListItem[];
  onSelect: (item: RestaurantListItem) => void;
}) {
  return (
    <MapContainer center={center} zoom={15} zoomControl={false} className="h-full w-full">
      {/* License-clean raster tiles. Swap the URL for a keyed provider via env in production. */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <Recenter center={center} />
      {userLocation ? <Marker position={[userLocation.lat, userLocation.lon]} icon={userIcon()} /> : null}
      {items.map((it) =>
        it.lat !== null && it.lon !== null ? (
          <Marker
            key={it.restaurantId}
            position={[it.lat, it.lon]}
            icon={pinIcon(it.compatibility)}
            eventHandlers={{ click: () => onSelect(it) }}
          />
        ) : null,
      )}
    </MapContainer>
  );
}
