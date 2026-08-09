import type { Database } from "@bluemoon/database";
import { createUserRepository } from "./repositories/identity/user.repository.js";
import { createBlueMoonTokenRepository } from "./repositories/social/blue-moon-token.repository.js";
import { createFriendshipRepository } from "./repositories/social/friendship.repository.js";
import { createSocialAuditWriter } from "./infrastructure/social/audit-writer.js";
import { createGenerateBlueMoonTokenUseCase } from "./services/social/generate-token.service.js";
import { createConsumeBlueMoonTokenUseCase } from "./services/social/consume-token.service.js";
import { createListFriendshipsUseCase } from "./services/social/list-friendships.service.js";
import { createRemoveFriendshipUseCase } from "./services/social/remove-friendship.service.js";

/**
 * Composition root for the Social bounded context -- same shape as
 * container.ts (Identity), kept as a separate file/container rather
 * than merged into IdentityContainer, matching ADR-0023's "separate
 * bounded context" precedent. Reuses Identity's UserRepository (the
 * existing User is authoritative; Social never creates its own user
 * concept) and takes the same shared `db` instance app.ts already
 * built for IdentityContainer -- no second connection pool.
 */
export interface SocialContainer {
  generateBlueMoonToken: ReturnType<typeof createGenerateBlueMoonTokenUseCase>;
  consumeBlueMoonToken: ReturnType<typeof createConsumeBlueMoonTokenUseCase>;
  listFriendships: ReturnType<typeof createListFriendshipsUseCase>;
  removeFriendship: ReturnType<typeof createRemoveFriendshipUseCase>;
}

export function createSocialContainer(db: Database): SocialContainer {
  const users = createUserRepository(db);
  const blueMoonTokens = createBlueMoonTokenRepository(db);
  const friendships = createFriendshipRepository(db);
  const audit = createSocialAuditWriter(db);

  return {
    generateBlueMoonToken: createGenerateBlueMoonTokenUseCase({
      blueMoonTokens,
      audit,
    }),
    consumeBlueMoonToken: createConsumeBlueMoonTokenUseCase({
      users,
      friendships,
      audit,
    }),
    listFriendships: createListFriendshipsUseCase({ friendships, users }),
    removeFriendship: createRemoveFriendshipUseCase({ friendships, audit }),
  };
}
