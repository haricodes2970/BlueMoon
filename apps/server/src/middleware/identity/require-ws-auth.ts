import type { MiddlewareHandler } from "hono";
import { UnauthorizedError } from "@bluemoon/utils";
import { hashWsTicket } from "../../infrastructure/identity/ws-ticket.js";
import type { WsTicketRepository } from "../../repositories/identity/ws-ticket.repository.js";

/**
 * Same contract as requireAuth, but authenticates the WS handshake via
 * a short-lived, single-use ticket (`?ticket=`) instead of the
 * long-lived access token -- browsers cannot set custom headers during
 * a native WebSocket handshake, so *something* has to travel in the
 * URL; a ticket that is atomically consumed on first use and expires
 * in seconds bounds the exposure a long-lived bearer credential would
 * not. Ordinary Hono middleware, mounted immediately before
 * `upgradeWebSocket(...)` on the same route: a thrown
 * UnauthorizedError here is caught by the normal error handler before
 * the upgrade happens, so an unauthenticated client gets a rejected
 * handshake (HTTP error response), never an open, unauthenticated
 * socket. See docs/security/Messaging.md#websocket-authentication and
 * ADR-0030.
 */
export function requireWsAuth(
  wsTickets: WsTicketRepository,
): MiddlewareHandler {
  return async (c, next) => {
    const ticket = c.req.query("ticket");

    if (!ticket) {
      throw new UnauthorizedError("Missing ticket query parameter");
    }

    const consumed = await wsTickets.consume(hashWsTicket(ticket), new Date());
    if (!consumed) {
      throw new UnauthorizedError("Invalid, expired, or already-used ticket");
    }

    c.set("auth", {
      userId: consumed.userId,
      sessionId: consumed.sessionId,
      deviceId: consumed.deviceId,
    });
    await next();
  };
}
