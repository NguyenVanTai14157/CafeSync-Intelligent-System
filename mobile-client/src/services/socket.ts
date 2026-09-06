import { io, type Socket } from 'socket.io-client';

import { API_URL } from '@/config/env';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      transports: ['polling', 'websocket'],
    });
  }

  return socket;
}
