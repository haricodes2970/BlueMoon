import type { OpenAPIHono } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import { createSocialControllers } from "../../controllers/social/friendships.controller.js";
import type { SocialContainer } from "../../social-container.js";
import { requireAuth } from "../../middleware/identity/require-auth.js";
import { rateLimit } from "../../middleware/identity/rate-limit.js";
import { createRateLimiter } from "../../infrastructure/identity/rate-limiter.js";
import type { AccessTokenService } from "../../infrastructure/identity/access-token.js";
import {
  consumeBlueMoonTokenRoute,
  generateBlueMoonTokenRoute,
  listFriendshipsRoute,
  removeFriendshipRoute,
} from "./friendships.routes.js";

export interface RegisterSocialRoutesOptions {
  container: SocialContainer;
  /** Reused from IdentityContainer -- Social defines no auth of its own. */
  accessTokens: AccessTokenService;
}

/**
 * Mounts every Social endpoint. Every route requires an existing
 * authenticated session (requireAuth, reused unmodified from
 * Identity) -- generating or consuming a BlueMoon Token never
 * authenticates or logs anyone in; it presupposes the caller already
 * has one. Rate limiting mirrors the Identity pattern (per-process,
 * see infrastructure/identity/rate-limiter.ts's documented
 * limitation): generation is capped like account creation, token
 * consumption is capped like login (the closest analog to
 * "guessing a secret").
 */
/**
 * `/social/friendships` serves both POST (consume -- guessing-
 * relevant, must be rate limited) and GET (list -- a normal
 * authenticated read). `app.use(path, mw)` in Hono matches every
 * method on that path, so the rate limiter is wrapped to only run for
 * POST -- otherwise every `GET /social/friendships` call would
 * consume a shared quota meant for token-consumption attempts.
 */
function onlyForMethod(
  method: string,
  middleware: MiddlewareHandler,
): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.method !== method) return next();
    return middleware(c, next);
  };
}

export function registerSocialRoutes(
  app: OpenAPIHono,
  options: RegisterSocialRoutesOptions,
): void {
  const { container, accessTokens } = options;
  const controllers = createSocialControllers({ container });

  const generateLimiter = createRateLimiter({
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  const consumeLimiter = createRateLimiter({
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  app.use("/social/blue-moon-tokens", requireAuth(accessTokens));
  app.use(
    "/social/blue-moon-tokens",
    rateLimit(generateLimiter, "blue-moon-token-generate"),
  );
  app.openapi(generateBlueMoonTokenRoute, controllers.generateBlueMoonToken);

  app.use("/social/friendships", requireAuth(accessTokens));
  app.use(
    "/social/friendships",
    onlyForMethod("POST", rateLimit(consumeLimiter, "blue-moon-token-consume")),
  );
  app.openapi(consumeBlueMoonTokenRoute, controllers.consumeBlueMoonToken);
  app.openapi(listFriendshipsRoute, controllers.listFriendships);

  app.use("/social/friendships/:id", requireAuth(accessTokens));
  app.openapi(removeFriendshipRoute, controllers.removeFriendship);
}
