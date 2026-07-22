# User Journey & User Flow Specification

**Status: Draft v1 — authored 2026-07-22, pending founder review**

## Journey 1: Ephemeral First Contact

Serves [First-Contact Fatima](./user-personas-and-research.md#persona-1--first-contact-fatima)
and [Privacy-conscious Priya](./user-personas-and-research.md#persona-2--privacy-conscious-priya).

1. User A opens PINChat, generates a PIN (short code, expires after a
   configurable window).
2. User A shares the PIN out-of-band (spoken, QR, link — channel is
   flexible, not prescribed here).
3. User B enters the PIN in PINChat; a session opens between A and B.
   Neither side needed a pre-existing account tied to identity.
4. A and B exchange messages/media within the session.
5. At any point, either side may propose "save as contact." If both
   accept, the relationship persists beyond session expiry. If neither
   does, the session expires and the conversation is not retained.

**Edge cases to design for (implementation detail deferred):**
- PIN reuse/collision handling
- One-sided contact-save request (declined or ignored)
- Session expiry while a message is mid-send

## Journey 2: Group Session Lifecycle

Serves [Coordinator Alex](./user-personas-and-research.md#persona-3--coordinator-alex).

1. User creates a group session PIN.
2. Multiple participants join via the same PIN within the session
   window.
3. Group coordinates (messages, media) for the duration of the session.
4. Creator (or all participants, TBD at architecture stage) can
   explicitly end the session early.
5. Individual participants may optionally save each other as 1:1
   contacts following Journey 1's contact-save step; the group itself
   does not persist as a standing group chat by default.

**Edge cases to design for (implementation detail deferred):**
- Maximum group size
- Late joiners after session start
- Partial contact-save (some pairs save, others don't)

## Journey → Architecture

Both journeys imply architectural requirements that should inform
(without being fully specified by) system design:

- A session/identity model where a PIN — not a persistent account — is
  the unit of access (see
  [Architecture Overview](../architecture/Architecture-Overview.md#system-boundaries)).
- A clear lifecycle for ephemeral data (session content) versus
  persistent data (saved contacts, their message history).
- Real-time delivery within a session regardless of whether either
  participant has a durable account yet.

## Related Documents

- [User Personas & Research](./user-personas-and-research.md)
- [Product Blueprint](./product-blueprint.md)
- [Product Vision & Philosophy](./product-vision-and-philosophy.md)
- [Architecture Overview](../architecture/Architecture-Overview.md)
