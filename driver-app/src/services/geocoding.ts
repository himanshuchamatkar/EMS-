const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Reverse geocodes coordinates into a short place name via OpenStreetMap's
 * free Nominatim API — no key needed, same data source as the app's existing
 * map tiles. Their usage policy (operations.osmfoundation.org/policies/nominatim)
 * requires a descriptive User-Agent identifying the app and caps usage around
 * 1 request/second — replace the contact below with a real one before
 * shipping, and keep call sites caching by coordinate (see useReverseGeocode).
 * Returns null on any failure so callers can degrade gracefully.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const url = `${NOMINATIM_REVERSE_URL}?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=0`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SmartEMS-DriverApp/1.0 (ops@smartems.example)',
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;

    const data = await response.json();
    if (typeof data?.name === 'string' && data.name.trim().length > 0) {
      return data.name.trim();
    }
    if (typeof data?.display_name === 'string' && data.display_name.trim().length > 0) {
      return data.display_name.split(',')[0].trim();
    }
    return null;
  } catch {
    return null;
  }
}
