import { DeviceNotFoundError } from "../../domain/identity/errors.js";
import type { AuditWriter } from "../../infrastructure/identity/audit-writer.js";
import type { DeviceRepository } from "../../repositories/identity/device.repository.js";
import type { TrustedDeviceRepository } from "../../repositories/identity/trusted-device.repository.js";

export interface TrustDeviceDependencies {
  devices: DeviceRepository;
  trustedDevices: TrustedDeviceRepository;
  audit: AuditWriter;
}

export interface TrustDeviceInput {
  userId: string;
  deviceId: string;
  expiresAt: Date | null;
  ipAddress: string;
}

export interface TrustDeviceResult {
  trustId: string;
}

export function createTrustDeviceUseCase(deps: TrustDeviceDependencies) {
  return async function trustDevice(
    input: TrustDeviceInput,
  ): Promise<TrustDeviceResult> {
    const device = await deps.devices.findById(input.deviceId);
    if (!device || device.userId !== input.userId) {
      throw new DeviceNotFoundError();
    }

    const trust = await deps.trustedDevices.create({
      userId: input.userId,
      deviceId: input.deviceId,
      expiresAt: input.expiresAt,
    });

    await deps.audit.record({
      type: "device_trusted",
      userId: input.userId,
      ipAddress: input.ipAddress,
      metadata: { deviceId: input.deviceId },
    });

    return { trustId: trust.id };
  };
}

export interface RevokeDeviceTrustDependencies {
  trustedDevices: TrustedDeviceRepository;
  audit: AuditWriter;
}

export interface RevokeDeviceTrustInput {
  trustId: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
}

export function createRevokeDeviceTrustUseCase(
  deps: RevokeDeviceTrustDependencies,
) {
  return async function revokeDeviceTrust(
    input: RevokeDeviceTrustInput,
  ): Promise<void> {
    await deps.trustedDevices.revoke(input.trustId);
    await deps.audit.record({
      type: "device_trust_revoked",
      userId: input.userId,
      ipAddress: input.ipAddress,
      metadata: { deviceId: input.deviceId },
    });
  };
}
