# ADR-0027: Interim Friendship-Gated 1:1 Messaging — A Deliberate Deviation from the Canonical Session/PIN Model

- **Date:** 2026-08-10
- **Status:** Accepted (explicit founder decision, not a unilateral engineering choice)

## Context

The Milestone 1.0 task brief asked for the smallest production-quality
1:1 messaging vertical slice on top of the existing Identity and Social
(BlueMoon Token / Friendship) bounded contexts. Before writing any
implementation code, Phase 1 inspection of the canonical product
documentation surfaced a genuine, material conflict rather than an
implementation detail:

- [`ROADMAP.md`](../../ROADMAP.md)'s pre-existing Milestone 1.0
  checklist (session/PIN issuance, group session lifecycle, real-time
  messaging _within a session_, contact-save as an explicit opt-in
  step) is entirely session/PIN-first — it never mentions an
  account-to-account friendship gate.
- [`Architecture-Overview.md`](../architecture/Architecture-Overview.md)
  states as a hard architectural principle: "a participant joining a
  conversation without a pre-existing durable identity... identity is
  additive, never a precondition."
- [`product-blueprint.md`](../product/product-blueprint.md) and
  [`user-journey-and-flow-specification.md`](../product/user-journey-and-flow-specification.md)
  both describe starting a conversation from a shareable session
  code — no pre-existing account or relationship required; saving a
  contact is optional and happens after the fact, not before.
- The PRD's own Open Question #4 resolution (Milestone 0.9) explicitly
  predicted this exact conflict: "Revisit if/when Milestone 1.0
  introduces a no-account session concept."

At the same time, the only real, tested, persistent relationship
primitive that exists in this codebase today is Social's Friendship
(Milestone 0.9) — there is no session/PIN infrastructure of any kind.
Building the canonical no-account session model from scratch was out
of scope for this milestone's brief (a focused 1:1 messaging vertical
slice, not a session-system redesign). Per this codebase's own
Product Documentation Policy
([CLAUDE.md](../../CLAUDE.md#product-documentation-policy)) — "if
implementation appears to conflict with product documentation, raise
the conflict instead of silently changing the documents" — this was
reported to the founder before any implementation code was written,
with two options: build the interim account-to-account version now
(explicitly non-canonical, revisited later), or stop and design the
real session/PIN infrastructure first.

## Decision

**Build friendship-gated 1:1 messaging now, explicitly as an interim
engineering milestone, not as PINChat V1.** The founder chose this
option directly (not inferred): "Hybrid — friendship-gated now,
session/PIN later... treat this as an interim engineering milestone
(accounts already exist, sessions don't) rather than final PINChat V1."

Concretely:

- A `Conversation` may only be created between two users who already
  have an established Social `Friendship` (Milestone 0.9). There is no
  code path that creates a conversation from a username, a session
  code, or any other identifier — only an existing friendship gates
  creation (`services/messaging/get-or-create-conversation.service.ts`).
- This directly contradicts the "identity is additive, never a
  precondition" principle in `Architecture-Overview.md` for this
  milestone's messaging feature specifically. That principle is not
  revised or weakened — it remains the target architecture for the
  real PINChat V1 session model. This ADR documents the deviation as
  temporary and scoped to Milestone 1.0's interim slice only.
- `ROADMAP.md` is updated to record this work as its own entry,
  clearly labeled as an interim deviation, without altering or marking
  complete the pre-existing session/PIN Milestone 1.0 checklist (see
  [ROADMAP.md](../../ROADMAP.md)) — that work is renumbered forward
  and remains entirely unimplemented.

## Alternatives Considered

- **Silently build friendship-gated messaging and call it "Milestone
  1.0 / PINChat MVP":** rejected — would misrepresent engineering
  status against the founder's own product vision and violate the
  Product Documentation Policy's "raise the conflict" instruction.
- **Silently build the session/PIN model instead, ignoring the task
  brief's realistic scope:** rejected — no session infrastructure
  exists yet (no ephemeral session store, no PIN issuance, no
  anonymous-participant identity model); designing that properly is a
  substantial architectural undertaking of its own, not something to
  improvise mid-way through a messaging-focused milestone without
  dedicated design time.
- **Stop and do nothing until the conflict is resolved by a full
  redesign:** available and offered, but not chosen — the founder
  preferred a working interim vertical slice over blocking further
  engineering progress.

## Consequences

- `services/messaging/get-or-create-conversation.service.ts` takes a
  hard dependency on Social's `FriendshipRepository` (read-only reuse,
  a new repository instance constructed in `messaging-container.ts`,
  not a change to `SocialContainer`'s public interface — see
  ADR-0028 for the composition-root reasoning).
- The `conversations` table has no column or concept tying a
  conversation to a session/PIN — when the real session model lands,
  either a new gating mechanism is added alongside this one, or this
  one is replaced. Both are open, not decided here.
- Frontend UI (login/register, friend list, conversation list) is
  necessarily account-based for this milestone; a future session/PIN
  frontend flow is a separate, not-yet-designed effort.

## Tradeoffs

Building on the wrong long-term primitive (account-to-account
friendship instead of ephemeral sessions) risks throwaway work when
the real session model lands — accepted explicitly, in exchange for a
working, tested, deployable vertical slice now rather than an
extended design phase with no shippable output.

## Future Implications

When session/PIN infrastructure is designed (a real architectural
effort, not assumed as a small follow-up), this ADR's gating decision
must be revisited: does the real PINChat V1 replace friendship-gating
entirely, layer a session-based gate alongside it, or keep both as
independent ways to start a conversation (BlueMoon-account friends,
and anonymous session participants)? Not decided here — flagged as the
next open architectural question, tracked in `ROADMAP.md`.
