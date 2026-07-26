import type { Context } from "hono";

/**
 * Best-effort client IP extraction. Trusts `x-forwarded-for` (first
 * entry) since no reverse proxy/load balancer is configured yet in
 * this environment -- revisit once one is (a proxy-set header should
 * be the only trusted source, not anything a client can set itself).
 */
export function getClientIp(c: Context): string {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
