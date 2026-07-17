import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import type { Ambulance, AmbulanceStatus, Emergency } from '../types';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.error || error?.message || 'Could not reach the dispatch server.';
    return Promise.reject(new Error(message));
  }
);

type LocationUpdate = Partial<Pick<Ambulance, 'latitude' | 'longitude' | 'heading' | 'speed' | 'accuracy'>> & {
  timestamp?: number;
};

interface CreateAmbulancePayload {
  name: string;
  vehicle_number: string;
  driver_name?: string;
  latitude: number;
  longitude: number;
}

interface OfferResponse {
  message: string;
  emergency: Emergency | null;
  offered_to_ambulances: Ambulance[];
}

interface AcceptResponse {
  message: string;
  emergency: Emergency;
  ambulance: Ambulance;
}

interface PickupResponse {
  message: string;
  emergency: Emergency;
}

interface CancelResponse {
  message: string;
  emergency: Emergency;
  ambulance: Ambulance;
}

interface DropResponse {
  message: string;
  emergency: Emergency;
  ambulance: Ambulance;
}

export const api = {
  getAmbulances: () => client.get<Ambulance[]>('/ambulances').then((r) => r.data),

  getAmbulanceById: (id: string) => client.get<Ambulance>(`/ambulances/${id}`).then((r) => r.data),

  // Lets the app register a brand-new ambulance, now that the admin panel is
  // monitor-only and no longer has an Add Ambulance UI.
  createAmbulance: (payload: CreateAmbulancePayload) =>
    client.post<Ambulance>('/ambulances', payload).then((r) => r.data),

  updateAmbulanceLocation: (id: string, updates: LocationUpdate) =>
    client.put<Ambulance>(`/ambulances/${id}`, updates).then((r) => r.data),

  // Manual status control (Available/Busy/Offline/Maintenance) — previously
  // only available from the admin panel, now driver-app-only.
  updateAmbulanceStatus: (id: string, status: AmbulanceStatus) =>
    client.put<Ambulance>(`/ambulances/${id}`, { status }).then((r) => r.data),

  // Existing PUT /api/ambulances/:id is reused for GPS pings (see backend audit) —
  // no dedicated location endpoint was added.
  acceptOffer: (emergencyId: string, ambulanceId: string) =>
    client
      .post<AcceptResponse>('/dispatch/accept', { emergency_id: emergencyId, ambulance_id: ambulanceId })
      .then((r) => r.data),

  rejectOffer: (emergencyId: string, ambulanceId: string) =>
    client
      .post<OfferResponse>('/dispatch/reject', { emergency_id: emergencyId, ambulance_id: ambulanceId })
      .then((r) => r.data),

  // Reuses the existing admin-panel "cancel assignment" endpoint — frees the
  // ambulance and reopens the emergency as Pending. Used to let the driver
  // decline an assignment that the admin/backend made directly (bypassing
  // the offer flow), see backend/controllers/dispatchController.js cancelAssignment.
  cancelAssignment: (emergencyId: string) =>
    client
      .post<CancelResponse>('/dispatch/cancel', { emergency_id: emergencyId })
      .then((r) => r.data),

  // Driver confirms the victim is on board. Sets emergency status to
  // VICTIM_PICKED (with a server-side timestamp) — does not free the
  // ambulance or resolve the incident, see backend/controllers/dispatchController.js.
  pickupVictim: (emergencyId: string, ambulanceId: string) =>
    client
      .post<PickupResponse>('/dispatch/pickup', { emergency_id: emergencyId, ambulance_id: ambulanceId })
      .then((r) => r.data),

  // Driver confirms drop-off at the hospital. Terminal step: resolves the
  // incident and frees the ambulance back to Available.
  dropAtHospital: (emergencyId: string, ambulanceId: string) =>
    client
      .post<DropResponse>('/dispatch/drop', { emergency_id: emergencyId, ambulance_id: ambulanceId })
      .then((r) => r.data),
};
