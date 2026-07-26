import type { ErrorCode } from "@bluemoon/types";

/**
 * Base class for all typed application errors. Carries an ErrorCode and
 * HTTP status so the transport layer (apps/server controllers/middleware)
 * can map it to a response without string-matching messages.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, string[]>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super("TOO_MANY_REQUESTS", message, 429);
    this.name = "TooManyRequestsError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
