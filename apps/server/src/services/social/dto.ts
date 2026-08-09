import type { Friendship } from "../../domain/social/entities/friendship.js";

/**
 * The only friendship shape allowed to cross out of this layer --
 * resolved to "the other participant" from the viewer's perspective,
 * not the raw userA/userB storage pair.
 */
export interface PublicFriendship {
  id: string;
  friend: { id: string; username: string };
  createdAt: Date;
}

export function toPublicFriendship(
  friendship: Friendship,
  friendUser: { id: string; username: string },
): PublicFriendship {
  return {
    id: friendship.id,
    friend: friendUser,
    createdAt: friendship.createdAt,
  };
}

/**
 * The raw token is only ever present in this shape, returned once at
 * generation. Nothing downstream of this DTO ever holds or serializes
 * the raw value again -- only its hash is persisted.
 */
export interface GeneratedBlueMoonToken {
  token: string;
  expiresAt: Date;
}
