export interface Conversation {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: Date;
}

/**
 * Storage order is canonical (lexicographically smaller id first) --
 * matches the `conversations_canonical_pair_order` check constraint,
 * so `(a, b)` and `(b, a)` are always the same row instead of two.
 * Same pattern as domain/social/entities/friendship.ts.
 */
export function canonicalizePair(
  userId1: string,
  userId2: string,
): [smaller: string, larger: string] {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

/** The other participant in a conversation, from `viewerId`'s perspective. */
export function otherParticipant(
  conversation: Pick<Conversation, "userAId" | "userBId">,
  viewerId: string,
): string {
  return conversation.userAId === viewerId
    ? conversation.userBId
    : conversation.userAId;
}

export function isParticipant(
  conversation: Pick<Conversation, "userAId" | "userBId">,
  userId: string,
): boolean {
  return conversation.userAId === userId || conversation.userBId === userId;
}
