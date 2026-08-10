# Security

Security documentation: threat modeling, authentication/authorization
design, data protection, and audit notes.

- [Authentication.md](./Authentication.md) — platform Identity auth
  (username/credential rules, login flow, lockout, rate limiting, audit)
- [Session-Management.md](./Session-Management.md) — access/refresh
  token strategy, rotation, reuse detection, revocation, device trust
- [Social.md](./Social.md) — BlueMoon Token generation/expiry/single-use,
  atomic concurrent-consumption protection, friendship authorization
- [Messaging.md](./Messaging.md) — conversation/message authorization,
  WebSocket authentication and delivery model, presence, and the
  current plaintext-storage/no-E2EE status

See root [`SECURITY.md`](../../SECURITY.md) for the vulnerability
reporting policy.
