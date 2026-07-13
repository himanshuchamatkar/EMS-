import * as Location from 'expo-location';

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

/** Requests foreground location permission. Returns whether it was granted. */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

function toCoords(position: Location.LocationObject): Coords {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    heading: position.coords.heading,
    speed: position.coords.speed,
    timestamp: position.timestamp,
  };
}

/** Reads a single current GPS fix (e.g. for one-off ambulance registration). */
export async function getCurrentCoords(): Promise<Coords> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });
  return toCoords(position);
}

/**
 * Starts a continuous native GPS subscription (navigation-grade) instead of
 * polling single fixes. Assumes permission has already been granted. Returns
 * the subscription handle — call `.remove()` to stop watching.
 */
export async function watchCoords(
  onUpdate: (coords: Coords) => void
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 2000,
      distanceInterval: 5,
    },
    (position) => onUpdate(toCoords(position))
  );
}
