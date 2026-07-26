# Product Requirements Document

**Status: Draft v1 — authored 2026-07-27, pending founder review**

This document is the canonical implementation specification for
BlueMoon/PINChat, synthesizing the existing product documents
(literature survey, blueprint, vision, personas, user journeys — all
Draft v1, unchanged, see [Known Limitations](../../CLAUDE.md#known-limitations))
with the architecture and Identity work completed since. Per the
[Product Documentation Policy](../../CLAUDE.md#product-documentation-policy),
this document does not replace or rewrite any existing product
document — it cross-links them and adds the implementation-level
detail (Identity, Authentication, BlueMoon Token, Device Authorization)
that didn't exist when they were drafted.

## Executive Summary

BlueMoon is a long-term communication platform. Its first product,
PINChat, is a low-friction, privacy-first messaging product where
conversation starts from a shareable session code rather than an
account. Underneath PINChat, BlueMoon is building a persistent
platform identity system (Milestone 0.6 onward) so every future
BlueMoon product shares one account, one session model, and one trust
system — without forcing PINChat's core premise (start talking without
an account) to change.

## Problem Statement

See [Literature Survey](./literature-survey.md) for the full landscape
analysis. Summary: existing messengers force a choice between
identity-first onboarding (a phone number or account before any
conversation) or ephemeral-but-disposable tools that can't grow into a
lasting relationship. Separately, as BlueMoon adds more products beyond
PINChat, those products need one platform identity system to share —
without that, every product would reinvent registration, sessions, and
trust independently.

## Vision

See [Product Vision & Philosophy](./product-vision-and-philosophy.md)
in full. The two visions this PRD reconciles:

- **PINChat's vision**: connection before identity, privacy by
  default, ephemeral by default/permanent by choice, calm technology.
- **Platform identity's vision** (this document, new): one durable
  BlueMoon account — username, credential, trusted devices, sessions
  — that PINChat and every future product can build on, without
  requiring an account before a PINChat conversation can start. These
  are complementary, not competing: PINChat's ephemeral session code
  remains the _low-friction entry point_; a BlueMoon account is what a
  user _optionally_ creates when they want persistence, multiple
  devices, or access to future products.

## Goals

- Ship PINChat's V1 scope (see [Product Blueprint](./product-blueprint.md))
  without requiring a BlueMoon account for a first conversation.
- Provide one platform Identity system (registration, authentication,
  sessions, device trust) that PINChat and future products share.
- Keep privacy-by-default and ephemeral-first data lifecycle
  guarantees intact across both the ephemeral session layer and the
  persistent Identity layer.

## Non-Goals

- Re-litigating or rewriting PINChat's already-drafted product
  documents (out of scope for this PRD; see Product Documentation
  Policy).
- Building account-based features that make a BlueMoon account
  _required_ to use PINChat at all — that would contradict the
  documented vision.
- Implementing BlueMoon Token, Communities, Voice, Video, AI, or
  Storage in this milestone (see Future Roadmap).

## Target Users

See [User Personas & Research](./user-personas-and-research.md) —
First-Contact Fatima, Privacy-conscious Priya, Coordinator Alex —
unchanged, still hypothesis-driven pending real research. Identity
(this PRD's new content) serves the same personas' need for
_optional_ persistence: e.g. Priya wanting a durable, privacy-respecting
account without a phone number tied to it.

## Core Features

### Identity

Persistent BlueMoon platform account. See
[Authentication.md](../security/Authentication.md#platform-identity)
for the full spec. Summary:

- **Username** — permanent, chosen at registration, 3–20 chars,
  lowercase `a-z0-9_`, cannot be changed after registration.
- **Credential** — the authentication secret (see Authentication
  below; naming conflict flagged in Open Questions).
- **Email** — verification and account recovery only, never used
  socially. **Not yet implemented** — no email schema, sending, or
  verification flow exists yet; "forgot credential" is blocked on
  this.
- **Devices / Trusted Devices** — see Device Authorization below.
- **Sessions** — see [Session-Management.md](../security/Session-Management.md).

### Authentication

See [Authentication.md](../security/Authentication.md) in full.
Login/registration flow, lockout policy (5 failed attempts → 15-minute
lock), rate limiting (implemented, not yet wired to any endpoint),
audit trail. Implemented in `apps/server/src/{domain,services,
repositories,infrastructure}/identity` as of Milestone 0.6 — domain
and application layers only, no HTTP endpoints yet.

### BlueMoon Token

**Status: Documented, not implemented.** Replaces the generic
"friend code" concept for establishing a persistent relationship
between two BlueMoon accounts (distinct from PINChat's ephemeral
session join-code — see
[Architecture Decisions](#architecture-decisions-referenced) for why
these stay separate concepts).

Properties (as specified):

- Generated by the account owner.
- Single use.
- Expires after 300 seconds.
- Required together with the recipient's Username to add them.
- Required before two accounts become friends — prevents unsolicited
  contact (a Username alone is not enough to reach someone).

Do not implement until the friendship milestone (not yet scheduled —
see Future Roadmap). No schema, no domain model, no ADR exists for
this yet; this section is the specification to build from when that
milestone starts.

### Messaging

Owned by PINChat's product documents, unchanged:
[Product Blueprint](./product-blueprint.md) (scope),
[User Journey & Flow Specification](./user-journey-and-flow-specification.md)
(the two journeys). Not re-specified here. Messaging's relationship to
platform Identity (e.g. whether a PINChat session can be tied to a
BlueMoon account) is an open question — see Open Questions.

### Privacy Model

See [Product Vision & Philosophy](./product-vision-and-philosophy.md#2-privacy-by-default-not-as-an-upsell)
for the PINChat-level privacy principles. At the Identity layer:
credentials are never stored in plaintext (Argon2id — see
[ADR-0025](../adr/ADR-0025-credential-authentication.md)); refresh
tokens are stored only as a hash; login failure messages are
deliberately generic to prevent username enumeration; every
security-relevant action is audited (`audit_events`) but message
content itself is never part of that audit trail.

### Device Authorization

"Trusted Devices" / "remember this device" — see
[Session-Management.md](../security/Session-Management.md#devices--trust).
A device is identified by a client-supplied fingerprint; trust is a
separate, revocable grant (not a flag), independently expirable per
device. What a trusted device changes about future login flows (e.g.
skipping a second factor) is undefined — no second factor exists yet.

## User Journey

PINChat's journeys are unchanged — see
[User Journey & Flow Specification](./user-journey-and-flow-specification.md).
This PRD adds the **Identity registration/login journey**, not yet
connected to PINChat's journeys at the product level (that connection
is an open question):

1. User registers a BlueMoon account (username + credential).
2. User logs in from a device; device is recorded, optionally trusted.
3. Session issued (access + refresh token pair); refreshed
   transparently until logout, revocation, or idle timeout.
4. (Future) User generates a BlueMoon Token to add a friend by
   username + token, establishing a persistent relationship.

## Future Roadmap

See [ROADMAP.md](../../ROADMAP.md) for milestone-level tracking.
Product-level future capabilities, in rough dependency order:

1. Resolve the credential/PIN naming conflict (blocking).
2. Identity HTTP/API layer, test suite, live-database verification
   (completes Milestone 0.6).
3. PINChat MVP (Milestone 1.0) — per existing product docs.
4. Email verification/recovery for Identity.
5. BlueMoon Token / friendship system (see above).
6. Communities, Voice, Video, AI, Storage — per
   [Architecture Overview's future modules](../architecture/Architecture-Overview.md#future-modules-anticipated-not-committed),
   unscheduled.

## Success Metrics

PINChat-level metrics unchanged — see
[Product Blueprint](./product-blueprint.md#success-criteria-directional-to-refine-with-real-usage-data).
Identity-level metrics (directional, not yet validated with real
usage): registration completion rate, login failure rate (proxy for
credential-entry UX and lockout tuning), session refresh success rate,
rate of "remember this device" adoption.

## Technical Constraints

- PostgreSQL via Drizzle ([ADR-0005](../adr/ADR-0005-postgresql.md),
  [ADR-0006](../adr/ADR-0006-drizzle.md)) — Identity schema implemented,
  never verified against a live instance (no instance available in
  this environment).
- Modular monolith, Clean Architecture layering
  ([ADR-0017](../adr/ADR-0017-overall-architecture.md)) — Identity is
  the first full proof of this layering.
- No automated dependency-boundary enforcement yet
  ([ADR-0019](../adr/ADR-0019-dependency-rules.md)).
- No test runner selected yet — Identity verified via manual scripts
  against in-memory fakes, not a committed suite.

## Risks

- **Naming/scope conflict risk** (see Open Questions) — building
  further on "credential"/4–8 digits before this is resolved risks
  rework if "PIN"/4–6 is the final decision.
- **Unvalidated personas** — Identity and BlueMoon Token are designed
  against the same hypothesis-driven personas as PINChat; real user
  research could invalidate assumptions (e.g. whether "remember this
  device" or BlueMoon Token's 300-second expiry actually match user
  behavior).
- **No live-database verification** — schema correctness has only been
  checked via generated SQL inspection and in-memory fake testing, not
  a real PostgreSQL instance.
- **Draft product documents** — this PRD is cross-linked to Draft v1
  documents that are themselves not founder-approved yet (see Known
  Limitations in CLAUDE.md); a real product-document replacement could
  change assumptions this PRD currently relies on.

## Open Questions

1. **Credential/PIN naming and digit-range conflict** (highest
   priority — see [ADR-0025](../adr/ADR-0025-credential-authentication.md)
   and [Authentication.md](../security/Authentication.md#terminology-note-open-conflict--see-below)).
   An earlier instruction said never use "PIN" for platform
   authentication (to avoid clashing with PINChat's session join-code)
   and specified "credential"/4–8 digits — implemented and tested. A
   later instruction specified "PIN"/4–6 digits, directly conflicting.
   Not resolved; current code/docs consistently use "credential"/4–8
   until a decision is made.
2. How does a PINChat ephemeral session relate to a BlueMoon Identity
   account, if at all? Can a session be started with no account (as
   currently documented) and later "claimed" by a logged-in account?
   Not specified anywhere yet.
3. Email verification/recovery: what provider, what flow, when? No
   schema or design exists yet.
4. BlueMoon Token: does it require both users to already have BlueMoon
   accounts, or can it target a PINChat-only (no-account) session?
   Specification above assumes both are account holders; not
   confirmed.
5. What second factor (if any) does "trusted device" eventually skip?
   Currently `deviceTrusted` is reported by the login use case but
   changes no behavior.

## Version History

| Version  | Date       | Change                                                                                                      |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| Draft v1 | 2026-07-27 | Initial PRD, synthesizing existing product docs with Milestone 0.6 Identity work. Not yet founder-reviewed. |

## Architecture Decisions Referenced

[ADR-0023](../adr/ADR-0023-identity-domain-model.md) (identity domain
model — why Identity and PINChat's session-code stay separate),
[ADR-0024](../adr/ADR-0024-session-strategy.md) (session strategy),
[ADR-0025](../adr/ADR-0025-credential-authentication.md) (credential
authentication, open conflict).

## Related Documents

- [Literature Survey](./literature-survey.md)
- [Product Blueprint](./product-blueprint.md)
- [Product Vision & Philosophy](./product-vision-and-philosophy.md)
- [User Personas & Research](./user-personas-and-research.md)
- [User Journey & Flow Specification](./user-journey-and-flow-specification.md)
- [Architecture Overview](../architecture/Architecture-Overview.md)
- [Authentication.md](../security/Authentication.md)
- [Session-Management.md](../security/Session-Management.md)
- [Identity-Schema.md](../database/Identity-Schema.md)
