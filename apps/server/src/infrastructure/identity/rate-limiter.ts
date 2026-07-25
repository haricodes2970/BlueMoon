export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimiter {
  consume(key: string): RateLimitResult;
}

interface Bucket {
  count: number;
  windowStart: number;
}

/**
 * Fixed-window, single-process, in-memory rate limiter.
 *
 * KNOWN LIMITATION: not distributed. Each server instance tracks its
 * own counters, so a multi-instance deployment effectively multiplies
 * the limit by instance count. Fine for a single process; must move
 * to a shared store (e.g. Redis) before horizontal scaling -- see
 * docs/security/Authentication.md Rate Limiting section and TODO.md.
 * Buckets are never proactively swept, only replaced when their
 * window elapses, so long-lived processes with many distinct keys
 * will grow this map -- acceptable for now given the same scaling
 * caveat, not fixed here.
 */
export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
}): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    consume(key) {
      const now = Date.now();
      const existing = buckets.get(key);

      if (!existing || now - existing.windowStart >= options.windowMs) {
        buckets.set(key, { count: 1, windowStart: now });
        return {
          allowed: true,
          remaining: options.limit - 1,
          resetAt: new Date(now + options.windowMs),
        };
      }

      if (existing.count >= options.limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(existing.windowStart + options.windowMs),
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: options.limit - existing.count,
        resetAt: new Date(existing.windowStart + options.windowMs),
      };
    },
  };
}
