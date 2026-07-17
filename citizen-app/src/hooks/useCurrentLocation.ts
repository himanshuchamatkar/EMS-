import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { reverseGeocode } from '../services/geocoding';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  label: string;
  loading: boolean;
  granted: boolean;
  error: string | null;
}

const ACQUIRING_LABEL = 'Locating…';
const DENIED_LABEL = 'Location unavailable';

/** Requests foreground location on mount, fetches one fix, and resolves it to a short place name. */
export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    label: ACQUIRING_LABEL,
    loading: true,
    granted: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null, label: ACQUIRING_LABEL }));

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState({ latitude: null, longitude: null, label: DENIED_LABEL, loading: false, granted: false, error: 'Location permission denied' });
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const label = (await reverseGeocode(latitude, longitude)) ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      setState({ latitude, longitude, label, loading: false, granted: true, error: null });
    } catch (err) {
      setState({
        latitude: null,
        longitude: null,
        label: DENIED_LABEL,
        loading: false,
        granted: true,
        error: err instanceof Error ? err.message : 'Could not read your location.',
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
