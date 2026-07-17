import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../socket/socketClient';

/**
 * Connects to the shared Socket.IO server (same backend as the driver app
 * and admin panel) for as long as the calling component is mounted. Phase 1
 * only proves the connection works — there's no citizen-specific room/event
 * protocol yet (see backend/sockets/socketHandler.js for the driver
 * equivalent, `driver:register`); that arrives with emergency reporting.
 */
export function useSocketConnection() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.connect();
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
}
