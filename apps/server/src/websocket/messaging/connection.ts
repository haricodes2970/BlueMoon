import type { Context } from "hono";
import type { WSEvents } from "hono/ws";
import { isAppError } from "@bluemoon/utils";
import type { MessagingContainer } from "../../messaging-container.js";
import { sendMessageEventSchema } from "../../validation/messaging/send-message.schema.js";

/**
 * WS transport only -- a second transport, not a second business
 * logic layer (see docs/architecture/Backend-Architecture.md). Every
 * inbound event is parsed/validated here and immediately delegated to
 * the same MessagingContainer use cases the HTTP controllers call;
 * this file contains no persistence, authorization, or broadcast
 * logic of its own. `c.get("auth")` comes from requireWsAuth, mounted
 * as ordinary middleware immediately before upgradeWebSocket(...) on
 * the same route -- by the time this factory runs, the connection is
 * already authenticated.
 */
export function createMessagingConnectionHandlers(
  container: MessagingContainer,
) {
  return (c: Context): WSEvents => {
    const auth = c.get("auth");

    return {
      onOpen(_evt, ws) {
        container.presence.connect(auth.userId, ws);
      },

      async onMessage(evt, ws) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(evt.data));
        } catch {
          ws.send(
            JSON.stringify({
              type: "error",
              data: { message: "Malformed JSON payload" },
            }),
          );
          return;
        }

        const result = sendMessageEventSchema.safeParse(parsed);
        if (!result.success) {
          ws.send(
            JSON.stringify({
              type: "error",
              data: { message: "Invalid send_message payload" },
            }),
          );
          return;
        }

        try {
          await container.sendMessage({
            senderId: auth.userId,
            conversationId: result.data.conversationId,
            content: result.data.content,
          });
        } catch (error) {
          // WS handlers aren't covered by middleware/error-handler.ts
          // (HTTP-only) -- typed application errors must be caught
          // and formatted here explicitly.
          const message = isAppError(error)
            ? error.message
            : "Failed to send message";
          ws.send(JSON.stringify({ type: "error", data: { message } }));
        }
      },

      onClose(_evt, ws) {
        container.presence.disconnect(auth.userId, ws);
      },
    };
  };
}
