import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import { and, desc, eq, gte } from "drizzle-orm";
import type { LoginAttempt } from "../../domain/identity/entities/login-attempt.js";

export interface RecordLoginAttemptInput {
  usernameAttempted: string;
  userId: string | null;
  ipAddress: string;
  succeeded: boolean;
  reason: string | null;
}

export interface LoginAttemptRepository {
  record(input: RecordLoginAttemptInput): Promise<LoginAttempt>;
  recentByUsername(
    usernameAttempted: string,
    since: Date,
  ): Promise<LoginAttempt[]>;
}

export function createLoginAttemptRepository(
  db: Database,
): LoginAttemptRepository {
  return {
    async record(input) {
      const [row] = await db
        .insert(schema.loginAttempts)
        .values({
          id: generateUuid(),
          usernameAttempted: input.usernameAttempted,
          userId: input.userId,
          ipAddress: input.ipAddress,
          succeeded: input.succeeded,
          reason: input.reason,
        })
        .returning();
      if (!row) throw new Error("Failed to record login attempt");
      return row;
    },

    async recentByUsername(usernameAttempted, since) {
      return db
        .select()
        .from(schema.loginAttempts)
        .where(
          and(
            eq(schema.loginAttempts.usernameAttempted, usernameAttempted),
            gte(schema.loginAttempts.createdAt, since),
          ),
        )
        .orderBy(desc(schema.loginAttempts.createdAt));
    },
  };
}
