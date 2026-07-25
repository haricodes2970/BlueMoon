import { createHash, randomBytes } from "node:crypto";

/**
 * Opaque refresh tokens: a random value handed to the client, only
 * its SHA-256 hash stored server-side. Unlike the credential (Argon2id,
 * deliberately slow), this is a lookup key, not a secret to be
 * brute-forced offline -- a fast hash is correct here.
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
