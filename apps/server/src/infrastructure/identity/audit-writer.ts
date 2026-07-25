import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import type { IdentityAuditEvent } from "../../events/identity-events.js";

export interface AuditWriter {
  record(event: IdentityAuditEvent): Promise<void>;
}

export function createAuditWriter(db: Database): AuditWriter {
  return {
    async record(event) {
      await db.insert(schema.auditEvents).values({
        id: generateUuid(),
        userId: event.userId,
        eventType: event.type,
        metadata: event.metadata ?? null,
        ipAddress: event.ipAddress,
      });
    },
  };
}
