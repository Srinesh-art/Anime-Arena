import { io, Socket } from 'socket.io-client';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export const socket: Socket = io(SERVER_URL, {
  auth: (callback) => callback({
    sessionToken: typeof window !== 'undefined' ? window.localStorage.getItem('anime_arena_session_token') : null
  }),
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
