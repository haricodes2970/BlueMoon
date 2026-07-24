import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { requestContext } from "./middleware/request-context.js";
import { errorHandler } from "./middleware/error-handler.js";
import { registerHealthRoute } from "./routes/health.js";
import { createServerLogger } from "./logger.js";
import { appVersion } from "./version.js";
import type { ServerEnv } from "./env.js";

export function createApp(env: ServerEnv): OpenAPIHono {
  const logger = createServerLogger(env);
  const app = new OpenAPIHono();

  app.use("*", requestContext(logger));
  app.onError(errorHandler);

  registerHealthRoute(app, env);

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: { title: "BlueMoon API", version: appVersion },
  });
  app.get("/docs", swaggerUI({ url: "/openapi.json" }));

  return app;
}
