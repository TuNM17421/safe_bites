'use client';
import { useEffect, useState } from 'react';

export interface ClientConfig {
  supportedCities: string[];
  defaultCity: string;
  supportedLanguages: string[];
  offlineCacheTtlDays: number;
  pwaInstallEnabled: boolean;
}

// Lightweight one-shot fetch of /api/v1/client-config. (TanStack Query caching is wired
// in the dish-guide phase where request caching actually matters.)
export function useClientConfig(): ClientConfig | null {
  const [config, setConfig] = useState<ClientConfig | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/v1/client-config')
      .then((res) => res.json())
      .then((json: { data: ClientConfig }) => {
        if (active) setConfig(json.data);
      })
      .catch(() => {
        /* offline / unavailable — leave null */
      });
    return () => {
      active = false;
    };
  }, []);

  return config;
}
