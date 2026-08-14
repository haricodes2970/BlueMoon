import type { MiddlewareHandler } from "hono";
import { UnauthorizedError } from "@bluemoon/utils";

/**
 * Defense-in-depth against cross-site WebSocket hijacking: rejects a
 * `/messaging/ws` upgrade whose `Origin` header is present but doesn't
 * match the configured frontend origin. A non-browser client (tests,
 * native apps) sends no `Origin` header at all and is let through --
 * the actual authentication boundary is the ticket
 * (`middleware/identity/require-ws-auth.ts`, mounted immediately
 * after this); this only stops a browser page loaded from an
 * unexpected origin from even attempting the handshake.
 */
export function validateWsOrigin(webOrigin: string): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header("origin");
    if (origin && origin !== webOrigin) {
      throw new UnauthorizedError("Origin not allowed");
    }
    await next();
  };
}
