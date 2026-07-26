import type { MiddlewareHandler } from "hono";
import { UnauthorizedError } from "@bluemoon/utils";
import type { AccessTokenService } from "../../infrastructure/identity/access-token.js";

export interface AuthContext {
  userId: string;
  sessionId: string;
  deviceId: string;
}

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

/**
 * Verifies the `Authorization: Bearer <access token>` header and sets
 * `c.get("auth")` for downstream handlers. Rejects with the same
 * generic UnauthorizedError for "missing", "malformed", and
 * "invalid/expired" -- no need to distinguish those to a caller.
 */
export function requireAuth(
  accessTokens: AccessTokenService,
): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header("authorization");
    const token = header?.startsWith("Bearer ")
      ? header.slice("Bearer ".length)
      : null;

    if (!token) {
      throw new UnauthorizedError("Missing or malformed Authorization header");
    }

    const payload = await accessTokens.verify(token);
    if (!payload) {
      throw new UnauthorizedError("Invalid or expired access token");
    }

    c.set("auth", payload);
    await next();
  };
}
