import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import type { Ambulance, AmbulanceStatus, DriverIdentity } from '../types';
import { getDriverIdentity, saveDriverIdentity, clearDriverIdentity } from '../services/storage';
import { api } from '../services/api';
import { useSocket } from './useSocket';
import { useLocationTracking, type TrackedCoords } from './useLocationTracking';

interface DriverSessionValue {
  identity: DriverIdentity | null;
  loadingIdentity: boolean;
  online: boolean;
  setOnline: (online: boolean) => void;
  connected: boolean;
  socket: Socket;
  coords: TrackedCoords | null;
  locationError: string | null;
  ambulanceStatus: AmbulanceStatus | null;
  statusUpdating: boolean;
  setAmbulanceStatus: (status: AmbulanceStatus) => Promise<void>;
  login: (identity: DriverIdentity) => Promise<void>;
  logout: () => Promise<void>;
}

const DriverSessionContext = createContext<DriverSessionValue | null>(null);

/**
 * Root-level session: identifies this device (one ambulance, per the spec),
 * and owns the online/offline toggle that drives both the socket connection
 * and the GPS polling loop so they stay in lockstep regardless of which
 * screen is active.
 */
export function DriverSessionProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<DriverIdentity | null>(null);
  const [loadingIdentity, setLoadingIdentity] = useState(true);
  const [online, setOnline] = useState(false);
  const [ambulanceStatus, setAmbulanceStatusState] = useState<AmbulanceStatus | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getDriverIdentity();
      if (!cancelled) {
        setIdentity(stored);
        setLoadingIdentity(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ambulanceId = identity?.ambulanceId ?? null;
  const { socket, connected } = useSocket(ambulanceId, online);
  const { coords, permissionError } = useLocationTracking(ambulanceId, online);

  // Seed the current status once we know which ambulance this device is,
  // independent of the online/offline toggle so it's visible right after login.
  useEffect(() => {
    let cancelled = false;
    if (!ambulanceId) {
      setAmbulanceStatusState(null);
      return;
    }
    (async () => {
      try {
        const amb = await api.getAmbulanceById(ambulanceId);
        if (!cancelled) setAmbulanceStatusState(amb.status);
      } catch {
        // Non-fatal — the selector still works, it just starts unselected.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ambulanceId]);

  // Keep status in sync with any change made elsewhere (accept → Busy,
  // manual status changes, etc.) while connected.
  useEffect(() => {
    const handleUpdated = (amb: Ambulance) => {
      if (amb.id === ambulanceId) setAmbulanceStatusState(amb.status);
    };
    socket.on('ambulance:updated', handleUpdated);
    return () => {
      socket.off('ambulance:updated', handleUpdated);
    };
  }, [socket, ambulanceId]);

  const setAmbulanceStatus = async (status: AmbulanceStatus) => {
    if (!ambulanceId) return;
    setStatusUpdating(true);
    try {
      const updated = await api.updateAmbulanceStatus(ambulanceId, status);
      setAmbulanceStatusState(updated.status);
    } finally {
      setStatusUpdating(false);
    }
  };

  const login = async (next: DriverIdentity) => {
    await saveDriverIdentity(next);
    setIdentity(next);
  };

  const logout = async () => {
    setOnline(false);
    await clearDriverIdentity();
    setIdentity(null);
  };

  return (
    <DriverSessionContext.Provider
      value={{
        identity,
        loadingIdentity,
        online,
        setOnline,
        connected,
        socket,
        coords,
        locationError: permissionError,
        ambulanceStatus,
        statusUpdating,
        setAmbulanceStatus,
        login,
        logout,
      }}
    >
      {children}
    </DriverSessionContext.Provider>
  );
}

export function useDriverSession(): DriverSessionValue {
  const ctx = useContext(DriverSessionContext);
  if (!ctx) {
    throw new Error('useDriverSession must be used within a DriverSessionProvider');
  }
  return ctx;
}
