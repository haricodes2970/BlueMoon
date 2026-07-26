import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import { and, eq, isNull } from "drizzle-orm";
import type { Session } from "../../domain/identity/entities/session.js";

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  create(input: {
    userId: string;
    deviceId: string;
    expiresAt: Date;
  }): Promise<Session>;
  touchLastActive(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export function createSessionRepository(db: Database): SessionRepository {
  return {
    async findById(id) {
      const [row] = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, id))
        .limit(1);
      return row ?? null;
    },

    async create(input) {
      const [row] = await db
        .insert(schema.sessions)
        .values({
          id: generateUuid(),
          userId: input.userId,
          deviceId: input.deviceId,
          expiresAt: input.expiresAt,
        })
        .returning();
      if (!row) throw new Error("Failed to create session");
      return row;
    },

    async touchLastActive(id) {
      await db
        .update(schema.sessions)
        .set({ lastActiveAt: new Date() })
        .where(eq(schema.sessions.id, id));
    },

    async revoke(id) {
      await db
        .update(schema.sessions)
        .set({ revokedAt: new Date() })
        .where(eq(schema.sessions.id, id));
    },

    async revokeAllForUser(userId) {
      await db
        .update(schema.sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.sessions.userId, userId),
            isNull(schema.sessions.revokedAt),
          ),
        );
    },
  };
}
