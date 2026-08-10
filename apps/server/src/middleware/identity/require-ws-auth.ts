import type { MiddlewareHandler } from "hono";
import { UnauthorizedError } from "@bluemoon/utils";
import type { AccessTokenService } from "../../infrastructure/identity/access-token.js";

/**
 * Same contract as requireAuth, but reads the access token from the
 * `access_token` query-string parameter instead of the Authorization
 * header -- browsers cannot set custom headers during a native
 * WebSocket handshake. Ordinary Hono middleware, mounted immediately
 * before `upgradeWebSocket(...)` on the same route: a thrown
 * UnauthorizedError here is caught by the normal error handler before
 * the upgrade happens, so an unauthenticated client gets a rejected
 * handshake (HTTP error response), never an open, unauthenticated
 * socket. Never bypasses requireAuth's access-control decisions --
 * it verifies the identical access token via the identical
 * AccessTokenService.
 */
export function requireWsAuth(
  accessTokens: AccessTokenService,
): MiddlewareHandler {
  return async (c, next) => {
    const token = c.req.query("access_token");

    if (!token) {
      throw new UnauthorizedError("Missing access_token query parameter");
    }

    const payload = await accessTokens.verify(token);
    if (!payload) {
      throw new UnauthorizedError("Invalid or expired access token");
    }

    c.set("auth", payload);
    await next();
  };
}
