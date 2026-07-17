import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import type { Emergency } from '../types';
import type { MockHospital } from '../data/mockHospitals';
import { api } from '../services/api';
import { useDriverSession } from './useDriverSession';

export type IncidentStage = 'toScene' | 'arrivedAtScene' | 'toHospital' | 'arrivedAtHospital' | 'handoverComplete';

interface ActiveIncidentValue {
  emergency: Emergency | null;
  stage: IncidentStage;
  sceneArrivedAt: number | null;
  hospitalArrivedAt: number | null;
  /** Chosen on the "Nearby Hospitals" list, once pickup is confirmed — see mockHospitals.ts. */
  selectedHospital: MockHospital | null;
  /** True once the driver taps "Start Navigation" on the Hospital Assigned screen. */
  hospitalNavigationStarted: boolean;
  /** Frozen at drop-off confirmation (accept → hand-off), for the "Handover Complete" summary. */
  handoverDurationMinutes: number | null;
  startIncident: (emergency: Emergency) => void;
  markArrivedAtScene: () => void;
  markArrivedAtHospital: () => void;
  confirmPickup: (ambulanceId: string) => Promise<boolean>;
  confirmDropoff: (ambulanceId: string) => Promise<boolean>;
  selectHospital: (hospital: MockHospital) => void;
  startHospitalNavigation: () => void;
  /** "Complete Incident" on the Handover Complete screen — clears all active-incident state. */
  completeIncident: () => void;
}

const ActiveIncidentContext = createContext<ActiveIncidentValue | null>(null);

/**
 * Tracks the one incident this ambulance is currently working, independent
 * of which tab is on screen — the live map now lives in the Map tab instead
 * of a modal stack route, so this can't be route params anymore. "Arrived at
 * scene/hospital" are purely local UI milestones; the backend only knows
 * Assigned / VICTIM_PICKED / Resolved (backend/controllers/dispatchController.js),
 * so only the pickup/drop-off confirmations actually call the API.
 */
export function ActiveIncidentProvider({ children }: { children: ReactNode }) {
  const { socket } = useDriverSession();
  const [emergency, setEmergency] = useState<Emergency | null>(null);
  const [stage, setStage] = useState<IncidentStage>('toScene');
  const [sceneArrivedAt, setSceneArrivedAt] = useState<number | null>(null);
  const [hospitalArrivedAt, setHospitalArrivedAt] = useState<number | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<MockHospital | null>(null);
  const [hospitalNavigationStarted, setHospitalNavigationStarted] = useState(false);
  const [handoverDurationMinutes, setHandoverDurationMinutes] = useState<number | null>(null);
  const incidentStartedAtRef = useRef<number | null>(null);
  const emergencyRef = useRef<Emergency | null>(null);

  useEffect(() => {
    emergencyRef.current = emergency;
  }, [emergency]);

  const reset = () => {
    setEmergency(null);
    setStage('toScene');
    setSceneArrivedAt(null);
    setHospitalArrivedAt(null);
    setSelectedHospital(null);
    setHospitalNavigationStarted(false);
    setHandoverDurationMinutes(null);
    incidentStartedAtRef.current = null;
  };

  // Previously (single full-screen NavigationScreen) there was no way to learn
  // dispatch had cancelled an in-progress assignment — see the driver-app
  // audit. Now that this state is global, one listener covers every screen.
  useEffect(() => {
    const handleCancelled = ({ emergency_id }: { emergency_id: string }) => {
      if (emergencyRef.current?.id !== emergency_id) return;
      reset();
      Alert.alert('Incident Cancelled', 'Dispatch has cancelled this assignment.');
    };
    socket.on('dispatch:cancelled', handleCancelled);
    return () => {
      socket.off('dispatch:cancelled', handleCancelled);
    };
  }, [socket]);

  const startIncident = useCallback((next: Emergency) => {
    setEmergency(next);
    setStage(next.status === 'VICTIM_PICKED' ? 'toHospital' : 'toScene');
    setSceneArrivedAt(null);
    setHospitalArrivedAt(null);
    setSelectedHospital(null);
    setHospitalNavigationStarted(false);
    setHandoverDurationMinutes(null);
    incidentStartedAtRef.current = Date.now();
  }, []);

  const selectHospital = useCallback((hospital: MockHospital) => {
    setSelectedHospital(hospital);
  }, []);

  const startHospitalNavigation = useCallback(() => {
    setHospitalNavigationStarted(true);
  }, []);

  const markArrivedAtScene = useCallback(() => {
    setStage('arrivedAtScene');
    setSceneArrivedAt(Date.now());
  }, []);

  const markArrivedAtHospital = useCallback(() => {
    setStage('arrivedAtHospital');
    setHospitalArrivedAt(Date.now());
  }, []);

  const confirmPickup = useCallback(async (ambulanceId: string): Promise<boolean> => {
    if (!emergency) return false;
    try {
      await api.pickupVictim(emergency.id, ambulanceId);
      setStage('toHospital');
      return true;
    } catch (err) {
      Alert.alert('Could not confirm pickup', err instanceof Error ? err.message : 'Please try again.');
      return false;
    }
  }, [emergency]);

  const confirmDropoff = useCallback(async (ambulanceId: string): Promise<boolean> => {
    if (!emergency) return false;
    try {
      await api.dropAtHospital(emergency.id, ambulanceId);
      const startedAt = incidentStartedAtRef.current;
      setHandoverDurationMinutes(startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : null);
      setStage('handoverComplete');
      return true;
    } catch (err) {
      Alert.alert('Could not confirm drop-off', err instanceof Error ? err.message : 'Please try again.');
      return false;
    }
  }, [emergency]);

  const completeIncident = useCallback(() => {
    reset();
  }, []);

  return (
    <ActiveIncidentContext.Provider
      value={{
        emergency,
        stage,
        sceneArrivedAt,
        hospitalArrivedAt,
        selectedHospital,
        hospitalNavigationStarted,
        handoverDurationMinutes,
        startIncident,
        markArrivedAtScene,
        markArrivedAtHospital,
        confirmPickup,
        confirmDropoff,
        selectHospital,
        startHospitalNavigation,
        completeIncident,
      }}
    >
      {children}
    </ActiveIncidentContext.Provider>
  );
}

export function useActiveIncident(): ActiveIncidentValue {
  const ctx = useContext(ActiveIncidentContext);
  if (!ctx) {
    throw new Error('useActiveIncident must be used within an ActiveIncidentProvider');
  }
  return ctx;
}
