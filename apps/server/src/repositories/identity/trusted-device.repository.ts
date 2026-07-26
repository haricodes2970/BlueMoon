import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import { and, eq, isNull } from "drizzle-orm";
import type { TrustedDevice } from "../../domain/identity/entities/device.js";

export interface TrustedDeviceRepository {
  findActiveByUserAndDevice(
    userId: string,
    deviceId: string,
  ): Promise<TrustedDevice | null>;
  create(input: {
    userId: string;
    deviceId: string;
    expiresAt: Date | null;
  }): Promise<TrustedDevice>;
  revoke(id: string): Promise<void>;
}

export function createTrustedDeviceRepository(
  db: Database,
): TrustedDeviceRepository {
  return {
    async findActiveByUserAndDevice(userId, deviceId) {
      const [row] = await db
        .select()
        .from(schema.trustedDevices)
        .where(
          and(
            eq(schema.trustedDevices.userId, userId),
            eq(schema.trustedDevices.deviceId, deviceId),
            isNull(schema.trustedDevices.revokedAt),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    async create(input) {
      const [row] = await db
        .insert(schema.trustedDevices)
        .values({
          id: generateUuid(),
          userId: input.userId,
          deviceId: input.deviceId,
          expiresAt: input.expiresAt,
        })
        .returning();
      if (!row) throw new Error("Failed to create trusted device");
      return row;
    },

    async revoke(id) {
      await db
        .update(schema.trustedDevices)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.trustedDevices.id, id));
    },
  };
}
