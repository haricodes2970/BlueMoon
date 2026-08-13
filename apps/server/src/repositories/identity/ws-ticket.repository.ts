import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { WsTicket } from "../../domain/identity/entities/ws-ticket.js";

export interface CreateWsTicketInput {
  sessionId: string;
  userId: string;
  deviceId: string;
  ticketHash: string;
  expiresAt: Date;
}

export interface WsTicketRepository {
  create(input: CreateWsTicketInput): Promise<WsTicket>;
  /**
   * Atomic conditional consume (`WHERE consumed_at IS NULL AND
   * expires_at > now`) -- returns the consumed row if this call won,
   * or `null` if the ticket was invalid, expired, or already consumed
   * (including by a concurrent caller that won the race). Same
   * exactly-once-consumption shape as
   * FriendshipRepository#consumeTokenAndCreateFriendship.
   */
  consume(ticketHash: string, now: Date): Promise<WsTicket | null>;
}

export function createWsTicketRepository(db: Database): WsTicketRepository {
  return {
    async create(input) {
      const [row] = await db
        .insert(schema.wsTickets)
        .values({
          id: generateUuid(),
          sessionId: input.sessionId,
          userId: input.userId,
          deviceId: input.deviceId,
          ticketHash: input.ticketHash,
          expiresAt: input.expiresAt,
        })
        .returning();
      if (!row) throw new Error("Failed to create WS ticket");
      return row;
    },

    async consume(ticketHash, now) {
      const [row] = await db
        .update(schema.wsTickets)
        .set({ consumedAt: now })
        .where(
          and(
            eq(schema.wsTickets.ticketHash, ticketHash),
            isNull(schema.wsTickets.consumedAt),
            gt(schema.wsTickets.expiresAt, now),
          ),
        )
        .returning();
      return row ?? null;
    },
  };
}
