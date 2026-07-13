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
}

export interface DispatchOffer {
  emergency: Emergency;
  distance: number;
}

export interface DriverIdentity {
  ambulanceId: string;
  vehicleNumber: string;
}
