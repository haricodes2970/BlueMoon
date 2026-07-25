import { err, ok, type Result } from "@bluemoon/utils";

/**
 * Username validation rules -- see docs/security/Authentication.md for
 * the documented rationale behind each one.
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * ASCII-only for v1: avoids homoglyph/confusable-character
 * impersonation (e.g. Cyrillic "а" vs Latin "a") without needing a
 * Unicode confusables table. Revisit if internationalized usernames
 * become a real requirement -- track as a future decision, not
 * silently expanded.
 */
const RESERVED_USERNAMES = new Set([
  "admin",
  "root",
  "support",
  "help",
  "api",
  "bluemoon",
  "pinchat",
  "system",
  "moderator",
  "null",
  "undefined",
  "everyone",
  "here",
  "security",
  "staff",
]);

export type UsernameValidationError =
  | { kind: "too_short"; minLength: number }
  | { kind: "too_long"; maxLength: number }
  | { kind: "invalid_format" }
  | { kind: "reserved" };

/**
 * A validated, normalized (lowercase) username. Only obtainable via
 * `Username.create()` -- construction is the validation.
 */
export class Username {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<Username, UsernameValidationError> {
    const normalized = raw.trim().toLowerCase();

    if (normalized.length < USERNAME_MIN_LENGTH) {
      return err({ kind: "too_short", minLength: USERNAME_MIN_LENGTH });
    }
    if (normalized.length > USERNAME_MAX_LENGTH) {
      return err({ kind: "too_long", maxLength: USERNAME_MAX_LENGTH });
    }
    if (!USERNAME_PATTERN.test(normalized)) {
      return err({ kind: "invalid_format" });
    }
    if (RESERVED_USERNAMES.has(normalized)) {
      return err({ kind: "reserved" });
    }

    return ok(new Username(normalized));
  }

  toString(): string {
    return this.value;
  }
}

export function formatUsernameValidationError(
  error: UsernameValidationError,
): string {
  switch (error.kind) {
    case "too_short":
      return `Username must be at least ${error.minLength} characters`;
    case "too_long":
      return `Username must be at most ${error.maxLength} characters`;
    case "invalid_format":
      return "Username must start with a letter and contain only lowercase letters, digits, and underscores";
    case "reserved":
      return "Username is reserved";
  }
}
