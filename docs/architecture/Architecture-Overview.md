# Architecture Overview

**Status: Draft v1 — authored 2026-07-22, pending review**

This document describes BlueMoon's architectural principles, system
boundaries, and anticipated future modules. It intentionally does not
specify implementation — no schemas, no API contracts, no code
structure. Implementation-level decisions belong in
[`Tech-Stack-Decision.md`](./Tech-Stack-Decision.md), the ADR log
(`docs/adr/`), and future documents under `docs/backend`, `docs/frontend`,
`docs/api`, `docs/database`.

## Architectural Principles

These follow directly from
[Product Vision & Philosophy](../product/product-vision-and-philosophy.md)
and must not be violated without a superseding ADR:

1. **Session/PIN as the unit of access, not account.** The system must
   support a participant joining a conversation without a pre-existing
   durable identity. Identity, when it exists, is additive — it upgrades
   a session, it is never a precondition for one.
2. **Privacy by default.** Message content is encrypted end-to-end.
   Metadata retention is minimized and time-boxed for ephemeral
   sessions. Nothing in the architecture should require weakening this
   to ship a feature — features that require it should be reconsidered
   instead.
3. **Ephemeral-first data lifecycle.** The system must be able to fully
   and cleanly discard a session's data on expiry. Persistence
   (contacts, retained history) is an explicit opt-in state transition,
   not the default.
4. **Platform, not app.** PINChat is the first product; the underlying
   platform (session/identity model, real-time transport, encrypted
   storage, trust primitives) must be usable by future BlueMoon products
   without a rewrite. Product-specific logic (PINChat's UI, its specific
   flows) stays separated from platform-level services.
5. **Boring where it doesn't matter, careful where it does.** Apply
   engineering rigor (ADRs, review, testing) proportionally — the
   session/identity/encryption core deserves the most scrutiny; peripheral
   product surface does not need the same ceremony.

## System Boundaries

At this stage, the system is understood as these boundaries (names are
conceptual, not final module names — those are implementation detail):

- **Client applications** — the surfaces users interact with (initially
  web, per [Tech-Stack-Decision.md](./Tech-Stack-Decision.md)). Owns
  presentation and local session state; holds no long-term source of
  truth.
- **Session/Identity boundary** — owns PIN issuance, session lifecycle
  (creation, join, expiry), and the optional upgrade path from ephemeral
  session to persistent contact. This is the boundary implied by
  [User Journey & Flow Specification](../product/user-journey-and-flow-specification.md#journey--architecture).
- **Messaging/transport boundary** — owns real-time delivery of
  messages/media within an active session, independent of whether
  participants have durable accounts.
- **Storage boundary** — owns persistence for the two distinct data
  lifecycles described above: ephemeral session data (short-lived,
  reliably deletable) and persisted relationship data (contacts, their
  history, opt-in).
- **Platform edge (API surface)** — the boundary future BlueMoon
  products (beyond PINChat) would integrate against, kept intentionally
  decoupled from PINChat-specific UI logic.

These boundaries are conceptual; how they map onto services, processes,
or a monorepo's packages is a separate decision — see ADR-0002 and
[Tech-Stack-Decision.md](./Tech-Stack-Decision.md).

## Future Modules (anticipated, not committed)

Listed because they are implied by the product docs, not because they
are scheduled:

- **Presence/real-time signaling** — needed for both journeys in
  [User Journey & Flow Specification](../product/user-journey-and-flow-specification.md).
- **Notification service** — for session invites and messages when a
  client is not actively connected.
- **Media handling** — upload, storage, and delivery of shared files/images
  within a session (see ADR-0011, object storage).
- **Contact/relationship service** — owns the persisted-contact state
  once a session converts, separate from ephemeral session state.
- **Future BlueMoon products** — anything built on the platform edge
  after PINChat; explicitly out of scope for detailed design now.

## Design Philosophy

- Favor boundaries that let ephemeral and persistent data be deleted,
  audited, and reasoned about independently — privacy guarantees are
  easiest to keep when the two are never structurally entangled.
- Keep the platform edge (API surface) product-agnostic from the start,
  even though PINChat is the only consumer today — this is the
  difference between a platform and a single app, per
  [Product Vision & Philosophy](../product/product-vision-and-philosophy.md#5-built-for-the-long-term).
- Prefer fewer, well-understood moving parts over premature
  microservice decomposition — see ADR-0002 (monorepo) for how this
  applies to repository/deployment structure.

## Related Documents

- [Product Vision & Philosophy](../product/product-vision-and-philosophy.md)
- [User Journey & Flow Specification](../product/user-journey-and-flow-specification.md)
- [Tech-Stack-Decision.md](./Tech-Stack-Decision.md)
- [ADR log](../adr/README.md)
