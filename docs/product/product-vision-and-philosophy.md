# Product Vision & Philosophy

**Status: Draft v1 — authored 2026-07-22, pending founder review**

## Vision

BlueMoon exists to make starting a conversation as easy as saying
"here's a PIN" — with no loss of privacy, ownership, or the option to
keep the relationship afterward. PINChat is the first proof of that
vision.

## Philosophy

### 1. Connection before identity

A conversation should be able to start without either party creating a
permanent account first. Identity, if it's needed at all, comes after
trust is established — not as a precondition for it.

### 2. Privacy by default, not as an upsell

Encryption, minimal metadata retention, and user data ownership are
baseline requirements, not premium features. This is a constraint
applied to every architecture decision (see
[Architecture Overview](../architecture/Architecture-Overview.md)),
not a marketing claim layered on afterward.

### 3. Ephemeral by default, permanent by choice

A PIN-based conversation should be able to disappear cleanly if that's
what both sides want, and should be able to become a lasting contact if
that's what both sides want. The product should never force one outcome.

### 4. Calm technology

Notifications, UI, and product surface area should stay minimal.
BlueMoon is not optimizing for engagement time; it is optimizing for
the conversation happening with the least possible friction and noise.

### 5. Built for the long term

BlueMoon is explicitly a multi-year platform, not a single-feature app.
PINChat is the first product; the platform underneath it (identity,
messaging transport, storage, trust model) should be built so future
products can be layered on without a rewrite. This is why the repository
carries production-grade engineering practices (ADRs, documentation
discipline, coding standards) from day one — see
[CLAUDE.md](../../CLAUDE.md).

## What This Vision Rules Out

- Ad-supported or engagement-optimized product decisions.
- Requiring phone number/email verification before first contact.
- Treating user conversation data as a platform asset rather than user
  property.

## Related Documents

- [Literature Survey](./literature-survey.md) — the gap this vision responds to
- [User Personas & Research](./user-personas-and-research.md) — who this vision serves
- [User Journey & Flow Specification](./user-journey-and-flow-specification.md) — how the vision shows up in product flow
- [Architecture Overview](../architecture/Architecture-Overview.md) — how the vision constrains system design
