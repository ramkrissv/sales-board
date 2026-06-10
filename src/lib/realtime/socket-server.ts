/**
 * Socket.IO Server — Real-time event bus for Galent SalesPilot
 *
 * Events emitted:
 *   deal:updated     — when any deal field changes
 *   deal:stage_change — when deal moves between stages
 *   deal:won / deal:lost — celebrations & alerts
 *   notification:new — new notification created
 *   activity:new     — new activity logged
 *   sync:status      — CRM sync progress updates
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
    });

    // Join deal-specific room for deal collaboration
    socket.on('join:deal', (dealId: string) => {
      socket.join(`deal:${dealId}`);
    });

    socket.on('leave:deal', (dealId: string) => {
      socket.leave(`deal:${dealId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.IO] Server initialized');
  return io;
}

// ── Emit helpers (called from tRPC routers & sync engine) ──

export function emitDealUpdate(dealId: string, data: any) {
  io?.to(`deal:${dealId}`).emit('deal:updated', { dealId, ...data });
  io?.emit('deal:updated', { dealId, ...data }); // broadcast for pipeline views
}

export function emitStageChange(dealId: string, fromStage: string, toStage: string, customerName: string) {
  const payload = { dealId, fromStage, toStage, customerName, timestamp: new Date().toISOString() };
  io?.emit('deal:stage_change', payload);

  if (toStage === 'Won') io?.emit('deal:won', payload);
  if (toStage === 'Lost') io?.emit('deal:lost', payload);
}

export function emitNotification(userId: string, notification: any) {
  io?.to(`user:${userId}`).emit('notification:new', notification);
  io?.emit('notification:new', notification); // fallback broadcast
}

export function emitActivity(activity: any) {
  io?.emit('activity:new', activity);
}

export function emitSyncStatus(integrationId: string, status: any) {
  io?.emit('sync:status', { integrationId, ...status });
}
