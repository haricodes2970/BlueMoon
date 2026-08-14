export interface HeartbeatSocket {
  isAlive: boolean;
  ping(): void;
  terminate(): void;
}

/**
 * One sweep step, called on a fixed interval (see index.ts): any
 * socket that didn't answer the *previous* ping is terminated --
 * `terminate()` fires that socket's 'close' event, which the
 * messaging WS handler already uses to clean up presence
 * (websocket/messaging/connection.ts's onClose). Every surviving
 * socket is re-armed (isAlive reset to false, re-pinged) so next
 * sweep can tell whether *this* round's ping was answered. A
 * silently-dropped connection (network loss with no close frame,
 * common on mobile/flaky networks and behind some proxies) would
 * otherwise never fire 'close' and would linger in presence
 * indefinitely. Pure and socket-shape-agnostic so it's testable
 * without a real WebSocketServer or timers.
 */
export function sweepConnections(sockets: Iterable<HeartbeatSocket>): void {
  for (const socket of sockets) {
    if (!socket.isAlive) {
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}
