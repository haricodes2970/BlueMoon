import { ValidationError } from "@bluemoon/utils";
import {
  Credential,
  formatCredentialValidationError,
} from "../../domain/identity/value-objects/credential.js";
import {
  InvalidLoginError,
  UserNotFoundError,
} from "../../domain/identity/errors.js";
import type { AuditWriter } from "../../infrastructure/identity/audit-writer.js";
import type { RefreshTokenRepository } from "../../repositories/identity/refresh-token.repository.js";
import type { SessionRepository } from "../../repositories/identity/session.repository.js";
import type { UserRepository } from "../../repositories/identity/user.repository.js";

export interface ChangeCredentialDependencies {
  users: UserRepository;
  sessions: SessionRepository;
  refreshTokens: RefreshTokenRepository;
  hashCredential: (raw: string) => Promise<string>;
  verifyCredential: (hash: string, raw: string) => Promise<boolean>;
  audit: AuditWriter;
}

export interface ChangeCredentialInput {
  userId: string;
  currentCredential: string;
  newCredential: string;
  ipAddress: string;
}

/**
 * Rotating the credential revokes every existing session for the
 * user (all refresh tokens, all sessions) -- a stolen credential
 * shouldn't leave old sessions valid after the legitimate owner
 * changes it. The caller's own current session goes away too; the
 * API layer is responsible for issuing a fresh one if desired.
 */
export function createChangeCredentialUseCase(
  deps: ChangeCredentialDependencies,
) {
  return async function changeCredential(
    input: ChangeCredentialInput,
  ): Promise<void> {
    const user = await deps.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    const currentValid = await deps.verifyCredential(
      user.credentialHash,
      input.currentCredential,
    );
    if (!currentValid) {
      throw new InvalidLoginError();
    }

    const newCredentialResult = Credential.create(input.newCredential);
    if (!newCredentialResult.ok) {
      throw new ValidationError(
        formatCredentialValidationError(newCredentialResult.error),
      );
    }

    const newHash = await deps.hashCredential(
      newCredentialResult.value.reveal(),
    );
    await deps.users.updateCredential(user.id, newHash);
    await deps.sessions.revokeAllForUser(user.id);
    await deps.refreshTokens.revokeAllForUser(user.id);

    await deps.audit.record({
      type: "credential_changed",
      userId: user.id,
      ipAddress: input.ipAddress,
    });
  };
}
