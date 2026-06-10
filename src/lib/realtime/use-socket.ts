'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return globalSocket;
}

/**
 * Hook to subscribe to real-time events via Socket.IO
 * Usage:
 *   useSocket('deal:updated', (data) => { ... })
 *   useSocket('notification:new', (notif) => { ... })
 */
export function useSocket(event: string, callback: (data: any) => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const socket = getSocket();
    const handler = (data: any) => callbackRef.current(data);
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [event]);
}

/**
 * Hook that returns connection status
 */
export function useSocketStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    if (socket.connected) setConnected(true);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return connected;
}

/**
 * Join a deal-specific room for real-time collaboration
 */
export function useJoinDeal(dealId: string | null) {
  useEffect(() => {
    if (!dealId) return;
    const socket = getSocket();
    socket.emit('join:deal', dealId);
    return () => { socket.emit('leave:deal', dealId); };
  }, [dealId]);
}
