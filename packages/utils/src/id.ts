import { randomUUID } from "node:crypto";
import { customAlphabet, nanoid } from "nanoid";

/** RFC 4122 UUID, for primary keys in `uuid`-typed database columns. */
export function generateUuid(): string {
  return randomUUID();
}

/** Generic unique identifier — not tied to any domain concept. */
export function generateId(): string {
  return nanoid();
}

/** Short identifier suitable for correlating a single request's log lines. */
export function generateRequestId(): string {
  return nanoid(16);
}

const NUMERIC_ALPHABET = "0123456789";

/** Generic fixed-length numeric code generator (e.g. for OTP-style codes). */
export function generateNumericCode(length: number): string {
  return customAlphabet(NUMERIC_ALPHABET, length)();
}
