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
import { createMessagingConnectionHandlers } from "./websocket/messaging/connection.js";
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
  app.use("*", cors({ origin: env.WEB_ORIGIN }));
  app.onError(errorHandler);

  registerHealthRoute(app, env);

  // Identity and Social share one Drizzle client/connection pool when
  // built from DATABASE_URL -- built at most once here, never per
  // container, so mounting both domains doesn't double the pool.
  const db =
    options.identityContainer || !env.DATABASE_URL
      ? null
      : createDatabase(env.DATABASE_URL);

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
    // ADR-0030. This only registers the Hono-side upgrade handler;
    // actually wiring the underlying node HTTP server's 'upgrade'
    // event happens in index.ts's serve({websocket: {server: wss}})
    // call.
    app.get(
      "/messaging/ws",
      requireWsAuth(identityContainer.wsTickets),
      upgradeWebSocket(createMessagingConnectionHandlers(messagingContainer)),
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
