import {
  generateBlueMoonToken,
  hashBlueMoonToken,
} from "../../infrastructure/social/blue-moon-token.js";
import type { SocialAuditWriter } from "../../infrastructure/social/audit-writer.js";
import { computeBlueMoonTokenExpiry } from "../../domain/social/rules/token-lifetime.js";
import type { BlueMoonTokenRepository } from "../../repositories/social/blue-moon-token.repository.js";
import type { GeneratedBlueMoonToken } from "./dto.js";

export interface GenerateBlueMoonTokenDependencies {
  blueMoonTokens: BlueMoonTokenRepository;
  audit: SocialAuditWriter;
  now?: () => Date;
}

export interface GenerateBlueMoonTokenInput {
  ownerId: string;
  ipAddress: string;
}

/**
 * `ownerId` always comes from the caller's authenticated session
 * (never a request body field) -- a user can only ever generate a
 * token for themselves, by construction. The raw token is returned
 * exactly once, here; only its hash is persisted
 * (BlueMoonTokenRepository.create).
 */
export function createGenerateBlueMoonTokenUseCase(
  deps: GenerateBlueMoonTokenDependencies,
) {
  const now = deps.now ?? (() => new Date());

  return async function generateBlueMoonTokenForOwner(
    input: GenerateBlueMoonTokenInput,
  ): Promise<GeneratedBlueMoonToken> {
    const rawToken = generateBlueMoonToken();
    const expiresAt = computeBlueMoonTokenExpiry(now());

    await deps.blueMoonTokens.create({
      ownerId: input.ownerId,
      tokenHash: hashBlueMoonToken(rawToken),
      expiresAt,
    });

    await deps.audit.record({
      type: "blue_moon_token_generated",
      userId: input.ownerId,
      ipAddress: input.ipAddress,
    });

    return { token: rawToken, expiresAt };
  };
}
