# Product Blueprint

**Status: Draft v1 — authored 2026-07-22, pending founder review**

## Product

**PINChat** — the first product on the BlueMoon platform.

## Core Concept

A user generates a short-lived **PIN** and shares it (verbally, via
link, via QR) with the person or people they want to talk to. Anyone
with the PIN can join the conversation immediately — no account
creation required to participate. Either side can later choose to save
the other as a persistent contact, converting the ephemeral session into
a lasting relationship.

## Scope — V1 (MVP)

In scope:

- PIN generation and PIN-based session join (1:1 and small group)
- Real-time text messaging within a session
- Basic media sharing (images, files) within a session
- End-to-end encryption of message content
- Optional "save as contact" to persist a relationship past the session
- Session expiry (time-based or explicit end)

Out of scope for V1:

- Voice/video calling
- Public/discoverable communities (this is Discord/Slack's territory,
  not PINChat's)
- Bots/integrations/third-party app ecosystem
- Cross-device sync beyond the basics needed for a persisted contact

These boundaries should be revisited at the next milestone, not assumed
permanent.

## Platform Layering

PINChat is the first product on the BlueMoon platform. The platform
layer (identity/session model, encrypted transport, storage, trust
primitives) is intentionally built generically enough to support future
BlueMoon products without a rewrite — see
[Architecture Overview](../architecture/Architecture-Overview.md) for
how this separation is maintained architecturally.

## Success Criteria (directional, to refine with real usage data)

- Time from "I want to talk to this person" to "first message sent" is
  materially lower than identity-first competitors.
- A meaningful share of ephemeral sessions convert to persisted contacts
  (signal that the low-friction start is not just a novelty).
- No compromise on the privacy principles in
  [Product Vision & Philosophy](./product-vision-and-philosophy.md) to
  hit growth metrics.

## Related Documents

- [Product Vision & Philosophy](./product-vision-and-philosophy.md)
- [User Personas & Research](./user-personas-and-research.md)
- [User Journey & Flow Specification](./user-journey-and-flow-specification.md)
- [Architecture Overview](../architecture/Architecture-Overview.md)
