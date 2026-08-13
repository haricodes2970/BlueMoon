import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@bluemoon/database";
import {
  createTestDatabase,
  hasTestDatabase,
  resetAllTables,
} from "../../test-utils/real-db.js";
import { createDeviceRepository } from "./device.repository.js";
import { createSessionRepository } from "./session.repository.js";
import { createUserRepository } from "./user.repository.js";
import { createWsTicketRepository } from "./ws-ticket.repository.js";

/**
 * Milestone 1.0 hardening: the WS ticket repository exercised against
 * a real PostgreSQL instance, same pattern as
 * social-repositories.integration.test.ts's
 * `consumeTokenAndCreateFriendship` suite -- mirrors its
 * valid/expired/wrong-context/double-consume/concurrent structure for
 * the identical atomic-conditional-UPDATE consumption shape. Requires
 * TEST_DATABASE_URL or DATABASE_URL; skips entirely otherwise.
 */
describe.skipIf(!hasTestDatabase())(
  "WsTicketRepository (real Postgres)",
  () => {
    let db: Database;

    beforeAll(() => {
      db = createTestDatabase();
    });

    beforeEach(async () => {
      await resetAllTables(db);
    });

    afterAll(async () => {
      await db.$client.end();
    });

    function shortId(): string {
      return randomUUID().replace(/-/g, "").slice(0, 12);
    }

    async function setupSession() {
      const users = createUserRepository(db);
      const devices = createDeviceRepository(db);
      const sessions = createSessionRepository(db);

      const user = await users.create({
        username: `u${shortId()}`,
        credentialHash: "argon2id$fake-hash",
      });
      const device = await devices.create({
        userId: user.id,
        fingerprint: `fp-${shortId()}`,
        label: null,
      });
      const session = await sessions.create({
        userId: user.id,
        deviceId: device.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      return { userId: user.id, deviceId: device.id, sessionId: session.id };
    }

    it("persists a ticket and consuming it once succeeds", async () => {
      const wsTickets = createWsTicketRepository(db);
      const { userId, deviceId, sessionId } = await setupSession();
      const ticketHash = `hash-${shortId()}`;

      await wsTickets.create({
        sessionId,
        userId,
        deviceId,
        ticketHash,
        expiresAt: new Date(Date.now() + 30_000),
      });

      const consumed = await wsTickets.consume(ticketHash, new Date());
      expect(consumed).not.toBeNull();
      expect(consumed?.userId).toBe(userId);
      expect(consumed?.sessionId).toBe(sessionId);
      expect(consumed?.deviceId).toBe(deviceId);
      expect(consumed?.consumedAt).not.toBeNull();
    });

    it("rejects an expired ticket", async () => {
      const wsTickets = createWsTicketRepository(db);
      const { userId, deviceId, sessionId } = await setupSession();
      const ticketHash = `hash-${shortId()}`;

      await wsTickets.create({
        sessionId,
        userId,
        deviceId,
        ticketHash,
        expiresAt: new Date(Date.now() - 1000),
      });

      const consumed = await wsTickets.consume(ticketHash, new Date());
      expect(consumed).toBeNull();
    });

    it("rejects an unknown ticket hash", async () => {
      const wsTickets = createWsTicketRepository(db);
      const consumed = await wsTickets.consume(`hash-${shortId()}`, new Date());
      expect(consumed).toBeNull();
    });

    it("consuming the same ticket twice: the second attempt fails (single-use)", async () => {
      const wsTickets = createWsTicketRepository(db);
      const { userId, deviceId, sessionId } = await setupSession();
      const ticketHash = `hash-${shortId()}`;

      await wsTickets.create({
        sessionId,
        userId,
        deviceId,
        ticketHash,
        expiresAt: new Date(Date.now() + 30_000),
      });

      const first = await wsTickets.consume(ticketHash, new Date());
      const second = await wsTickets.consume(ticketHash, new Date());

      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });

    it("concurrent consumption of the same ticket: exactly one succeeds", async () => {
      const wsTickets = createWsTicketRepository(db);
      const { userId, deviceId, sessionId } = await setupSession();
      const ticketHash = `hash-${shortId()}`;

      await wsTickets.create({
        sessionId,
        userId,
        deviceId,
        ticketHash,
        expiresAt: new Date(Date.now() + 30_000),
      });

      const [resultA, resultB] = await Promise.all([
        wsTickets.consume(ticketHash, new Date()),
        wsTickets.consume(ticketHash, new Date()),
      ]);

      const results = [resultA, resultB];
      const winners = results.filter((r) => r !== null);
      const losers = results.filter((r) => r === null);
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
    });
  },
);
