import { err, ok, type Result } from "@bluemoon/utils";

/**
 * Credential (authSecret) validation rules -- see
 * docs/security/Authentication.md. A numeric secret, not a
 * traditional password: 4-8 digits, hashed with Argon2id
 * (packages/database schema calls this "credential_hash"; hashing
 * itself lives in infrastructure, not the domain).
 */
export const CREDENTIAL_MIN_LENGTH = 4;
export const CREDENTIAL_MAX_LENGTH = 8;
const CREDENTIAL_PATTERN = /^[0-9]+$/;

export type CredentialValidationError =
  | { kind: "too_short"; minLength: number }
  | { kind: "too_long"; maxLength: number }
  | { kind: "not_numeric" }
  | { kind: "trivial" };

const TRIVIAL_CREDENTIALS = new Set([
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1234",
  "4321",
  "12345",
  "54321",
  "123456",
  "654321",
]);

/**
 * A validated raw credential value, held only long enough to be
 * hashed by infrastructure. Never logged, never persisted as-is.
 */
export class Credential {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<Credential, CredentialValidationError> {
    if (raw.length < CREDENTIAL_MIN_LENGTH) {
      return err({ kind: "too_short", minLength: CREDENTIAL_MIN_LENGTH });
    }
    if (raw.length > CREDENTIAL_MAX_LENGTH) {
      return err({ kind: "too_long", maxLength: CREDENTIAL_MAX_LENGTH });
    }
    if (!CREDENTIAL_PATTERN.test(raw)) {
      return err({ kind: "not_numeric" });
    }
    if (TRIVIAL_CREDENTIALS.has(raw)) {
      return err({ kind: "trivial" });
    }

    return ok(new Credential(raw));
  }

  /** Exposes the raw value only for hashing -- never for storage or logging. */
  reveal(): string {
    return this.value;
  }
}

export function formatCredentialValidationError(
  error: CredentialValidationError,
): string {
  switch (error.kind) {
    case "too_short":
      return `Credential must be at least ${error.minLength} digits`;
    case "too_long":
      return `Credential must be at most ${error.maxLength} digits`;
    case "not_numeric":
      return "Credential must contain only digits";
    case "trivial":
      return "Credential is too easy to guess";
  }
}
