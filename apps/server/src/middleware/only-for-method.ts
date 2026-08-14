import type { MiddlewareHandler } from "hono";

/**
 * Hono's `app.use(path, mw)` matches every HTTP method on that path.
 * Some paths serve more than one method with different sensitivity
 * (e.g. `POST /x` guessing/creation-relevant, `GET /x` an ordinary
 * authenticated read) -- wrap a middleware so it only runs for the
 * one method it's actually meant to guard, instead of applying its
 * quota to every method sharing the path. First introduced for
 * `/social/friendships` (Milestone 0.9); reused wherever the same
 * shape recurs.
 */
export function onlyForMethod(
  method: string,
  middleware: MiddlewareHandler,
): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.method !== method) return next();
    return middleware(c, next);
  };
}
