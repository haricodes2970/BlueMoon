import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { requestContext } from "./middleware/request-context.js";
import { errorHandler } from "./middleware/error-handler.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerAuthRoutes } from "./routes/identity/index.js";
import {
  createIdentityContainerFromDatabaseUrl,
  type IdentityContainer,
} from "./container.js";
import { createServerLogger } from "./logger.js";
import { appVersion } from "./version.js";
import type { ServerEnv } from "./env.js";

export interface CreateAppOptions {
  /** Overrides the container built from DATABASE_URL -- used by tests to inject fakes. */
  identityContainer?: IdentityContainer;
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

  const identityContainer =
    options.identityContainer ??
    (env.DATABASE_URL
      ? createIdentityContainerFromDatabaseUrl(
          env.DATABASE_URL,
          env.JWT_ACCESS_TOKEN_SECRET,
        )
      : null);

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

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { title: "BlueMoon API", version: appVersion },
  });
  app.get("/docs", swaggerUI({ url: "/openapi.json" }));

  return app;
}
