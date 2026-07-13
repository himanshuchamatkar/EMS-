import { useEffect, useRef, useState } from 'react';
import type { LocationSubscription } from 'expo-location';
import { api } from '../services/api';
import { requestLocationPermission, watchCoords, type Coords as TrackedCoords } from '../services/location';
import { filterCoords } from '../utils/locationFilters';

export type { TrackedCoords };

/**
 * Foreground navigation-grade GPS tracking. While `online`, subscribes to a
 * continuous native location watch (BestForNavigation, 2s/5m cadence),
 * drops fixes that fail sanity checks (poor accuracy, impossible jumps,
 * unrealistic speed), and PUTs the rest to the existing
 * `/api/ambulances/:id` endpoint, which already broadcasts `ambulance:updated`
 * to the admin panel — no new backend endpoint needed for this.
 */
export function useLocationTracking(ambulanceId: string | null, online: boolean) {
  const [coords, setCoords] = useState<TrackedCoords | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const lastAcceptedRef = useRef<TrackedCoords | null>(null);

  useEffect(() => {
    let cancelled = false;
    let subscription: LocationSubscription | null = null;
    lastAcceptedRef.current = null;

    async function start() {
      if (!online || !ambulanceId) return;

      const granted = await requestLocationPermission();
      if (!granted) {
        if (!cancelled) {
          setPermissionError('Location permission was denied. Enable it in Settings to go online.');
        }
        return;
      }
      if (!cancelled) setPermissionError(null);

      subscription = await watchCoords((raw) => {
        if (cancelled) return;

        const accepted = filterCoords(raw, lastAcceptedRef.current);
        if (!accepted) return;

        lastAcceptedRef.current = accepted;
        setCoords(accepted);

        api
          .updateAmbulanceLocation(ambulanceId, {
            latitude: accepted.latitude,
            longitude: accepted.longitude,
            accuracy: accepted.accuracy ?? undefined,
            timestamp: accepted.timestamp,
            ...(accepted.heading != null && accepted.heading >= 0 ? { heading: Math.round(accepted.heading) } : {}),
            // expo-location reports speed in m/s; the backend/admin panel display km/h.
            ...(accepted.speed != null && accepted.speed >= 0 ? { speed: Math.round(accepted.speed * 3.6) } : {}),
          })
          .catch((err) => {
            console.warn('Location push failed:', err instanceof Error ? err.message : err);
          });
      });
    }

    start();

    return () => {
      cancelled = true;
      subscription?.remove();
      subscription = null;
    };
  }, [ambulanceId, online]);

  return { coords, permissionError };
}
