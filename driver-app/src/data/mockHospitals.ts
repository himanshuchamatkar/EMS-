import { calculateDistanceKm } from '../utils/distance';

export interface MockHospital {
  id: string;
  name: string;
  traumaLevel: string;
  address: string;
  latitude: number;
  longitude: number;
  bedsAvailable: number;
  phone: string;
  accepting: boolean;
}

export interface RankedMockHospital extends MockHospital {
  distanceKm: number;
}

/**
 * Placeholder only — there is no hospitals table or hospital-dashboard
 * integration anywhere in this backend yet (see the driver-app audit).
 * Coordinates are generated as small offsets from wherever the incident
 * actually is, so distance/ETA look plausible in a demo regardless of where
 * the backend's seed data places it. One entry is hardcoded `accepting` to
 * demonstrate it being pinned to #1 even when it isn't the closest. Swap
 * this whole module for a real API call once a hospital dashboard exists.
 */
interface HospitalTemplate {
  name: string;
  traumaLevel: string;
  address: string;
  bedsAvailable: number;
  phone: string;
  accepting: boolean;
  dLat: number;
  dLon: number;
}

const HOSPITAL_TEMPLATES: HospitalTemplate[] = [
  { name: 'City Central Hospital', traumaLevel: 'Trauma Center · Level 2', address: '1200 Medical Way', bedsAvailable: 3, phone: '+15550101001', accepting: true, dLat: 0.018, dLon: 0.026 },
  { name: 'Lakeside Regional Medical', traumaLevel: 'Trauma Center · Level 3', address: '48 Lakeside Dr', bedsAvailable: 1, phone: '+15550101002', accepting: false, dLat: -0.03, dLon: 0.012 },
  { name: "St. Xavier's General", traumaLevel: 'General Hospital', address: '900 Xavier Blvd', bedsAvailable: 5, phone: '+15550101003', accepting: false, dLat: 0.008, dLon: -0.034 },
  { name: 'Metro Trauma Institute', traumaLevel: 'Trauma Center · Level 1', address: '77 Metro Pkwy', bedsAvailable: 0, phone: '+15550101004', accepting: false, dLat: -0.014, dLon: -0.02 },
];

/** Nearby hospitals ranked with the accepting one pinned first, then by distance. */
export function getNearbyMockHospitals(originLat: number, originLon: number): RankedMockHospital[] {
  return HOSPITAL_TEMPLATES.map((t, index) => {
    const latitude = originLat + t.dLat;
    const longitude = originLon + t.dLon;
    return {
      id: `mock-hospital-${index}`,
      name: t.name,
      traumaLevel: t.traumaLevel,
      address: t.address,
      latitude,
      longitude,
      bedsAvailable: t.bedsAvailable,
      phone: t.phone,
      accepting: t.accepting,
      distanceKm: calculateDistanceKm(originLat, originLon, latitude, longitude),
    };
  }).sort((a, b) => {
    if (a.accepting !== b.accepting) return a.accepting ? -1 : 1;
    return a.distanceKm - b.distanceKm;
  });
}
