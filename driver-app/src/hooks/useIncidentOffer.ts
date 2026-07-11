import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { api } from '../services/api';
import type { Ambulance, DispatchOffer, Emergency } from '../types';

export type AssignmentMode = 'offer' | 'direct';

/**
 * Listens for two distinct ways the backend can put an incident on this
 * ambulance:
 *
 *  - `dispatch:offer` (Live mode only) — targeted at this ambulance's socket
 *    room, see backend/services/dispatchEngine.js offerNearestAmbulance. Not
 *    yet committed; driver must Accept (/dispatch/accept) or Reject
 *    (/dispatch/reject).
 *  - `dispatch:assigned` (Simulation-mode auto-assign, or the admin panel's
 *    manual Assign/Reassign button, POST /dispatch/assign) — a global
 *    broadcast, already committed backend-side (ambulance already Busy,
 *    emergency already Assigned) by the time it reaches the client. Driver
 *    can only acknowledge (no API call needed) or decline via the existing
 *    /dispatch/cancel endpoint, which frees the ambulance again.
 *
 * `acceptOffer` itself also triggers a `dispatch:assigned` broadcast as
 * confirmation, so a ref suppresses that echo to avoid a second popup right
 * after the driver already accepted through the offer flow.
 */
export function useIncidentOffer(socket: Socket, ambulanceId: string | null) {
  const [offer, setOffer] = useState<DispatchOffer | null>(null);
  const [mode, setMode] = useState<AssignmentMode>('offer');
  const [busy, setBusy] = useState(false);
  const suppressAssignedEchoRef = useRef<string | null>(null);

  useEffect(() => {
    const handleOffer = (payload: DispatchOffer) => {
      setMode('offer');
      setOffer(payload);
    };
    const handleExhausted = ({ emergency_id }: { emergency_id: string }) => {
      setOffer((current) => (current?.emergency.id === emergency_id ? null : current));
    };
    const handleDirectAssigned = ({ emergency, ambulance }: { emergency: Emergency; ambulance: Ambulance }) => {
      if (!ambulanceId || ambulance?.id !== ambulanceId) return;
      if (suppressAssignedEchoRef.current === emergency.id) {
        suppressAssignedEchoRef.current = null;
        return;
      }
      setMode('direct');
      setOffer({ emergency, distance: 0 });
    };

    socket.on('dispatch:offer', handleOffer);
    socket.on('dispatch:offer:exhausted', handleExhausted);
    socket.on('dispatch:assigned', handleDirectAssigned);

    return () => {
      socket.off('dispatch:offer', handleOffer);
      socket.off('dispatch:offer:exhausted', handleExhausted);
      socket.off('dispatch:assigned', handleDirectAssigned);
    };
  }, [socket, ambulanceId]);

  const accept = useCallback(async (): Promise<boolean> => {
    if (!offer || !ambulanceId) return false;
    const emergencyId = offer.emergency.id;
    if (mode === 'offer') suppressAssignedEchoRef.current = emergencyId;
    setBusy(true);
    try {
      if (mode === 'offer') {
        await api.acceptOffer(emergencyId, ambulanceId);
      }
      // 'direct' assignments are already committed backend-side — nothing to call.
      setOffer(null);
      return true;
    } catch (err) {
      if (mode === 'offer') suppressAssignedEchoRef.current = null;
      console.warn('Accept assignment failed:', err instanceof Error ? err.message : err);
      return false;
    } finally {
      setBusy(false);
    }
  }, [offer, ambulanceId, mode]);

  const reject = useCallback(async (): Promise<void> => {
    if (!offer || !ambulanceId) return;
    setBusy(true);
    try {
      if (mode === 'offer') {
        await api.rejectOffer(offer.emergency.id, ambulanceId);
      } else {
        await api.cancelAssignment(offer.emergency.id);
      }
    } catch (err) {
      console.warn('Reject assignment failed:', err instanceof Error ? err.message : err);
    } finally {
      setOffer(null);
      setBusy(false);
    }
  }, [offer, ambulanceId, mode]);

  return { offer, mode, busy, accept, reject };
}
