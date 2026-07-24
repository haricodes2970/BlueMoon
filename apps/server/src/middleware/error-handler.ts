import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import { isAppError } from "@bluemoon/utils";
import type { ApiErrorResponse } from "@bluemoon/types";

/**
 * Central error handler: maps ZodError (request validation) and
 * AppError subclasses to typed API error responses, and anything
 * else to a generic 500 -- unknown errors are logged, never leaked
 * to the client as raw messages.
 */
export const errorHandler: ErrorHandler = (error, c) => {
  const logger = c.get("logger");
  const requestId = c.get("requestId");

  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "(root)";
      details[key] = [...(details[key] ?? []), issue.message];
    }
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details,
        requestId,
      },
    };
    return c.json(body, 400);
  }

  if (isAppError(error)) {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    };
    return c.json(body, error.statusCode as ContentfulStatusCode);
  }

  logger?.error({ err: error }, "unhandled error");
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      requestId,
    },
  };
  return c.json(body, 500);
};
