export type MediaKind = 'photo' | 'video' | 'audio';

export type PreparedMediaState = Record<MediaKind, boolean>;

export interface CitizenLocation {
  label: string;
  latitude: number;
  longitude: number;
  trackingActive: boolean;
}

/** Local capture state for one media slot — the device file URI before, the Cloudinary URL after upload. */
export interface CapturedMedia {
  localUri: string;
  uploading: boolean;
  remoteUrl: string | null;
}

export type EmergencyPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type EmergencyStatus = 'Pending' | 'Offered' | 'Assigned' | 'VICTIM_PICKED' | 'Resolved';

/** Mirrors backend/controllers/emergencyController.js's response shape (citizen-relevant fields only). */
export interface Emergency {
  id: string;
  latitude: number;
  longitude: number;
  description: string;
  priority: EmergencyPriority;
  status: EmergencyStatus;
  assigned_ambulance: string | null;
  photo_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  report_source: 'admin' | 'citizen';
  created_at: string;
}

export interface CreateEmergencyPayload {
  latitude: number;
  longitude: number;
  priority: EmergencyPriority;
  description: string;
  photo_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  report_source: 'citizen';
  ignoreDuplicate?: boolean;
}

/** Minimal shape read off dispatch:assigned's `ambulance` payload — see backend/database/db.js. */
export interface AssignedAmbulance {
  id: string;
  name: string;
  vehicle_number: string;
}
