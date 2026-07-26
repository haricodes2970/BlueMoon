import { SessionNotFoundError } from "../../domain/identity/errors.js";
import type { AuditWriter } from "../../infrastructure/identity/audit-writer.js";
import type { RefreshTokenRepository } from "../../repositories/identity/refresh-token.repository.js";
import type { SessionRepository } from "../../repositories/identity/session.repository.js";

export interface RevokeSessionDependencies {
  sessions: SessionRepository;
  refreshTokens: RefreshTokenRepository;
  audit: AuditWriter;
}

export interface RevokeSessionInput {
  sessionId: string;
  requestingUserId: string;
  ipAddress: string;
}

export function createRevokeSessionUseCase(deps: RevokeSessionDependencies) {
  return async function revokeSession(
    input: RevokeSessionInput,
  ): Promise<void> {
    const session = await deps.sessions.findById(input.sessionId);
    // Same error for "doesn't exist" and "belongs to someone else" --
    // don't let a caller probe for other users' session IDs.
    if (!session || session.userId !== input.requestingUserId) {
      throw new SessionNotFoundError();
    }

    await deps.sessions.revoke(session.id);
    await deps.refreshTokens.revokeBySession(session.id);
    await deps.audit.record({
      type: "session_revoked",
      userId: session.userId,
      ipAddress: input.ipAddress,
      metadata: { sessionId: session.id, reason: "user_requested" },
    });
  };
}
