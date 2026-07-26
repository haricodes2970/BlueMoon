/**
 * Discriminated error codes, per coding-standards.md's error-handling
 * rule: typed/discriminated errors, not string-matched generic Errors.
 */
export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  /** Present only for VALIDATION_ERROR — per-field validation issues. */
  details?: Record<string, string[]>;
  /** Correlates this error with server-side logs. */
  requestId?: string;
}
