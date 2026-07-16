import { useEffect, useState } from 'react';
import { reverseGeocode } from '../services/geocoding';

// Module-level cache (survives re-renders/re-mounts, not app restarts) keyed
// by rounded coordinates, so re-showing a card for the same incident doesn't
// re-hit Nominatim's rate-limited free endpoint.
const cache = new Map<string, string | null>();

function keyFor(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

/** Resolves coordinates to a short place name; null if geocoding failed or hasn't resolved yet. */
export function useReverseGeocode(latitude: number, longitude: number): { label: string | null; loading: boolean } {
  const key = keyFor(latitude, longitude);
  const [label, setLabel] = useState<string | null>(cache.get(key) ?? null);
  const [loading, setLoading] = useState(!cache.has(key));

  useEffect(() => {
    if (cache.has(key)) {
      setLabel(cache.get(key) ?? null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    reverseGeocode(latitude, longitude).then((name) => {
      if (cancelled) return;
      cache.set(key, name);
      setLabel(name);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { label, loading };
}
