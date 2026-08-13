import { createHash, randomBytes } from "node:crypto";

/**
 * Deliberately separate from infrastructure/identity/refresh-token.ts
 * even though the pattern (32 random bytes, SHA-256 hash of the
 * lookup value) is the same -- a WS ticket is not a refresh token and
 * must not share a module with it, same reasoning as
 * infrastructure/social/blue-moon-token.ts. High-entropy lookup key
 * being redeemed once, not a low-entropy secret being brute-forced
 * offline, so a fast hash is correct.
 */
export function generateWsTicket(): string {
  return randomBytes(32).toString("base64url");
}

export function hashWsTicket(ticket: string): string {
  return createHash("sha256").update(ticket).digest("hex");
}
