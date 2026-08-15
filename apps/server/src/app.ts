import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { upgradeWebSocket } from "@hono/node-server";
import { createDatabase } from "@bluemoon/database";
import { requestContext } from "./middleware/request-context.js";
import { errorHandler } from "./middleware/error-handler.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerAuthRoutes } from "./routes/identity/index.js";
import { registerSocialRoutes } from "./routes/social/index.js";
import { registerMessagingRoutes } from "./routes/messaging/index.js";
import {
  createIdentityContainer,
  type IdentityContainer,
} from "./container.js";
import {
  createSocialContainer,
  type SocialContainer,
} from "./social-container.js";
import {
  createMessagingContainer,
  type MessagingContainer,
} from "./messaging-container.js";
import { requireWsAuth } from "./middleware/identity/require-ws-auth.js";
import { validateWsOrigin } from "./middleware/validate-ws-origin.js";
import { createMessagingConnectionHandlers } from "./websocket/messaging/connection.js";
import { createRateLimiter } from "./infrastructure/identity/rate-limiter.js";
import { createServerLogger } from "./logger.js";
import { appVersion } from "./version.js";
import type { ServerEnv } from "./env.js";

export interface CreateAppOptions {
  /** Overrides the containers built from DATABASE_URL -- used by tests to inject fakes. */
  identityContainer?: IdentityContainer;
  socialContainer?: SocialContainer;
  messagingContainer?: MessagingContainer;
}

export function createApp(
  env: ServerEnv,
  options: CreateAppOptions = {},
): OpenAPIHono {
  const logger = createServerLogger(env);
  const app = new OpenAPIHono();

  app.use("*", requestContext(logger));
  // apps/web runs on a different origin (port 3000 in dev); browsers
  // enforce CORS on every fetch() call this API receives from it.
  // credentials: true is required for the browser to send/store the
  // bm_refresh cookie on a cross-origin fetch() -- without it, Set-
  // Cookie from a cross-origin response is silently ignored, which is
  // exactly what makes the refresh cookie unusable across apps/web and
  // apps/server's separate origins otherwise (see cookies.ts,
  // COOKIE_SAME_SITE in env.ts).
  app.use("*", cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.onError(errorHandler);

  // Identity, Social, and Messaging (plus the health check below) all
  // share this one Drizzle client/connection pool when built from
  // DATABASE_URL -- built at most once here, never per container or
  // per request, so mounting every domain and polling /health
  // repeatedly doesn't multiply the pool.
  const db =
    options.identityContainer || !env.DATABASE_URL
      ? null
      : createDatabase(env.DATABASE_URL);

  registerHealthRoute(app, env, db);

  const identityContainer =
    options.identityContainer ??
    (db ? createIdentityContainer(db, env.JWT_ACCESS_TOKEN_SECRET) : null);

  const socialContainer =
    options.socialContainer ?? (db ? createSocialContainer(db) : null);

  const messagingContainer =
    options.messagingContainer ?? (db ? createMessagingContainer(db) : null);

  if (identityContainer) {
    registerAuthRoutes(app, {
      container: identityContainer,
      isProduction: env.NODE_ENV === "production",
      cookieSameSite: env.COOKIE_SAME_SITE,
    });
  } else {
    logger.warn(
      "DATABASE_URL not set -- Identity routes (/auth/*) are not mounted",
    );
  }

  if (socialContainer && identityContainer) {
    registerSocialRoutes(app, {
      container: socialContainer,
      accessTokens: identityContainer.accessTokens,
    });
  } else if (!socialContainer) {
    logger.warn(
      "DATABASE_URL not set -- Social routes (/social/*) are not mounted",
    );
  }

  if (messagingContainer && identityContainer) {
    registerMessagingRoutes(app, {
      container: messagingContainer,
      accessTokens: identityContainer.accessTokens,
    });

    // Authenticated WebSocket transport for real-time message
    // delivery -- see websocket/messaging/connection.ts. Short-lived,
    // single-use ticket (requireWsAuth), not the long-lived access
    // token: browsers cannot set custom headers during a native WS
    // handshake, so a disposable ticket bounds URL exposure where a
    // bearer credential wouldn't. See
    // docs/security/Messaging.md#websocket-authentication and
    // ADR-0030. validateWsOrigin runs first as defense-in-depth
    // (rejects a mismatched, present Origin header before even
    // touching a ticket); a per-user limiter bounds send_message
    // volume once connected -- see websocket/messaging/connection.ts.
    // This only registers the Hono-side upgrade handler; actually
    // wiring the underlying node HTTP server's 'upgrade' event happens
    // in index.ts's serve({websocket: {server: wss}}) call.
    const sendMessageLimiter = createRateLimiter({
      limit: 20,
      windowMs: 10 * 1000,
    });
    app.get(
      "/messaging/ws",
      validateWsOrigin(env.WEB_ORIGIN),
      requireWsAuth(identityContainer.wsTickets),
      upgradeWebSocket(
        createMessagingConnectionHandlers(
          messagingContainer,
          sendMessageLimiter,
        ),
      ),
    );
  } else if (!messagingContainer) {
    logger.warn(
      "DATABASE_URL not set -- Messaging routes (/messaging/*) are not mounted",
    );
  }

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { title: "BlueMoon API", version: appVersion },
  });
  app.get("/docs", swaggerUI({ url: "/openapi.json" }));

  return app;
}
