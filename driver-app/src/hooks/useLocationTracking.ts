import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { requestLocationPermission, getCurrentCoords, type Coords as TrackedCoords } from '../services/location';

export type { TrackedCoords };

const POLL_INTERVAL_MS = 5000;

/**
 * Foreground-only GPS loop (MVP scope — see plan). While `online`, reads the
 * device's position every 5s and PUTs it to the existing
 * `/api/ambulances/:id` endpoint, which already broadcasts `ambulance:updated`
 * to the admin panel — no new backend endpoint needed for this.
 */
export function useLocationTracking(ambulanceId: string | null, online: boolean) {
  const [coords, setCoords] = useState<TrackedCoords | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

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

      const pushLocation = async () => {
        try {
          const next = await getCurrentCoords();
          if (cancelled) return;

          setCoords(next);

          await api.updateAmbulanceLocation(ambulanceId, {
            latitude: next.latitude,
            longitude: next.longitude,
            ...(next.heading != null && next.heading >= 0 ? { heading: Math.round(next.heading) } : {}),
            // expo-location reports speed in m/s; the backend/admin panel display km/h.
            ...(next.speed != null && next.speed >= 0 ? { speed: Math.round(next.speed * 3.6) } : {}),
          });
        } catch (err) {
          console.warn('Location push failed:', err instanceof Error ? err.message : err);
        }
      };

      await pushLocation();
      intervalRef.current = setInterval(pushLocation, POLL_INTERVAL_MS);
    }

    start();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [ambulanceId, online]);

  return { coords, permissionError };
}
