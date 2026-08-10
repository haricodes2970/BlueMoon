import type { PresenceRegistry } from "./presence-registry.js";

export interface OutboundEvent {
  type: string;
  data: unknown;
}

export interface MessageBroadcaster {
  /** Best-effort push to every connection this user currently has open. */
  sendToUser(userId: string, event: OutboundEvent): void;
}

/**
 * Deliberately event-shape-agnostic: it knows nothing about
 * "message" or "presence" event payloads, only how to fan out an
 * envelope to a user's sockets. Callers (services/websocket handlers)
 * decide what to send and to whom. Never throws -- a dead/broken
 * socket must not fail the caller, since persistence (the actual
 * source of truth) has already happened by the time this runs.
 */
export function createMessageBroadcaster(
  presence: PresenceRegistry,
): MessageBroadcaster {
  return {
    sendToUser(userId, event) {
      const payload = JSON.stringify(event);
      for (const socket of presence.connectionsFor(userId)) {
        try {
          socket.send(payload);
        } catch {
          // Best-effort delivery; DB remains source of truth.
        }
      }
    },
  };
}
