import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import type { BlueMoonToken } from "../../domain/social/entities/blue-moon-token.js";

export interface CreateBlueMoonTokenInput {
  ownerId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface BlueMoonTokenRepository {
  create(input: CreateBlueMoonTokenInput): Promise<BlueMoonToken>;
}

/**
 * Deliberately minimal -- generation is the only operation this
 * repository owns. Consumption is inherently cross-table (it also
 * creates a friendship) and must be atomic across both, so it lives
 * on FriendshipRepository instead; see
 * friendship.repository.ts#consumeTokenAndCreateFriendship.
 */
export function createBlueMoonTokenRepository(
  db: Database,
): BlueMoonTokenRepository {
  return {
    async create(input) {
      const [row] = await db
        .insert(schema.blueMoonTokens)
        .values({
          id: generateUuid(),
          ownerId: input.ownerId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        })
        .returning();
      if (!row) throw new Error("Failed to create BlueMoon Token");
      return row;
    },
  };
}
