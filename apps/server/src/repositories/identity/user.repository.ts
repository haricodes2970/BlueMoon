import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import { eq } from "drizzle-orm";
import type { User } from "../../domain/identity/entities/user.js";

export interface CreateUserInput {
  username: string;
  credentialHash: string;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  updateCredential(userId: string, credentialHash: string): Promise<void>;
  recordFailedLogin(
    userId: string,
    failedLoginCount: number,
    lockedUntil: Date | null,
  ): Promise<void>;
  resetFailedLogins(userId: string): Promise<void>;
}

export function createUserRepository(db: Database): UserRepository {
  return {
    async findById(id) {
      const [row] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
      return row ?? null;
    },

    async findByUsername(username) {
      const [row] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .limit(1);
      return row ?? null;
    },

    async create(input) {
      const [row] = await db
        .insert(schema.users)
        .values({
          id: generateUuid(),
          username: input.username,
          credentialHash: input.credentialHash,
        })
        .returning();
      if (!row) throw new Error("Failed to create user");
      return row;
    },

    async updateCredential(userId, credentialHash) {
      await db
        .update(schema.users)
        .set({
          credentialHash,
          credentialUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    },

    async recordFailedLogin(userId, failedLoginCount, lockedUntil) {
      await db
        .update(schema.users)
        .set({ failedLoginCount, lockedUntil, updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
    },

    async resetFailedLogins(userId) {
      await db
        .update(schema.users)
        .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
    },
  };
}
