export interface Friendship {
  id: string;
  userAId: string;
  userBId: string;
  createdAt: Date;
}

/**
 * Storage order is canonical (lexicographically smaller id first) --
 * matches the `friendships_canonical_pair_order` check constraint, so
 * `(a, b)` and `(b, a)` are always the same row instead of two.
 */
export function canonicalizePair(
  userId1: string,
  userId2: string,
): [smaller: string, larger: string] {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

/** The other participant in a friendship, from `viewerId`'s perspective. */
export function otherParticipant(
  friendship: Pick<Friendship, "userAId" | "userBId">,
  viewerId: string,
): string {
  return friendship.userAId === viewerId
    ? friendship.userBId
    : friendship.userAId;
}
