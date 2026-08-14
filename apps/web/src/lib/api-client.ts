import { useAuthStore } from "@/store/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function rawRequest<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    // Required for the browser to send/store the bm_refresh cookie
    // across apps/web and apps/server's separate origins -- without
    // it, Set-Cookie on a cross-origin response is silently ignored.
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  const body = (await res.json().catch(() => null)) as {
    data?: T;
    error?: { message: string };
  } | null;

  if (!res.ok) {
    throw new ApiError(
      body?.error?.message ?? `Request failed with status ${res.status}`,
      res.status,
    );
  }
  return body!.data as T;
}

let refreshInFlight: Promise<string> | null = null;

/**
 * Exchanges the httpOnly bm_refresh cookie for a new access token.
 * Concurrent 401s coalesce into one in-flight refresh instead of one
 * per failed call.
 */
function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = rawRequest<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
    })
      .then(({ accessToken }) => {
        useAuthStore.getState().setAccessToken(accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * Silent-refresh-on-401 wrapper around rawRequest: an authenticated
 * call that fails with 401 (expired access token, 15-minute TTL --
 * see domain/identity/rules/session-lifetime.ts) triggers exactly one
 * refresh attempt and retries once with the new token. Login/register/
 * refresh itself are excluded -- retrying those would either loop or
 * make no sense (there is no token to refresh yet).
 */
async function request<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    const canRetry =
      error instanceof ApiError &&
      error.status === 401 &&
      options.accessToken &&
      path !== "/auth/refresh";
    if (!canRetry) throw error;

    try {
      const accessToken = await refreshAccessToken();
      return await rawRequest<T>(path, { ...options, accessToken });
    } catch {
      // The refresh cookie itself is gone/expired/revoked -- there is
      // no path back to an authenticated state short of logging in
      // again. Surface the *original* 401, not the refresh failure.
      useAuthStore.getState().clear();
      throw error;
    }
  }
}

export interface AuthedUser {
  user: { id: string; username: string };
  accessToken: string;
}

export function register(input: {
  username: string;
  credential: string;
  deviceFingerprint: string;
}): Promise<AuthedUser> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: {
  username: string;
  credential: string;
  deviceFingerprint: string;
}): Promise<AuthedUser> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface Friend {
  id: string;
  friend: { id: string; username: string };
  createdAt: string;
}

export function listFriendships(accessToken: string): Promise<Friend[]> {
  return request("/social/friendships", { accessToken });
}

export interface ConversationDto {
  id: string;
  friend: { id: string; username: string };
  createdAt: string;
  online: boolean;
}

export function listConversations(
  accessToken: string,
): Promise<ConversationDto[]> {
  return request("/messaging/conversations", { accessToken });
}

export function getOrCreateConversation(
  accessToken: string,
  otherUserId: string,
): Promise<ConversationDto> {
  return request("/messaging/conversations", {
    method: "POST",
    accessToken,
    body: JSON.stringify({ otherUserId }),
  });
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string | null;
  content: string;
  createdAt: string;
}

export function listMessages(
  accessToken: string,
  conversationId: string,
): Promise<MessageDto[]> {
  return request(`/messaging/conversations/${conversationId}/messages`, {
    accessToken,
  });
}

export interface WsTicket {
  ticket: string;
  expiresAt: string;
}

/**
 * Short-lived, single-use ticket for the WS handshake -- never the
 * long-lived access token itself, which must not travel in a URL. See
 * docs/security/Messaging.md#websocket-authentication.
 */
export function requestWsTicket(accessToken: string): Promise<WsTicket> {
  return request("/auth/ws-ticket", { method: "POST", accessToken });
}

export function wsUrl(ticket: string): string {
  const httpUrl = new URL(API_URL);
  const protocol = httpUrl.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${httpUrl.host}/messaging/ws?ticket=${ticket}`;
}
