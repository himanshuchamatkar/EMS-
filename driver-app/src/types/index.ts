export type AmbulanceStatus = 'Available' | 'Busy' | 'Offline' | 'Maintenance';
export type EmergencyStatus = 'Pending' | 'Offered' | 'Assigned' | 'VICTIM_PICKED' | 'Resolved';
export type EmergencyPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Ambulance {
  id: string;
  name: string;
  vehicle_number: string;
  driver_name: string;
  latitude: number;
  longitude: number;
  status: AmbulanceStatus;
  speed: number;
  heading: number;
  accuracy?: number;
  created_at: string;
}

export interface Emergency {
  id: string;
  latitude: number;
  longitude: number;
  description: string;
  priority: EmergencyPriority;
  assigned_ambulance: string | null;
  status: EmergencyStatus;
  offered_to?: string[];
  picked_up_at?: string | null;
  dropped_at?: string | null;
  created_at: string;
  // Populated when reported through citizen-app (see backend/supabase/citizen_reports.sql
  // and backend/controllers/emergencyController.js) — absent/null for admin-created
  // incidents, which is most of the existing data.
  photo_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  report_source?: 'admin' | 'citizen';
  assigned_hospital_id?: string | null;
  assigned_hospital?: {
    hospital_id: string;
    hospital_name: string;
    latitude: number;
    longitude: number;
    phone: string;
    address: string;
    hospital_type?: string;
    facilities?: {
      emergency_beds: number;
    } | null;
  } | null;
}

export interface DispatchOffer {
  emergency: Emergency;
  distance: number;
}

export interface DriverIdentity {
  ambulanceId: string;
  vehicleNumber: string;
}
