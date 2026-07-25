import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@bluemoon/utils";

export class UsernameTakenError extends ConflictError {
  constructor(username: string) {
    super(`Username "${username}" is already taken`);
    this.name = "UsernameTakenError";
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

/**
 * Deliberately generic message -- never reveals whether the username
 * exists, to avoid username enumeration via the login endpoint.
 */
export class InvalidLoginError extends UnauthorizedError {
  constructor() {
    super("Invalid username or credential");
    this.name = "InvalidLoginError";
  }
}

export class AccountLockedError extends ForbiddenError {
  constructor(lockedUntil: Date) {
    super(`Account locked until ${lockedUntil.toISOString()}`);
    this.name = "AccountLockedError";
  }
}

export class SessionNotFoundError extends NotFoundError {
  constructor() {
    super("Session not found");
    this.name = "SessionNotFoundError";
  }
}

export class SessionExpiredError extends UnauthorizedError {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

/**
 * A refresh token that was already rotated (or revoked) was presented
 * again -- signals possible theft. The caller must revoke the entire
 * session, not just reject this one request.
 */
export class RefreshTokenReuseError extends UnauthorizedError {
  constructor() {
    super("Refresh token reuse detected");
    this.name = "RefreshTokenReuseError";
  }
}

export class DeviceNotFoundError extends NotFoundError {
  constructor() {
    super("Device not found");
    this.name = "DeviceNotFoundError";
  }
}
