import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sessions } from "./sessions.js";

/**
 * A single-use, short-lived (30-second) credential that authenticates
 * exactly one WebSocket handshake -- never a general-purpose
 * authentication token. Issued over HTTPS by an already-authenticated
 * caller (see /auth/ws-ticket) precisely because the access token
 * itself must never travel in a WebSocket URL/query string (browsers
 * cannot set custom headers during a native WS handshake, so a
 * query-string mechanism is unavoidable -- the ticket is what's
 * disposable, not the access token). Only the hash is stored, same
 * reasoning as `refresh_tokens.token_hash`/`blue_moon_tokens.token_hash`:
 * a lookup key being redeemed once, not a password being brute-forced
 * offline. `userId`/`deviceId` are denormalized from the session (same
 * shape as the access token JWT's claims) so consumption never needs a
 * second join to authenticate the socket. See
 * docs/security/Messaging.md#websocket-authentication and
 * docs/adr/ADR-0030-websocket-ticket-authentication.md.
 */
export const wsTickets = pgTable(
  "ws_tickets",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    deviceId: uuid("device_id").notNull(),
    ticketHash: text("ticket_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ws_tickets_session_id_idx").on(table.sessionId),
    index("ws_tickets_expires_at_idx").on(table.expiresAt),
  ],
);
