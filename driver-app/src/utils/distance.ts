/**
 * Great-circle distance in kilometers. Mirrors backend/utils/haversine.js
 * so the driver app can show a live "distance to incident" reading between
 * GPS pushes, without waiting on a server round-trip.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(3));
}

const ASSUMED_KMH_WHEN_STATIONARY = 40;
const MIN_MOVING_KMH_FOR_ETA = 5;

/**
 * Rough, client-only ETA in whole minutes: straight-line distance over
 * current speed. There's no routing/traffic API in this app (see the
 * driver-app audit), so this ignores roads and turns — falls back to an
 * assumed 40 km/h while stationary or just starting out, so the figure
 * doesn't show "0 min" or spike to infinity at a red light.
 */
export function estimateEtaMinutes(distanceKm: number, currentSpeedKmh: number | null): number {
  const speed = currentSpeedKmh != null && currentSpeedKmh >= MIN_MOVING_KMH_FOR_ETA ? currentSpeedKmh : ASSUMED_KMH_WHEN_STATIONARY;
  return Math.max(1, Math.round((distanceKm / speed) * 60));
}
