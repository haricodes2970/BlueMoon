import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import { eq } from "drizzle-orm";
import type { RefreshToken } from "../../domain/identity/entities/session.js";

export interface CreateRefreshTokenInput {
  sessionId: string;
  tokenHash: string;
  expiresAt: Date;
  rotatedFromId: string | null;
}

export interface RefreshTokenRepository {
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  create(input: CreateRefreshTokenInput): Promise<RefreshToken>;
  revoke(id: string): Promise<void>;
  revokeBySession(sessionId: string): Promise<void>;
}

export function createRefreshTokenRepository(
  db: Database,
): RefreshTokenRepository {
  return {
    async findByHash(tokenHash) {
      const [row] = await db
        .select()
        .from(schema.refreshTokens)
        .where(eq(schema.refreshTokens.tokenHash, tokenHash))
        .limit(1);
      return row ?? null;
    },

    async create(input) {
      const [row] = await db
        .insert(schema.refreshTokens)
        .values({
          id: generateUuid(),
          sessionId: input.sessionId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          rotatedFromId: input.rotatedFromId,
        })
        .returning();
      if (!row) throw new Error("Failed to create refresh token");
      return row;
    },

    async revoke(id) {
      await db
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(schema.refreshTokens.id, id));
    },

    async revokeBySession(sessionId) {
      await db
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(schema.refreshTokens.sessionId, sessionId));
    },
  };
}
