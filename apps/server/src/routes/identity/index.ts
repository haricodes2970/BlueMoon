import type { OpenAPIHono } from "@hono/zod-openapi";
import { createAuthControllers } from "../../controllers/identity/auth.controller.js";
import type { IdentityContainer } from "../../container.js";
import { rateLimit } from "../../middleware/identity/rate-limit.js";
import { requireAuth } from "../../middleware/identity/require-auth.js";
import { createRateLimiter } from "../../infrastructure/identity/rate-limiter.js";
import {
  changeCredentialRoute,
  devicesRoute,
  loginRoute,
  logoutRoute,
  meRoute,
  refreshRoute,
  registerRoute,
  revokeDeviceTrustRoute,
  trustDeviceRoute,
  wsTicketRoute,
} from "./auth.routes.js";

export interface RegisterAuthRoutesOptions {
  container: IdentityContainer;
  isProduction: boolean;
}

/**
 * Mounts every Identity endpoint: rate limiting on the two
 * credential-guessing-relevant routes (register, login), auth
 * middleware on everything that requires an authenticated session,
 * then the route/controller pair itself. Limits are per-process (see
 * infrastructure/identity/rate-limiter.ts's documented limitation).
 */
export function registerAuthRoutes(
  app: OpenAPIHono,
  options: RegisterAuthRoutesOptions,
): void {
  const { container, isProduction } = options;
  const controllers = createAuthControllers({ container, isProduction });

  const registerLimiter = createRateLimiter({
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  const loginLimiter = createRateLimiter({
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  app.use("/auth/register", rateLimit(registerLimiter, "register"));
  app.openapi(registerRoute, controllers.register);

  app.use("/auth/login", rateLimit(loginLimiter, "login"));
  app.openapi(loginRoute, controllers.login);

  app.openapi(refreshRoute, controllers.refresh);

  app.use("/auth/logout", requireAuth(container.accessTokens));
  app.openapi(logoutRoute, controllers.logout);

  app.use("/auth/change-credential", requireAuth(container.accessTokens));
  app.openapi(changeCredentialRoute, controllers.changeCredential);

  app.use("/auth/trust-device", requireAuth(container.accessTokens));
  app.openapi(trustDeviceRoute, controllers.trustDevice);

  app.use("/auth/trust-device/:id", requireAuth(container.accessTokens));
  app.openapi(revokeDeviceTrustRoute, controllers.revokeDeviceTrust);

  app.use("/auth/me", requireAuth(container.accessTokens));
  app.openapi(meRoute, controllers.me);

  app.use("/auth/devices", requireAuth(container.accessTokens));
  app.openapi(devicesRoute, controllers.devices);

  app.use("/auth/ws-ticket", requireAuth(container.accessTokens));
  app.openapi(wsTicketRoute, controllers.wsTicket);
}
