import { createRoute, z, type OpenAPIHono } from "@hono/zod-openapi";
import { checkDatabaseConnection, createDatabase } from "@bluemoon/database";
import { ENVIRONMENTS } from "@bluemoon/types";
import type { HealthCheckResponse } from "@bluemoon/types";
import { appVersion } from "../version.js";
import type { ServerEnv } from "../env.js";

const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  version: z.string(),
  environment: z.enum(ENVIRONMENTS),
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  responses: {
    200: {
      content: { "application/json": { schema: healthResponseSchema } },
      description:
        "Service health, including database connectivity if configured",
    },
  },
});

export function registerHealthRoute(app: OpenAPIHono, env: ServerEnv): void {
  app.openapi(healthRoute, async (c) => {
    let status: HealthCheckResponse["status"] = "ok";

    if (env.DATABASE_URL) {
      const db = createDatabase(env.DATABASE_URL);
      const connected = await checkDatabaseConnection(db);
      if (!connected) status = "degraded";
    }

    const body: HealthCheckResponse = {
      status,
      version: appVersion,
      environment: env.NODE_ENV,
    };

    return c.json(body, 200);
  });
}
