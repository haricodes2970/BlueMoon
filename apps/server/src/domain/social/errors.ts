import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@bluemoon/utils";

/**
 * Deliberately generic -- covers "username doesn't resolve to a
 * user," "token doesn't exist," "token expired," "token already
 * consumed," and "token belongs to a different owner" with the same
 * message. Distinguishing any of these to the caller would let an
 * attacker enumerate usernames or probe token validity one bit at a
 * time; same anti-enumeration reasoning as
 * domain/identity/errors.ts's InvalidLoginError.
 */
export class BlueMoonTokenInvalidError extends UnauthorizedError {
  constructor() {
    super("BlueMoon Token is invalid or expired");
    this.name = "BlueMoonTokenInvalidError";
  }
}

export class CannotFriendSelfError extends ConflictError {
  constructor() {
    super("Cannot establish a friendship with yourself");
    this.name = "CannotFriendSelfError";
  }
}

export class FriendshipNotFoundError extends NotFoundError {
  constructor() {
    super("Friendship not found");
    this.name = "FriendshipNotFoundError";
  }
}

/** The requesting user is neither participant in the friendship. */
export class FriendshipForbiddenError extends ForbiddenError {
  constructor() {
    super("Not a participant in this friendship");
    this.name = "FriendshipForbiddenError";
  }
}
