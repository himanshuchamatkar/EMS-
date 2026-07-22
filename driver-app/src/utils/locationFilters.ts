import type { Coords } from '../services/location';

export const MAX_ACCURACY_METERS = 200;
export const MAX_SPEED_KMH = 180;
export const MIN_MOVING_SPEED_KMH = 2;

const EARTH_RADIUS_METERS = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in meters. */
function distanceMeters(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Decides whether a raw GPS fix is trustworthy enough to forward, comparing
 * it against the last *accepted* fix. Returns null when the fix should be
 * dropped entirely, or a (possibly adjusted) Coords to send otherwise.
 */
export function filterCoords(next: Coords, previous: Coords | null): Coords | null {
  if (next.accuracy != null && next.accuracy > MAX_ACCURACY_METERS) {
    return null;
  }

  const speedKmh = next.speed != null && next.speed >= 0 ? next.speed * 3.6 : null;
  if (speedKmh != null && speedKmh > MAX_SPEED_KMH) {
    return null;
  }

  if (previous) {
    const elapsedSeconds = (next.timestamp - previous.timestamp) / 1000;
    if (elapsedSeconds > 0.1) {
      const impliedSpeedKmh = (distanceMeters(previous, next) / elapsedSeconds) * 3.6;
      if (impliedSpeedKmh > MAX_SPEED_KMH) {
        return null;
      }
    }
  }

  const isMoving = speedKmh != null && speedKmh >= MIN_MOVING_SPEED_KMH;
  return isMoving ? next : { ...next, heading: null };
}
