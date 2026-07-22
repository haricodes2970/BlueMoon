# Literature Survey

**Status: Draft v1 — authored 2026-07-22, pending founder review**

## Purpose

Survey the existing communication-platform landscape to identify the
gap BlueMoon's first product, PINChat, is meant to fill.

## Landscape Review

### Identity-first messengers (WhatsApp, iMessage, Telegram)

Require a phone number or platform account before any conversation can
start. This creates friction for short-lived, low-trust, or first-contact
conversations (meeting someone once, coordinating with a stranger,
connecting at an event) — the user must exchange a permanent identifier
just to say one thing.

### Privacy-first messengers (Signal)

Excellent security properties (end-to-end encryption by default,
minimal metadata retention) but inherits the same identity-first
onboarding friction as the above category. Strong for people who already
trust each other; not designed for low-friction first contact.

### Community/group platforms (Discord, Slack)

Built around persistent, named communities rather than 1:1 or small
ad-hoc groups. Onboarding into a *new* community is easy; starting a
private, ephemeral, one-off exchange with a specific person is not the
core use case.

### Ephemeral/anonymous tools (Snapchat, various "burner" chat apps)

Optimize for low-friction, throwaway connection, but typically trade
away durability (conversations vanish, no path to a lasting contact) and
often trade away privacy guarantees (weaker encryption posture, ad-based
business models).

## Identified Gap

No mainstream product cleanly serves the case of: **"I want to start
talking to this specific person or group right now, with minimal setup,
and then optionally keep the relationship if it's worth keeping."**
Existing products force a choice between (a) heavy identity/account
setup up front, or (b) ephemeral tools that discard the relationship by
design.

## Implication for BlueMoon

PINChat's founding hypothesis (see
[Product Vision & Philosophy](./product-vision-and-philosophy.md)) is
that connection should start with a short-lived, shareable code (a
"PIN") rather than an identity exchange, with the option to persist the
relationship afterward if both sides want to. This survey is the basis
for that hypothesis and should be revisited as the product evolves.

## Open Questions for Founder Review

- Are there specific competitor products or research sources that should
  be cited directly rather than described generically?
- Is the target gap (ephemeral-start, optionally-persistent messaging)
  the correct framing, or is there a narrower/different wedge?

## Related Documents

- [Product Blueprint](./product-blueprint.md)
- [Product Vision & Philosophy](./product-vision-and-philosophy.md)
