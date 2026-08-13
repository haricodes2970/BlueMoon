"use client";

import { useEffect, useRef, useState } from "react";
import { requestWsTicket, wsUrl, type MessageDto } from "@/lib/api-client";

export type InboundEvent =
  | { type: "message"; data: MessageDto }
  | { type: "error"; data: { message: string } };

/**
 * One connection per authenticated user, not per conversation (see
 * docs/api/Messaging-API.md) -- receives events for every conversation
 * the user is part of. Reconnects on unexpected close with a fixed
 * backoff; a deliberate, not-configurable delay is enough for this
 * milestone's vertical slice.
 */
export function useMessagingSocket(
  accessToken: string | null,
  onEvent: (event: InboundEvent) => void,
): {
  connected: boolean;
  sendMessage: (conversationId: string, content: string) => void;
} {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      if (cancelled) return;

      // A fresh, single-use ticket is required for every handshake
      // attempt (including reconnects) -- it cannot be reused. Never
      // logged: it's a disposable credential, same handling as the
      // access token itself.
      let ticket: string;
      try {
        ticket = (await requestWsTicket(accessToken!)).ticket;
      } catch {
        if (!cancelled) reconnectTimer = setTimeout(connect, 2000);
        return;
      }
      if (cancelled) return;

      socket = new WebSocket(wsUrl(ticket));
      socketRef.current = socket;

      socket.onopen = () => setConnected(true);
      socket.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
      socket.onerror = () => socket?.close();
      socket.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(String(evt.data)) as InboundEvent;
          onEventRef.current(parsed);
        } catch {
          // Ignore malformed frames -- persistence already happened
          // server-side; a dropped realtime event isn't data loss.
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [accessToken]);

  function sendMessage(conversationId: string, content: string) {
    socketRef.current?.send(
      JSON.stringify({ type: "send_message", conversationId, content }),
    );
  }

  return { connected, sendMessage };
}
