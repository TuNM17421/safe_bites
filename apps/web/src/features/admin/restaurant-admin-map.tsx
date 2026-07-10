'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { AdminProvenanceBadge } from './admin-provenance-badge';
import type { RestaurantRow } from './restaurant-form';

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'sb-admin-pin',
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:hsl(var(--sb-brand));border:2px solid hsl(var(--sb-surface));box-shadow:0 1px 4px rgba(15,23,42,.45)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
  }, [points, map]);
  return null;
}

// Admin restaurant map (reuses the phase-06 Leaflet stack). Plots a pin per row with coordinates;
// rows without lat/lon are simply absent here (the list view still shows them).
export function RestaurantAdminMap({ rows }: { rows: RestaurantRow[] }) {
  const t = useTranslations('admin');
  const pins = rows.filter((r) => r.lat !== null && r.lon !== null);
  const points = pins.map((r) => [r.lat as number, r.lon as number] as [number, number]);
  const center: [number, number] = points[0] ?? [21.0285, 105.8542];

  return (
    <div className="flex flex-col gap-1">
      <div className="h-[420px] overflow-hidden rounded-sb-md border border-sb-border">
        <MapContainer center={center} zoom={13} zoomControl={false} className="h-full w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
          />
          <FitBounds points={points} />
          {pins.map((r) => (
            <Marker key={r.id} position={[r.lat as number, r.lon as number]} icon={pinIcon()}>
              <Popup>
                <span className="mb-1 block font-bold text-sb-fg">{r.canonicalName}</span>
                <AdminProvenanceBadge source={r.externalSource} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {pins.length < rows.length ? (
        <p className="text-xs text-sb-faint">
          {rows.length - pins.length} · {t('restaurant.noCoords')}
        </p>
      ) : null}
    </div>
  );
}
