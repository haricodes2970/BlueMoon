import { describe, expect, it, vi } from "vitest";
import { sweepConnections, type HeartbeatSocket } from "./heartbeat.js";

function fakeSocket(isAlive: boolean): HeartbeatSocket & {
  ping: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
} {
  return { isAlive, ping: vi.fn(), terminate: vi.fn() };
}

describe("sweepConnections", () => {
  it("pings a live socket and flips it to not-alive for the next sweep", () => {
    const socket = fakeSocket(true);
    sweepConnections([socket]);
    expect(socket.ping).toHaveBeenCalledOnce();
    expect(socket.terminate).not.toHaveBeenCalled();
    expect(socket.isAlive).toBe(false);
  });

  it("terminates a socket that never answered the previous ping", () => {
    const socket = fakeSocket(false);
    sweepConnections([socket]);
    expect(socket.terminate).toHaveBeenCalledOnce();
    expect(socket.ping).not.toHaveBeenCalled();
  });

  it("handles a mixed set of connections independently", () => {
    const alive = fakeSocket(true);
    const stale = fakeSocket(false);
    sweepConnections([alive, stale]);
    expect(alive.ping).toHaveBeenCalledOnce();
    expect(stale.terminate).toHaveBeenCalledOnce();
  });
});
