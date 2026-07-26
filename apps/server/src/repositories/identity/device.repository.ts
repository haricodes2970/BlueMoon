import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import { and, eq } from "drizzle-orm";
import type { Device } from "../../domain/identity/entities/device.js";

export interface CreateDeviceInput {
  userId: string;
  fingerprint: string;
  label: string | null;
}

export interface DeviceRepository {
  findById(id: string): Promise<Device | null>;
  findByUserAndFingerprint(
    userId: string,
    fingerprint: string,
  ): Promise<Device | null>;
  create(input: CreateDeviceInput): Promise<Device>;
  touchLastSeen(deviceId: string): Promise<void>;
}

export function createDeviceRepository(db: Database): DeviceRepository {
  return {
    async findById(id) {
      const [row] = await db
        .select()
        .from(schema.devices)
        .where(eq(schema.devices.id, id))
        .limit(1);
      return row ?? null;
    },

    async findByUserAndFingerprint(userId, fingerprint) {
      const [row] = await db
        .select()
        .from(schema.devices)
        .where(
          and(
            eq(schema.devices.userId, userId),
            eq(schema.devices.fingerprint, fingerprint),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    async create(input) {
      const [row] = await db
        .insert(schema.devices)
        .values({
          id: generateUuid(),
          userId: input.userId,
          fingerprint: input.fingerprint,
          label: input.label,
        })
        .returning();
      if (!row) throw new Error("Failed to create device");
      return row;
    },

    async touchLastSeen(deviceId) {
      await db
        .update(schema.devices)
        .set({ lastSeenAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.devices.id, deviceId));
    },
  };
}
