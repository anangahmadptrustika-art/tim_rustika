import type { Server as IOServer } from 'socket.io';

/**
 * Bridge between application services and the Socket.IO server instance that
 * lives in the custom server (server.js). The server registers its instance
 * here at boot so any service can emit without importing the server.
 */
let registered: IOServer | null = null;

export function registerIO(instance: IOServer) {
  registered = instance;
}

/**
 * Resolve the live Socket.IO server. In production the custom server
 * (server.js) attaches its instance to globalThis so the Next runtime — which
 * shares the same process — can emit without a circular import.
 */
function getIO(): IOServer | null {
  return registered ?? (globalThis as { __rustikaIO?: IOServer }).__rustikaIO ?? null;
}

/** Emit an event to a single user's private room. */
export function emitToUser(userId: string, event: string, payload: unknown) {
  getIO()?.to(`user:${userId}`).emit(event, payload);
}

/** Emit to a department room (managers + members). */
export function emitToDepartment(departmentId: string, event: string, payload: unknown) {
  getIO()?.to(`department:${departmentId}`).emit(event, payload);
}

/** Broadcast to all connected clients (e.g. leaderboard refresh). */
export function broadcast(event: string, payload: unknown) {
  getIO()?.emit(event, payload);
}
