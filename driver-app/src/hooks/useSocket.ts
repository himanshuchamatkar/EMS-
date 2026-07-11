import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../socket/socketClient';

/**
 * Owns the Socket.IO connection lifecycle for one driver session: connects
 * and joins the `ambulance:<id>` room (via `driver:register`, see
 * backend/sockets/socketHandler.js) while `online` is true, disconnects
 * otherwise.
 */
export function useSocket(ambulanceId: string | null, online: boolean) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    if (!online || !ambulanceId) {
      socket.disconnect();
      setConnected(false);
      return;
    }

    const handleConnect = () => {
      setConnected(true);
      socket.emit('driver:register', { ambulance_id: ambulanceId });
    };
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.connect();
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [ambulanceId, online]);

  // Disconnect on final unmount (app teardown).
  useEffect(() => {
    const socket = socketRef.current;
    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
}
