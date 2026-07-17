import type { CitizenLocation } from '../types';

// Standing in for a real device-location read (Phase 2 already proved
// expo-location works) until this screen is wired to live data — this pass
// is UI-only per instructions, so a mock keeps Home's fields realistic
// without a real permission/location round trip.
export const mockCitizenLocation: CitizenLocation = {
  label: 'Magenwadi, 2, Maharashtra',
  latitude: 19.076,
  longitude: 72.8777,
  trackingActive: true,
};
