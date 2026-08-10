"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listConversations,
  listMessages,
  type MessageDto,
} from "@/lib/api-client";
import {
  useMessagingSocket,
  type InboundEvent,
} from "@/hooks/use-messaging-socket";
import { useAuthStore } from "@/store/auth-store";
import { MessageList } from "@/components/messaging/message-list";
import { MessageComposer } from "@/components/messaging/message-composer";
import { PresenceDot } from "@/components/messaging/presence-dot";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMessages(accessToken!, conversationId),
    enabled: !!accessToken,
  });

  // Reuses the sidebar's cached list (same query key) purely to read
  // this conversation's friend/presence info -- no separate
  // GET-single-conversation endpoint exists, and none is needed yet.
  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(accessToken!),
    enabled: !!accessToken,
  });
  const conversation = conversationsQuery.data?.find(
    (c) => c.id === conversationId,
  );

  const handleEvent = useCallback(
    (event: InboundEvent) => {
      if (event.type !== "message") return;
      if (event.data.conversationId !== conversationId) return;
      setSending(false);
      queryClient.setQueryData<MessageDto[]>(
        ["messages", conversationId],
        (existing) => {
          if (!existing) return [event.data];
          if (existing.some((m) => m.id === event.data.id)) return existing;
          return [event.data, ...existing];
        },
      );
    },
    [conversationId, queryClient],
  );

  const { connected, sendMessage } = useMessagingSocket(
    accessToken,
    handleEvent,
  );

  useEffect(() => {
    setSending(false);
  }, [conversationId]);

  function onSend(content: string) {
    setSending(true);
    sendMessage(conversationId, content);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border p-4">
        {conversation && <PresenceDot online={conversation.online} />}
        <h1 className="text-sm font-semibold">
          {conversation?.friend.username ?? "Conversation"}
        </h1>
      </header>

      {messagesQuery.isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      )}
      {messagesQuery.isError && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-red-600">
            Couldn&apos;t load this conversation.
          </p>
        </div>
      )}
      {messagesQuery.data?.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No messages yet -- say hello.
          </p>
        </div>
      )}
      {messagesQuery.data && messagesQuery.data.length > 0 && (
        <MessageList messages={messagesQuery.data} currentUserId={userId!} />
      )}

      <MessageComposer
        onSend={onSend}
        sending={sending}
        disabled={!connected}
      />
    </div>
  );
}
