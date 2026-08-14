import type { OpenAPIHono } from "@hono/zod-openapi";
import { createMessagingControllers } from "../../controllers/messaging/conversations.controller.js";
import type { MessagingContainer } from "../../messaging-container.js";
import { requireAuth } from "../../middleware/identity/require-auth.js";
import { rateLimit } from "../../middleware/identity/rate-limit.js";
import { onlyForMethod } from "../../middleware/only-for-method.js";
import { createRateLimiter } from "../../infrastructure/identity/rate-limiter.js";
import type { AccessTokenService } from "../../infrastructure/identity/access-token.js";
import {
  getOrCreateConversationRoute,
  listConversationsRoute,
  listMessagesRoute,
} from "./conversations.routes.js";

export interface RegisterMessagingRoutesOptions {
  container: MessagingContainer;
  /** Reused from IdentityContainer -- Messaging defines no auth of its own. */
  accessTokens: AccessTokenService;
}

/**
 * Mounts every Messaging HTTP endpoint. All require an existing
 * authenticated session (requireAuth, reused unmodified from
 * Identity). No send-message endpoint here -- that only exists on the
 * authenticated WebSocket transport (see websocket/messaging), HTTP is
 * reads plus conversation creation only. Conversation creation is rate
 * limited (like Social's BlueMoon Token generation); listing/history
 * reads are not, same reasoning as Social's list endpoint.
 */
export function registerMessagingRoutes(
  app: OpenAPIHono,
  options: RegisterMessagingRoutesOptions,
): void {
  const { container, accessTokens } = options;
  const controllers = createMessagingControllers({ container });

  const createConversationLimiter = createRateLimiter({
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });

  app.use("/messaging/conversations", requireAuth(accessTokens));
  app.use(
    "/messaging/conversations",
    onlyForMethod(
      "POST",
      rateLimit(createConversationLimiter, "conversation-create"),
    ),
  );
  app.openapi(
    getOrCreateConversationRoute,
    controllers.getOrCreateConversation,
  );
  app.openapi(listConversationsRoute, controllers.listConversations);

  app.use("/messaging/conversations/:id/messages", requireAuth(accessTokens));
  app.openapi(listMessagesRoute, controllers.listMessages);
}
