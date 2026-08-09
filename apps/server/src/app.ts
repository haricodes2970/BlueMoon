import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { createDatabase } from "@bluemoon/database";
import { requestContext } from "./middleware/request-context.js";
import { errorHandler } from "./middleware/error-handler.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerAuthRoutes } from "./routes/identity/index.js";
import { registerSocialRoutes } from "./routes/social/index.js";
import {
  createIdentityContainer,
  type IdentityContainer,
} from "./container.js";
import {
  createSocialContainer,
  type SocialContainer,
} from "./social-container.js";
import { createServerLogger } from "./logger.js";
import { appVersion } from "./version.js";
import type { ServerEnv } from "./env.js";

export interface CreateAppOptions {
  /** Overrides the containers built from DATABASE_URL -- used by tests to inject fakes. */
  identityContainer?: IdentityContainer;
  socialContainer?: SocialContainer;
}

export function createApp(
  env: ServerEnv,
  options: CreateAppOptions = {},
): OpenAPIHono {
  const logger = createServerLogger(env);
  const app = new OpenAPIHono();

  app.use("*", requestContext(logger));
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

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { title: "BlueMoon API", version: appVersion },
  });
  app.get("/docs", swaggerUI({ url: "/openapi.json" }));

  return app;
}
