import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import type { CreateEmergencyPayload, Emergency } from '../types';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.error || error?.message || 'Could not reach the Smart EMS server.';
    return Promise.reject(new Error(message));
  }
);

interface StatusResponse {
  status: string;
  message: string;
}

interface CreateEmergencyResponse {
  message: string;
  emergency: Emergency;
  offered_to_ambulances?: unknown[];
  assigned_ambulance?: unknown;
}

export const api = {
  checkStatus: () => client.get<StatusResponse>('/status').then((r) => r.data),

  // Reuses the same POST /api/emergencies the admin panel's Create Incident
  // panel already calls (backend/controllers/emergencyController.js) — a
  // citizen report goes through the identical dispatch engine (Live-mode
  // offer broadcast or Simulation-mode auto-assign, whichever the backend is
  // currently set to). report_source: 'citizen' is the only thing that
  // distinguishes it server-side.
  createEmergency: (payload: CreateEmergencyPayload) =>
    client.post<CreateEmergencyResponse>('/emergencies', payload).then((r) => r.data),
};
