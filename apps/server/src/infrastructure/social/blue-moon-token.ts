import { createHash, randomBytes } from "node:crypto";

/**
 * Deliberately separate from infrastructure/identity/refresh-token.ts
 * even though the pattern (32 random bytes, SHA-256 hash of the
 * lookup value) is the same -- a BlueMoon Token is not authentication
 * infrastructure and must not share a module with it (see
 * docs/security/Social.md). Same reasoning as the refresh token: this
 * is a high-entropy lookup key being redeemed once, not a low-entropy
 * secret being brute-forced offline, so a fast hash is correct.
 */
export function generateBlueMoonToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashBlueMoonToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
