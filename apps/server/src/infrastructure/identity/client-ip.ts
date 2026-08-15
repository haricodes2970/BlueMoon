import type { Context } from "hono";

/**
 * Best-effort client IP extraction for rate limiting, assuming
 * exactly one trusted reverse proxy in front of this process
 * (Render's edge -- see docs/deployment/README.md). Each hop a
 * request passes through *appends* its own view of the client IP to
 * `x-forwarded-for`, so the entry closest to this server (the last
 * one) is the one the trusted proxy itself set; every earlier entry
 * is client-supplied and trivially spoofable. Taking the *first*
 * entry, as an earlier version of this function did, let any caller
 * defeat every per-IP rate limiter in this codebase simply by sending
 * a different `x-forwarded-for` value per request. If a second proxy
 * hop is ever introduced in front of Render's edge (e.g. a CDN),
 * this single-hop assumption needs revisiting.
 */
export function getClientIp(c: Context): string {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }
  return "unknown";
}
