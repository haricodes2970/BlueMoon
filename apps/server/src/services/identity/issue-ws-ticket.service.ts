import { WS_TICKET_TTL_MS } from "../../domain/identity/rules/session-lifetime.js";
import {
  generateWsTicket,
  hashWsTicket,
} from "../../infrastructure/identity/ws-ticket.js";
import type { WsTicketRepository } from "../../repositories/identity/ws-ticket.repository.js";

export interface IssueWsTicketDependencies {
  wsTickets: WsTicketRepository;
}

export interface IssueWsTicketInput {
  userId: string;
  sessionId: string;
  deviceId: string;
}

export interface IssueWsTicketResult {
  ticket: string;
  expiresAt: Date;
}

/**
 * Issued to an already-authenticated caller (requireAuth already ran)
 * over HTTPS -- never derivable from an unauthenticated request. The
 * raw ticket is returned exactly once here and never persisted; only
 * its hash is stored, consumed atomically by requireWsAuth on the WS
 * handshake. See docs/security/Messaging.md#websocket-authentication.
 */
export function createIssueWsTicketUseCase(deps: IssueWsTicketDependencies) {
  return async function issueWsTicket(
    input: IssueWsTicketInput,
  ): Promise<IssueWsTicketResult> {
    const ticket = generateWsTicket();
    const expiresAt = new Date(Date.now() + WS_TICKET_TTL_MS);

    await deps.wsTickets.create({
      sessionId: input.sessionId,
      userId: input.userId,
      deviceId: input.deviceId,
      ticketHash: hashWsTicket(ticket),
      expiresAt,
    });

    return { ticket, expiresAt };
  };
}
