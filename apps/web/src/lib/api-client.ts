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

async function request<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
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

export function wsUrl(accessToken: string): string {
  const httpUrl = new URL(API_URL);
  const protocol = httpUrl.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${httpUrl.host}/messaging/ws?access_token=${accessToken}`;
}
