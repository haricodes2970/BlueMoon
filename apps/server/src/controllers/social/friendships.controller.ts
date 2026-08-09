import type { RouteHandler } from "@hono/zod-openapi";
import { getClientIp } from "../../infrastructure/identity/client-ip.js";
import type { SocialContainer } from "../../social-container.js";
import type {
  consumeBlueMoonTokenRoute,
  generateBlueMoonTokenRoute,
  listFriendshipsRoute,
  removeFriendshipRoute,
} from "../../routes/social/friendships.routes.js";

export interface SocialControllerDeps {
  container: SocialContainer;
}

/**
 * Same shape as controllers/identity/auth.controller.ts: one handler
 * per endpoint, typed against its route definition, translating HTTP
 * to the untouched Social application-layer use cases. `c.get("auth")`
 * comes from Identity's requireAuth middleware, reused unmodified --
 * Social routes require an existing authenticated session but don't
 * define their own auth mechanism.
 */
export function createSocialControllers(deps: SocialControllerDeps) {
  const { container } = deps;

  const generateBlueMoonToken: RouteHandler<
    typeof generateBlueMoonTokenRoute
  > = async (c) => {
    const auth = c.get("auth");
    const ipAddress = getClientIp(c);

    const result = await container.generateBlueMoonToken({
      ownerId: auth.userId,
      ipAddress,
    });

    return c.json(
      {
        success: true as const,
        data: {
          token: result.token,
          expiresAt: result.expiresAt.toISOString(),
        },
      },
      201,
    );
  };

  const consumeBlueMoonToken: RouteHandler<
    typeof consumeBlueMoonTokenRoute
  > = async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");
    const ipAddress = getClientIp(c);

    const friendship = await container.consumeBlueMoonToken({
      ...body,
      consumingUserId: auth.userId,
      ipAddress,
    });

    return c.json(
      {
        success: true as const,
        data: {
          ...friendship,
          createdAt: friendship.createdAt.toISOString(),
        },
      },
      201,
    );
  };

  const listFriendships: RouteHandler<typeof listFriendshipsRoute> = async (
    c,
  ) => {
    const auth = c.get("auth");
    const friendships = await container.listFriendships({
      userId: auth.userId,
    });

    return c.json(
      {
        success: true as const,
        data: friendships.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
        })),
      },
      200,
    );
  };

  const removeFriendship: RouteHandler<typeof removeFriendshipRoute> = async (
    c,
  ) => {
    const auth = c.get("auth");
    const { id } = c.req.valid("param");
    const ipAddress = getClientIp(c);

    await container.removeFriendship({
      friendshipId: id,
      requestingUserId: auth.userId,
      ipAddress,
    });

    return c.json({ success: true as const, data: { ok: true as const } }, 200);
  };

  return {
    generateBlueMoonToken,
    consumeBlueMoonToken,
    listFriendships,
    removeFriendship,
  };
}
