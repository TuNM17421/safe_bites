'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ClientLocation } from '@/features/restaurants/restaurants-client';

// Location is requested ONLY on explicit user action (§11.1) and kept in-memory + sessionStorage
// with a short TTL (§4.3). Never written to IndexedDB or analytics (§11, §16).
const KEY = 'sb_last_location';
const TTL_MS = 30 * 60 * 1000;

export type GeoStatus = 'idle' | 'prompting' | 'granted' | 'denied' | 'unsupported';

interface Stored extends ClientLocation {
  ts: number;
}

function readStored(): ClientLocation | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (!s || typeof s.lat !== 'number' || Date.now() - s.ts > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return { lat: s.lat, lon: s.lon, accuracyMeters: s.accuracyMeters };
  } catch {
    return null;
  }
}

export interface Geolocation {
  location: ClientLocation | null;
  status: GeoStatus;
  request: () => void;
  clear: () => void;
}

export function useGeolocation(): Geolocation {
  const [location, setLocation] = useState<ClientLocation | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');

  // Reuse a fresh session location so the user isn't re-prompted within the TTL.
  useEffect(() => {
    const cached = readStored();
    if (cached) {
      setLocation(cached);
      setStatus('granted');
    }
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    setStatus('prompting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: ClientLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy),
        };
        setLocation(loc);
        setStatus('granted');
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ ...loc, ts: Date.now() }));
        } catch {
          // sessionStorage unavailable — location still lives in memory for this view
        }
      },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  const clear = useCallback(() => {
    setLocation(null);
    setStatus('idle');
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }, []);

  return { location, status, request, clear };
}
