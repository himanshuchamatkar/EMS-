import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/config';

let socket: Socket | null = null;

/** Singleton Socket.IO connection — created lazily, never auto-connects. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
