import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../socket/socketClient';
import type { AssignedAmbulance, Emergency, EmergencyStatus } from '../types';

interface TrackingState {
  status: EmergencyStatus | null;
  assignedAmbulance: AssignedAmbulance | null;
}

/**
 * Tracks one emergency's live status over the same Socket.IO connection the
 * driver app and admin panel already use. Nothing here is citizen-specific
 * on the backend — `dispatch:assigned` / `emergency:updated` /
 * `dispatch:resolved` are existing global broadcasts (see
 * backend/controllers/dispatchController.js); this just connects and
 * filters client-side by emergency id, the same way driver-app filters
 * `dispatch:assigned` by ambulance id.
 */
export function useIncidentTracking(emergencyId: string | null) {
  const [state, setState] = useState<TrackingState>({ status: null, assignedAmbulance: null });
  const emergencyIdRef = useRef(emergencyId);
  emergencyIdRef.current = emergencyId;

  useEffect(() => {
    if (!emergencyId) {
      setState({ status: null, assignedAmbulance: null });
      return;
    }

    const socket = getSocket();

    const handleEmergencyUpdated = (emergency: Emergency) => {
      if (emergency.id !== emergencyIdRef.current) return;
      setState((s) => ({ ...s, status: emergency.status }));
    };

    const handleAssigned = ({ emergency, ambulance }: { emergency: Emergency; ambulance: AssignedAmbulance }) => {
      if (emergency.id !== emergencyIdRef.current) return;
      setState({ status: emergency.status, assignedAmbulance: ambulance });
    };

    const handleResolved = ({ emergency_id }: { emergency_id: string }) => {
      if (emergency_id !== emergencyIdRef.current) return;
      setState((s) => ({ ...s, status: 'Resolved' }));
    };

    const handleCancelled = ({ emergency_id }: { emergency_id: string }) => {
      if (emergency_id !== emergencyIdRef.current) return;
      setState({ status: null, assignedAmbulance: null });
    };

    socket.on('emergency:updated', handleEmergencyUpdated);
    socket.on('dispatch:assigned', handleAssigned);
    socket.on('dispatch:resolved', handleResolved);
    socket.on('dispatch:cancelled', handleCancelled);
    socket.connect();

    return () => {
      socket.off('emergency:updated', handleEmergencyUpdated);
      socket.off('dispatch:assigned', handleAssigned);
      socket.off('dispatch:resolved', handleResolved);
      socket.off('dispatch:cancelled', handleCancelled);
    };
  }, [emergencyId]);

  return state;
}
