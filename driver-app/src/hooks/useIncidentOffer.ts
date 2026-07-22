import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { Socket } from 'socket.io-client';
import { api } from '../services/api';
import type { Ambulance, DispatchOffer, Emergency } from '../types';

export type AssignmentMode = 'offer' | 'direct';

/**
 * Listens for the ways the backend can put an incident on this ambulance,
 * or take it away again:
 *
 *  - `dispatch:offer` (Live mode, "First Responder Wins") — targeted at this
 *    ambulance's socket room, see backend/services/dispatchEngine.js
 *    offerToAllCandidates. The same incident may be offered to several
 *    ambulances at once; not yet committed, driver must Accept
 *    (/dispatch/accept) or Reject (/dispatch/reject).
 *  - `incident:locked` — another ambulance won the race for the incident
 *    currently on screen. Closes the card and tells the driver why.
 *  - `dispatch:offer:exhausted` — the offer for the incident on screen is no
 *    longer live (e.g. this driver rejected it, or nobody was available).
 *    Closes the card silently.
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
  const offerRef = useRef<DispatchOffer | null>(null);

  useEffect(() => {
    offerRef.current = offer;
  }, [offer]);

  useEffect(() => {
    const handleOffer = (payload: DispatchOffer) => {
      setMode('offer');
      setOffer(payload);
    };
    const handleExhausted = ({ emergency_id }: { emergency_id: string }) => {
      setOffer((current) => (current?.emergency.id === emergency_id ? null : current));
    };
    const handleIncidentLocked = ({ emergency_id }: { emergency_id: string; assigned_ambulance?: string }) => {
      if (offerRef.current?.emergency.id !== emergency_id) return;
      setOffer(null);
      Alert.alert('Incident Unavailable', 'This incident has already been assigned to another ambulance.');
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
    socket.on('incident:locked', handleIncidentLocked);
    socket.on('dispatch:assigned', handleDirectAssigned);

    return () => {
      socket.off('dispatch:offer', handleOffer);
      socket.off('dispatch:offer:exhausted', handleExhausted);
      socket.off('incident:locked', handleIncidentLocked);
      socket.off('dispatch:assigned', handleDirectAssigned);
    };
  }, [socket, ambulanceId]);

  const accept = useCallback(async (): Promise<Emergency | null> => {
    if (!offer || !ambulanceId) return null;
    const emergencyId = offer.emergency.id;
    if (mode === 'offer') suppressAssignedEchoRef.current = emergencyId;
    setBusy(true);
    try {
      let updatedEmergency = offer.emergency;
      if (mode === 'offer') {
        const res = await api.acceptOffer(emergencyId, ambulanceId);
        updatedEmergency = res.emergency;
      }
      setOffer(null);
      return updatedEmergency;
    } catch (err) {
      if (mode === 'offer') suppressAssignedEchoRef.current = null;
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Accept assignment failed:', message);
      // Lost the race between opening the card and pressing Accept (backend
      // already locked it to another ambulance) — close the card and say so.
      if (mode === 'offer') {
        setOffer(null);
        Alert.alert('Incident Unavailable', message || 'This incident has already been assigned to another ambulance.');
      }
      return null;
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
