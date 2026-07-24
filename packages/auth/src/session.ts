/**
 * Placeholder exports only. Session/PIN issuance, lifecycle, and the
 * ephemeral-to-persisted-contact upgrade path (see
 * docs/architecture/Package-Architecture.md#packagesauth) are
 * explicitly out of scope for this milestone -- no authentication
 * logic is implemented here yet.
 */

export interface SessionHandle {
  readonly id: string;
}

const NOT_IMPLEMENTED =
  "Not implemented -- packages/auth is a placeholder as of Milestone 0.5. See docs/architecture/Package-Architecture.md#packagesauth.";

export function createSession(): SessionHandle {
  throw new Error(NOT_IMPLEMENTED);
}

export function joinSession(_pin: string): SessionHandle {
  throw new Error(NOT_IMPLEMENTED);
}

export function expireSession(_sessionId: string): void {
  throw new Error(NOT_IMPLEMENTED);
}
