import * as argon2 from "argon2";

/** Hashes a credential (never store plaintext). Argon2id per ADR-0024. */
export async function hashCredential(raw: string): Promise<string> {
  return argon2.hash(raw, { type: argon2.argon2id });
}

/** Never throws on a bad hash/mismatch -- returns false instead. */
export async function verifyCredential(
  hash: string,
  raw: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, raw);
  } catch {
    return false;
  }
}
