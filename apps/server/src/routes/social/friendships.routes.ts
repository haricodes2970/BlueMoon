import { createRoute, z } from "@hono/zod-openapi";
import { consumeBlueMoonTokenRequestSchema } from "../../validation/social/consume-token.schema.js";

/**
 * Response schemas -- same convention as routes/identity/auth.routes.ts:
 * separate from request validation, every success wrapped in the
 * existing ApiResponse<T> envelope. The raw token only ever appears
 * in generateTokenResultSchema -- no schema anywhere exposes a token
 * hash.
 */
const generateTokenResultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    token: z.string(),
    expiresAt: z.string(),
  }),
});

const friendUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
});

const friendshipSchema = z.object({
  id: z.string().uuid(),
  friend: friendUserSchema,
  createdAt: z.string(),
});

const friendshipResultSchema = z.object({
  success: z.literal(true),
  data: friendshipSchema,
});

const friendshipListResultSchema = z.object({
  success: z.literal(true),
  data: z.array(friendshipSchema),
});

const okSchema = z.object({
  success: z.literal(true),
  data: z.object({ ok: z.literal(true) }),
});

export const generateBlueMoonTokenRoute = createRoute({
  method: "post",
  path: "/social/blue-moon-tokens",
  responses: {
    201: {
      content: { "application/json": { schema: generateTokenResultSchema } },
      description:
        "BlueMoon Token generated -- single use, expires in 300 seconds",
    },
  },
});

export const consumeBlueMoonTokenRoute = createRoute({
  method: "post",
  path: "/social/friendships",
  request: {
    body: {
      content: {
        "application/json": { schema: consumeBlueMoonTokenRequestSchema },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: friendshipResultSchema } },
      description:
        "Token consumed and friendship established (or already existed)",
    },
  },
});

export const listFriendshipsRoute = createRoute({
  method: "get",
  path: "/social/friendships",
  responses: {
    200: {
      content: { "application/json": { schema: friendshipListResultSchema } },
      description: "Every friendship for the current user",
    },
  },
});

export const removeFriendshipParamsSchema = z.object({
  id: z.string().uuid().openapi({ description: "Friendship ID" }),
});

export const removeFriendshipRoute = createRoute({
  method: "delete",
  path: "/social/friendships/{id}",
  request: {
    params: removeFriendshipParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Friendship removed",
    },
  },
});
