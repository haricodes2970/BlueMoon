/**
 * Minimal shape a transport socket must satisfy to receive a
 * broadcast -- lets tests use a plain fake instead of a real `ws`
 * WebSocket.
 */
export interface WebSocketLike {
  send(data: string): void;
}

export interface PresenceRegistry {
  connect(userId: string, socket: WebSocketLike): void;
  disconnect(userId: string, socket: WebSocketLike): void;
  isOnline(userId: string): boolean;
  connectionsFor(userId: string): ReadonlySet<WebSocketLike>;
}

/**
 * Per-user (not per-conversation) connection tracking: one user may
 * have multiple open sockets (multiple tabs/devices); "online" means
 * at least one is open. In-memory and single-process, same documented
 * limitation as infrastructure/identity/rate-limiter.ts -- must move
 * to a shared store before horizontal scaling.
 */
export function createPresenceRegistry(): PresenceRegistry {
  const connections = new Map<string, Set<WebSocketLike>>();

  return {
    connect(userId, socket) {
      let sockets = connections.get(userId);
      if (!sockets) {
        sockets = new Set();
        connections.set(userId, sockets);
      }
      sockets.add(socket);
    },

    disconnect(userId, socket) {
      const sockets = connections.get(userId);
      if (!sockets) return;
      sockets.delete(socket);
      if (sockets.size === 0) {
        connections.delete(userId);
      }
    },

    isOnline(userId) {
      return connections.has(userId);
    },

    connectionsFor(userId) {
      return connections.get(userId) ?? new Set();
    },
  };
}
