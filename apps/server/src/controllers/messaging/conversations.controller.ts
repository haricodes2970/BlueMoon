import type { RouteHandler } from "@hono/zod-openapi";
import type { MessagingContainer } from "../../messaging-container.js";
import type {
  getOrCreateConversationRoute,
  listConversationsRoute,
  listMessagesRoute,
} from "../../routes/messaging/conversations.routes.js";

export interface MessagingControllerDeps {
  container: MessagingContainer;
}

/**
 * Same shape as controllers/social/friendships.controller.ts: one
 * handler per endpoint, translating HTTP to the untouched Messaging
 * application-layer use cases. `c.get("auth")` comes from Identity's
 * requireAuth middleware, reused unmodified.
 */
export function createMessagingControllers(deps: MessagingControllerDeps) {
  const { container } = deps;

  const getOrCreateConversation: RouteHandler<
    typeof getOrCreateConversationRoute
  > = async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");

    const conversation = await container.getOrCreateConversation({
      requesterId: auth.userId,
      otherUserId: body.otherUserId,
    });

    return c.json(
      {
        success: true as const,
        data: {
          ...conversation,
          createdAt: conversation.createdAt.toISOString(),
        },
      },
      201,
    );
  };

  const listConversations: RouteHandler<typeof listConversationsRoute> = async (
    c,
  ) => {
    const auth = c.get("auth");
    const conversations = await container.listConversations({
      userId: auth.userId,
    });

    return c.json(
      {
        success: true as const,
        data: conversations.map((conversation) => ({
          ...conversation,
          createdAt: conversation.createdAt.toISOString(),
        })),
      },
      200,
    );
  };

  const listMessages: RouteHandler<typeof listMessagesRoute> = async (c) => {
    const auth = c.get("auth");
    const { id } = c.req.valid("param");
    const { limit, before } = c.req.valid("query");

    const messages = await container.listMessages({
      requesterId: auth.userId,
      conversationId: id,
      limit,
      before,
    });

    return c.json(
      {
        success: true as const,
        data: messages.map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
        })),
      },
      200,
    );
  };

  return { getOrCreateConversation, listConversations, listMessages };
}
