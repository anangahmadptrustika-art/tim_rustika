'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

/**
 * Subscribe to realtime events for the authenticated user. The server places
 * each socket into `user:<id>` and `department:<id>` rooms after handshake.
 */
export function useSocket(userId?: string, onEvent?: (event: string, payload: unknown) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;
    const socket = io({ path: '/api/socket', auth: { userId } });
    socketRef.current = socket;

    const handlers = ['notification:new', 'task:completed', 'leaderboard:update'];
    handlers.forEach((evt) => socket.on(evt, (payload) => onEvent?.(evt, payload)));

    return () => {
      socket.disconnect();
    };
  }, [userId, onEvent]);

  return socketRef;
}
