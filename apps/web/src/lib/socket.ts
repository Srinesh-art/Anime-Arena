import { io, Socket } from 'socket.io-client';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

export interface SessionIdentity { playerId: string; sessionToken: string }

let currentSessionIdentity: SessionIdentity | null = null;
export const getSessionIdentity = () => currentSessionIdentity;

export const socket: Socket = io(SERVER_URL, {
  auth: (callback) => callback({
    sessionToken: typeof window !== 'undefined' ? window.localStorage.getItem('anime_arena_session_token') : null
  }),
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

// Register before connecting so the first server-issued identity cannot be missed.
socket.on('session:identity', (identity: SessionIdentity) => {
  currentSessionIdentity = identity;
  if (typeof window !== 'undefined') window.localStorage.setItem('anime_arena_session_token', identity.sessionToken);
});
socket.connect();
