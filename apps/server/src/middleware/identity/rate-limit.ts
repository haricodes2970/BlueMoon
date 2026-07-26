import type { Context, MiddlewareHandler } from "hono";
import { TooManyRequestsError } from "@bluemoon/utils";
import type { RateLimiter } from "../../infrastructure/identity/rate-limiter.js";
import { getClientIp } from "../../infrastructure/identity/client-ip.js";

/**
 * Wraps an in-memory RateLimiter (see infrastructure/identity/rate-limiter.ts
 * for its documented single-process limitation) as Hono middleware.
 * `keyPrefix` namespaces the limiter's key space per route so
 * register/login/etc. don't share a counter.
 */
export function rateLimit(
  limiter: RateLimiter,
  keyPrefix: string,
): MiddlewareHandler {
  return async (c: Context, next) => {
    const key = `${keyPrefix}:${getClientIp(c)}`;
    const result = limiter.consume(key);

    if (!result.allowed) {
      throw new TooManyRequestsError(
        `Too many requests -- try again after ${result.resetAt.toISOString()}`,
      );
    }

    await next();
  };
}
