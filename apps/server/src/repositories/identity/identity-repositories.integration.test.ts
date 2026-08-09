import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { schema, type Database } from "@bluemoon/database";
import {
  createTestDatabase,
  hasTestDatabase,
  resetIdentityTables,
} from "../../test-utils/real-db.js";
import { createUserRepository } from "./user.repository.js";
import { createDeviceRepository } from "./device.repository.js";
import { createTrustedDeviceRepository } from "./trusted-device.repository.js";
import { createSessionRepository } from "./session.repository.js";
import { createRefreshTokenRepository } from "./refresh-token.repository.js";
import { createLoginAttemptRepository } from "./login-attempt.repository.js";
import { createAuditWriter } from "../../infrastructure/identity/audit-writer.js";

/**
 * Milestone 0.8: the same repository interfaces exercised by
 * fake-identity-container.ts and the Milestone 0.6/0.7 test suite,
 * but here against a real PostgreSQL instance -- proves the schema,
 * migration, constraints, and Drizzle query code actually work
 * together, not just the in-memory substitutes. Requires
 * TEST_DATABASE_URL or DATABASE_URL; skips entirely otherwise (see
 * docs/phases/Phase-0.8.md).
 */
describe.skipIf(!hasTestDatabase())(
  "Identity repositories (real Postgres)",
  () => {
    let db: Database;

    beforeAll(() => {
      db = createTestDatabase();
    });

    beforeEach(async () => {
      await resetIdentityTables(db);
    });

    afterAll(async () => {
      // postgres.js keeps the process alive on an open pool otherwise.
      await db.$client.end();
    });

    // users.username is varchar(20) -- a raw UUID doesn't fit, so tests
    // that don't care about the exact value use a short random one.
    function shortId(): string {
      return randomUUID().replace(/-/g, "").slice(0, 12);
    }

    async function createTestUser(username = `u${shortId()}`) {
      const users = createUserRepository(db);
      return users.create({ username, credentialHash: "argon2id$fake-hash" });
    }

    describe("users", () => {
      it("persists a user and reads it back by id and username", async () => {
        const users = createUserRepository(db);
        const created = await createTestUser("srihari");

        expect(await users.findById(created.id)).toMatchObject({
          id: created.id,
          username: "srihari",
        });
        expect(await users.findByUsername("srihari")).toMatchObject({
          id: created.id,
        });
      });

      it("enforces the unique username constraint", async () => {
        const users = createUserRepository(db);
        await users.create({ username: "dupe", credentialHash: "hash-1" });

        await expect(
          users.create({ username: "dupe", credentialHash: "hash-2" }),
        ).rejects.toThrow();
      });

      it("records failed logins and lockout, then resets them", async () => {
        const users = createUserRepository(db);
        const user = await createTestUser();
        const lockedUntil = new Date(Date.now() + 60_000);

        await users.recordFailedLogin(user.id, 5, lockedUntil);
        let reloaded = await users.findById(user.id);
        expect(reloaded?.failedLoginCount).toBe(5);
        expect(reloaded?.lockedUntil?.getTime()).toBe(lockedUntil.getTime());

        await users.resetFailedLogins(user.id);
        reloaded = await users.findById(user.id);
        expect(reloaded?.failedLoginCount).toBe(0);
        expect(reloaded?.lockedUntil).toBeNull();
      });
    });

    describe("devices", () => {
      it("rejects a device referencing a nonexistent user (FK constraint)", async () => {
        const devices = createDeviceRepository(db);
        await expect(
          devices.create({
            userId: randomUUID(),
            fingerprint: "no-such-user",
            label: null,
          }),
        ).rejects.toThrow();
      });

      it("enforces unique(user_id, fingerprint)", async () => {
        const devices = createDeviceRepository(db);
        const user = await createTestUser();
        await devices.create({
          userId: user.id,
          fingerprint: "device-1",
          label: null,
        });

        await expect(
          devices.create({
            userId: user.id,
            fingerprint: "device-1",
            label: "second attempt",
          }),
        ).rejects.toThrow();
      });

      it("lists all devices for a user", async () => {
        const devices = createDeviceRepository(db);
        const user = await createTestUser();
        await devices.create({
          userId: user.id,
          fingerprint: "a",
          label: null,
        });
        await devices.create({
          userId: user.id,
          fingerprint: "b",
          label: null,
        });

        const all = await devices.findAllByUserId(user.id);
        expect(all).toHaveLength(2);
      });
    });

    describe("trusted devices", () => {
      it("creates a trust grant and finds it as active, then revokes it", async () => {
        const devices = createDeviceRepository(db);
        const trustedDevices = createTrustedDeviceRepository(db);
        const user = await createTestUser();
        const device = await devices.create({
          userId: user.id,
          fingerprint: "trusted-device",
          label: null,
        });

        const trust = await trustedDevices.create({
          userId: user.id,
          deviceId: device.id,
          expiresAt: null,
        });
        expect(
          await trustedDevices.findActiveByUserAndDevice(user.id, device.id),
        ).toMatchObject({ id: trust.id });

        await trustedDevices.revoke(trust.id);
        expect(
          await trustedDevices.findActiveByUserAndDevice(user.id, device.id),
        ).toBeNull();
      });
    });

    describe("sessions", () => {
      it("persists a session, touches last-active, and revokes it", async () => {
        const devices = createDeviceRepository(db);
        const sessions = createSessionRepository(db);
        const user = await createTestUser();
        const device = await devices.create({
          userId: user.id,
          fingerprint: "session-device",
          label: null,
        });

        const session = await sessions.create({
          userId: user.id,
          deviceId: device.id,
          expiresAt: new Date(Date.now() + 60_000),
        });
        expect(session.revokedAt).toBeNull();

        await sessions.touchLastActive(session.id);
        await sessions.revoke(session.id);

        const reloaded = await sessions.findById(session.id);
        expect(reloaded?.revokedAt).not.toBeNull();
      });

      it("cascade-deletes sessions when the owning user is deleted (FK ON DELETE CASCADE)", async () => {
        const devices = createDeviceRepository(db);
        const sessions = createSessionRepository(db);
        const user = await createTestUser();
        const device = await devices.create({
          userId: user.id,
          fingerprint: "cascade-device",
          label: null,
        });
        const session = await sessions.create({
          userId: user.id,
          deviceId: device.id,
          expiresAt: new Date(Date.now() + 60_000),
        });

        await db.delete(schema.users).where(eq(schema.users.id, user.id));

        expect(await sessions.findById(session.id)).toBeNull();
      });
    });

    describe("refresh tokens", () => {
      async function createSessionFor(db: Database, userId: string) {
        const devices = createDeviceRepository(db);
        const sessions = createSessionRepository(db);
        const device = await devices.create({
          userId,
          fingerprint: `device-${randomUUID()}`,
          label: null,
        });
        return sessions.create({
          userId,
          deviceId: device.id,
          expiresAt: new Date(Date.now() + 60_000),
        });
      }

      it("enforces unique(token_hash)", async () => {
        const refreshTokens = createRefreshTokenRepository(db);
        const user = await createTestUser();
        const session = await createSessionFor(db, user.id);

        await refreshTokens.create({
          sessionId: session.id,
          tokenHash: "same-hash",
          expiresAt: new Date(Date.now() + 60_000),
          rotatedFromId: null,
        });

        await expect(
          refreshTokens.create({
            sessionId: session.id,
            tokenHash: "same-hash",
            expiresAt: new Date(Date.now() + 60_000),
            rotatedFromId: null,
          }),
        ).rejects.toThrow();
      });

      it("revokes exactly once under concurrent calls (rotation race fix)", async () => {
        const refreshTokens = createRefreshTokenRepository(db);
        const user = await createTestUser();
        const session = await createSessionFor(db, user.id);
        const token = await refreshTokens.create({
          sessionId: session.id,
          tokenHash: `hash-${randomUUID()}`,
          expiresAt: new Date(Date.now() + 60_000),
          rotatedFromId: null,
        });

        const [first, second] = await Promise.all([
          refreshTokens.revoke(token.id),
          refreshTokens.revoke(token.id),
        ]);

        const results = [first, second];
        const winners = results.filter((r) => r !== null);
        const losers = results.filter((r) => r === null);
        expect(winners).toHaveLength(1);
        expect(losers).toHaveLength(1);
      });

      it("revoke() returns null for an already-revoked token", async () => {
        const refreshTokens = createRefreshTokenRepository(db);
        const user = await createTestUser();
        const session = await createSessionFor(db, user.id);
        const token = await refreshTokens.create({
          sessionId: session.id,
          tokenHash: `hash-${randomUUID()}`,
          expiresAt: new Date(Date.now() + 60_000),
          rotatedFromId: null,
        });

        expect(await refreshTokens.revoke(token.id)).not.toBeNull();
        expect(await refreshTokens.revoke(token.id)).toBeNull();
      });
    });

    describe("login attempts", () => {
      it("records attempts and queries recent ones by username", async () => {
        const loginAttempts = createLoginAttemptRepository(db);
        const since = new Date(Date.now() - 60_000);

        await loginAttempts.record({
          usernameAttempted: "attempt-user",
          userId: null,
          ipAddress: "127.0.0.1",
          succeeded: false,
          reason: "user_not_found",
        });
        await loginAttempts.record({
          usernameAttempted: "attempt-user",
          userId: null,
          ipAddress: "127.0.0.1",
          succeeded: false,
          reason: "user_not_found",
        });

        const recent = await loginAttempts.recentByUsername(
          "attempt-user",
          since,
        );
        expect(recent).toHaveLength(2);
      });
    });

    describe("audit events", () => {
      it("persists an audit event with metadata", async () => {
        const audit = createAuditWriter(db);
        const user = await createTestUser();

        await audit.record({
          type: "login",
          userId: user.id,
          ipAddress: "127.0.0.1",
        });

        const [row] = await db
          .select({
            eventType: schema.auditEvents.eventType,
            userId: schema.auditEvents.userId,
          })
          .from(schema.auditEvents)
          .where(eq(schema.auditEvents.userId, user.id));
        expect(row).toMatchObject({ eventType: "login", userId: user.id });
      });
    });

    describe("connection pooling", () => {
      it("handles many concurrent queries over the shared connection", async () => {
        const users = createUserRepository(db);
        const usernames = Array.from(
          { length: 20 },
          (_, i) => `p${i}${shortId()}`,
        );

        const created = await Promise.all(
          usernames.map((username) =>
            users.create({ username, credentialHash: "hash" }),
          ),
        );

        expect(created).toHaveLength(20);
        const reads = await Promise.all(
          created.map((u) => users.findById(u.id)),
        );
        expect(reads.every((r) => r !== null)).toBe(true);
      });
    });
  },
);
