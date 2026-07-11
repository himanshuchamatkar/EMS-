import * as Location from 'expo-location';

export interface Coords {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
}

/** Requests foreground location permission. Returns whether it was granted. */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/** Reads a single current GPS fix. Assumes permission has already been granted. */
export async function getCurrentCoords(): Promise<Coords> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    heading: position.coords.heading,
    speed: position.coords.speed,
  };
}
