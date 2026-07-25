import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sessions } from "./sessions.js";

/**
 * Opaque refresh tokens, rotated on every use. Only the hash is
 * stored -- never the raw token. `rotatedFromId` links the rotation
 * chain, enabling reuse detection (see
 * docs/security/Session-Management.md).
 */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    rotatedFromId: uuid("rotated_from_id"),
  },
  (table) => [
    index("refresh_tokens_session_id_idx").on(table.sessionId),
    index("refresh_tokens_rotated_from_id_idx").on(table.rotatedFromId),
  ],
);
