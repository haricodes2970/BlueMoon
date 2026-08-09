import { otherParticipant } from "../../domain/social/entities/friendship.js";
import type { FriendshipRepository } from "../../repositories/social/friendship.repository.js";
import type { UserRepository } from "../../repositories/identity/user.repository.js";
import { toPublicFriendship, type PublicFriendship } from "./dto.js";

export interface ListFriendshipsDependencies {
  friendships: FriendshipRepository;
  users: UserRepository;
}

export interface ListFriendshipsInput {
  userId: string;
}

export function createListFriendshipsUseCase(
  deps: ListFriendshipsDependencies,
) {
  return async function listFriendships(
    input: ListFriendshipsInput,
  ): Promise<PublicFriendship[]> {
    const friendships = await deps.friendships.listForUser(input.userId);

    const results: PublicFriendship[] = [];
    for (const friendship of friendships) {
      const friendId = otherParticipant(friendship, input.userId);
      const friendUser = await deps.users.findById(friendId);
      // The FK is ON DELETE CASCADE, so a dangling reference here
      // would mean the friendship row itself should already be gone.
      if (!friendUser) continue;
      results.push(
        toPublicFriendship(friendship, {
          id: friendUser.id,
          username: friendUser.username,
        }),
      );
    }
    return results;
  };
}
