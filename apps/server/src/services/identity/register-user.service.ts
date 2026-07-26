import { ValidationError } from "@bluemoon/utils";
import {
  Credential,
  formatCredentialValidationError,
} from "../../domain/identity/value-objects/credential.js";
import {
  formatUsernameValidationError,
  Username,
} from "../../domain/identity/value-objects/username.js";
import { UsernameTakenError } from "../../domain/identity/errors.js";
import type { AuditWriter } from "../../infrastructure/identity/audit-writer.js";
import type { DeviceRepository } from "../../repositories/identity/device.repository.js";
import type { UserRepository } from "../../repositories/identity/user.repository.js";
import { toPublicUser, type PublicUser } from "./dto.js";

export interface RegisterUserDependencies {
  users: UserRepository;
  devices: DeviceRepository;
  hashCredential: (raw: string) => Promise<string>;
  audit: AuditWriter;
}

export interface RegisterUserInput {
  username: string;
  credential: string;
  deviceFingerprint: string;
  deviceLabel: string | null;
  ipAddress: string;
}

export interface RegisterUserResult {
  user: PublicUser;
  deviceId: string;
}

export function createRegisterUserUseCase(deps: RegisterUserDependencies) {
  return async function registerUser(
    input: RegisterUserInput,
  ): Promise<RegisterUserResult> {
    const usernameResult = Username.create(input.username);
    if (!usernameResult.ok) {
      throw new ValidationError(
        formatUsernameValidationError(usernameResult.error),
      );
    }

    const credentialResult = Credential.create(input.credential);
    if (!credentialResult.ok) {
      throw new ValidationError(
        formatCredentialValidationError(credentialResult.error),
      );
    }

    const username = usernameResult.value.toString();
    const existing = await deps.users.findByUsername(username);
    if (existing) {
      throw new UsernameTakenError(username);
    }

    const credentialHash = await deps.hashCredential(
      credentialResult.value.reveal(),
    );
    const user = await deps.users.create({ username, credentialHash });
    const device = await deps.devices.create({
      userId: user.id,
      fingerprint: input.deviceFingerprint,
      label: input.deviceLabel,
    });

    await deps.audit.record({
      type: "registration",
      userId: user.id,
      ipAddress: input.ipAddress,
    });

    return { user: toPublicUser(user), deviceId: device.id };
  };
}
