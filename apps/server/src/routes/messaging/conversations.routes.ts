import { createRoute, z } from "@hono/zod-openapi";
import { getOrCreateConversationRequestSchema } from "../../validation/messaging/get-or-create-conversation.schema.js";
import { listMessagesQuerySchema } from "../../validation/messaging/list-messages.schema.js";

/**
 * Response schemas -- same convention as routes/social/friendships.routes.ts.
 * No HTTP send-message endpoint: writes go over the authenticated
 * WebSocket only (see websocket/messaging), HTTP serves reads and
 * conversation creation. `online` is presence read at request time,
 * not a persisted field.
 */
const friendUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
});

const conversationSchema = z.object({
  id: z.string().uuid(),
  friend: friendUserSchema,
  createdAt: z.string(),
  online: z.boolean(),
});

const conversationResultSchema = z.object({
  success: z.literal(true),
  data: conversationSchema,
});

const conversationListResultSchema = z.object({
  success: z.literal(true),
  data: z.array(conversationSchema),
});

const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid().nullable(),
  content: z.string(),
  createdAt: z.string(),
});

const messageListResultSchema = z.object({
  success: z.literal(true),
  data: z.array(messageSchema),
});

export const getOrCreateConversationRoute = createRoute({
  method: "post",
  path: "/messaging/conversations",
  request: {
    body: {
      content: {
        "application/json": { schema: getOrCreateConversationRequestSchema },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: conversationResultSchema } },
      description:
        "Conversation created (or the existing one returned) with an existing BlueMoon friend",
    },
  },
});

export const listConversationsRoute = createRoute({
  method: "get",
  path: "/messaging/conversations",
  responses: {
    200: {
      content: {
        "application/json": { schema: conversationListResultSchema },
      },
      description: "Every conversation for the current user",
    },
  },
});

export const listMessagesParamsSchema = z.object({
  id: z.string().uuid().openapi({ description: "Conversation ID" }),
});

export const listMessagesRoute = createRoute({
  method: "get",
  path: "/messaging/conversations/{id}/messages",
  request: {
    params: listMessagesParamsSchema,
    query: listMessagesQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: messageListResultSchema } },
      description: "Newest-first page of message history for the conversation",
    },
  },
});
