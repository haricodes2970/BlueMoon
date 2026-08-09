import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import type { SocialAuditEvent } from "../../events/social-events.js";

export interface SocialAuditWriter {
  record(event: SocialAuditEvent): Promise<void>;
}

/**
 * Writes to the same `audit_events` table as
 * infrastructure/identity/audit-writer.ts (one audit trail across
 * bounded contexts, `event_type` is a plain varchar, not a per-domain
 * enum) -- kept as a separate typed writer rather than reusing
 * Identity's, to keep the Social bounded context's own event union
 * (SocialAuditEvent) independent of Identity's (see ADR-0023).
 */
export function createSocialAuditWriter(db: Database): SocialAuditWriter {
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
