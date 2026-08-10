"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOrCreateConversation,
  listConversations,
  listFriendships,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { PresenceDot } from "./presence-dot";

/**
 * Presence is read at request time (see
 * infrastructure/messaging/presence-registry.ts), not pushed --
 * refetching this list periodically is the simplest correct way to
 * keep online/offline roughly current without a presence event
 * protocol the backend doesn't have.
 */
const PRESENCE_REFRESH_MS = 5000;

export function ConversationSidebar({
  activeConversationId,
}: {
  activeConversationId?: string;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(accessToken!),
    enabled: !!accessToken,
    refetchInterval: PRESENCE_REFRESH_MS,
  });

  const friendshipsQuery = useQuery({
    queryKey: ["friendships"],
    queryFn: () => listFriendships(accessToken!),
    enabled: !!accessToken,
  });

  const conversedFriendIds = new Set(
    (conversationsQuery.data ?? []).map((c) => c.friend.id),
  );
  const friendsWithoutConversation = (friendshipsQuery.data ?? []).filter(
    (f) => !conversedFriendIds.has(f.friend.id),
  );

  async function startConversation(otherUserId: string) {
    const conversation = await getOrCreateConversation(
      accessToken!,
      otherUserId,
    );
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    router.push(`/chat/${conversation.id}`);
  }

  return (
    <aside className="flex h-full w-72 flex-col border-r border-border">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Conversations
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversationsQuery.isLoading && (
          <p className="p-4 text-sm text-muted-foreground">Loading...</p>
        )}
        {conversationsQuery.isError && (
          <p className="p-4 text-sm text-red-600">
            Couldn&apos;t load conversations.
          </p>
        )}
        {conversationsQuery.data?.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            No conversations yet -- message a friend below to start one.
          </p>
        )}
        <ul>
          {conversationsQuery.data?.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/chat/${conversation.id}`}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm hover:bg-accent",
                  conversation.id === activeConversationId && "bg-accent",
                )}
              >
                <PresenceDot online={conversation.online} />
                {conversation.friend.username}
              </Link>
            </li>
          ))}
        </ul>

        {friendsWithoutConversation.length > 0 && (
          <div className="border-t border-border p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Friends
            </h3>
            <ul className="flex flex-col gap-1">
              {friendsWithoutConversation.map((friendship) => (
                <li key={friendship.id}>
                  <button
                    type="button"
                    onClick={() => void startConversation(friendship.friend.id)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    Message {friendship.friend.username}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
