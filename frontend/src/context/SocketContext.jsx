import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [ambulances, setAmbulances] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [connected, setConnected] = useState(false);
  const [mode, setModeState] = useState('simulation'); // 'simulation' | 'live'

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    });

    // Bulk state updates
    socketInstance.on('ambulances:list', (list) => {
      setAmbulances(list);
    });

    socketInstance.on('emergencies:list', (list) => {
      setEmergencies(list);
    });

    // Single item updates
    socketInstance.on('ambulance:created', (newAmb) => {
      setAmbulances((prev) => {
        if (prev.some(a => a.id === newAmb.id)) return prev;
        return [...prev, newAmb];
      });
    });

    socketInstance.on('ambulance:updated', (updatedAmb) => {
      setAmbulances((prev) =>
        prev.map((amb) => (amb.id === updatedAmb.id ? { ...amb, ...updatedAmb } : amb))
      );
    });

    socketInstance.on('ambulance:moved', (movedAmb) => {
      setAmbulances((prev) =>
        prev.map((amb) =>
          amb.id === movedAmb.id
            ? { ...amb, latitude: movedAmb.latitude, longitude: movedAmb.longitude, heading: movedAmb.heading, speed: movedAmb.speed }
            : amb
        )
      );
    });

    socketInstance.on('ambulance:statusChanged', ({ id, status }) => {
      setAmbulances((prev) =>
        prev.map((amb) => (amb.id === id ? { ...amb, status } : amb))
      );
    });

    socketInstance.on('emergency:created', (newEmergency) => {
      setEmergencies((prev) => {
        if (prev.some(e => e.id === newEmergency.id)) return prev;
        return [...prev, newEmergency];
      });
    });

    socketInstance.on('emergency:updated', (updatedEmergency) => {
      setEmergencies((prev) =>
        prev.map((emp) => (emp.id === updatedEmergency.id ? { ...emp, ...updatedEmergency } : emp))
      );
    });

    socketInstance.on('emergency:deleted', ({ id }) => {
      setEmergencies((prev) => prev.filter((emp) => emp.id !== id));
    });

    socketInstance.on('emergency:clearedAll', () => {
      setEmergencies([]);
    });

    // Simulation states
    socketInstance.on('simulation:state', ({ running }) => {
      setIsSimulating(running);
    });

    socketInstance.on('simulation:reset', () => {
      setIsSimulating(false);
    });

    // System mode (Simulation vs Live GPS), broadcast on connect and on change
    socketInstance.on('system:mode', ({ mode: newMode }) => {
      setModeState(newMode);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        ambulances,
        setAmbulances,
        emergencies,
        setEmergencies,
        isSimulating,
        setIsSimulating,
        connected,
        mode
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
