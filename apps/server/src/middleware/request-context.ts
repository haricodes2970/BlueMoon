import type { MiddlewareHandler } from "hono";
import { generateRequestId, withRequestId, type Logger } from "@bluemoon/utils";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    logger: Logger;
  }
}

/** Assigns a request ID (from x-request-id or generated) and a scoped logger to every request. */
export function requestContext(baseLogger: Logger): MiddlewareHandler {
  return async (c, next) => {
    const requestId = c.req.header("x-request-id") ?? generateRequestId();
    const logger = withRequestId(baseLogger, requestId);

    c.set("requestId", requestId);
    c.set("logger", logger);
    c.header("x-request-id", requestId);

    const start = Date.now();
    await next();

    logger.info(
      {
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Date.now() - start,
      },
      "request completed",
    );
  };
}
