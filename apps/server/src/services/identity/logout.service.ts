import { SessionNotFoundError } from "../../domain/identity/errors.js";
import type { AuditWriter } from "../../infrastructure/identity/audit-writer.js";
import type { RefreshTokenRepository } from "../../repositories/identity/refresh-token.repository.js";
import type { SessionRepository } from "../../repositories/identity/session.repository.js";

export interface LogoutDependencies {
  sessions: SessionRepository;
  refreshTokens: RefreshTokenRepository;
  audit: AuditWriter;
}

export interface LogoutInput {
  sessionId: string;
  ipAddress: string;
}

export function createLogoutUseCase(deps: LogoutDependencies) {
  return async function logout(input: LogoutInput): Promise<void> {
    const session = await deps.sessions.findById(input.sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }

    await deps.sessions.revoke(session.id);
    await deps.refreshTokens.revokeBySession(session.id);
    await deps.audit.record({
      type: "logout",
      userId: session.userId,
      ipAddress: input.ipAddress,
    });
  };
}
