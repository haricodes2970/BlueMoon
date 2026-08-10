# ADR-0029: End-to-End Encryption Deferred — Plaintext Storage, Transport Security Only

- **Date:** 2026-08-10
- **Status:** Accepted (explicit founder decision, not a unilateral engineering choice)

## Context

Two independent places in the canonical product documentation list
end-to-end encryption as required V1/MVP scope, not aspirational
future work: [`product-blueprint.md`](../product/product-blueprint.md)'s
V1 scope bullet, and [`ROADMAP.md`](../../ROADMAP.md)'s literal
Milestone 1.0 checklist item ("End-to-end encryption of message
content"). At the same time, this codebase has zero existing security
or design documentation for any encryption scheme — no key-exchange
model, no client-side crypto library decision, no key-storage design,
nothing. Implementing E2EE properly requires a deliberate cryptographic
design (key exchange, key storage, forward secrecy posture, multi-
device key distribution) that did not exist and could not be safely
improvised inside a messaging-feature implementation pass. Per this
codebase's engineering principles
([CLAUDE.md](../../CLAUDE.md#engineering-principles)) and the
Milestone 1.0 task brief's own instruction — "Do NOT claim E2EE unless
actually implemented. Do not invent cryptographic primitives." — this
was reported as a genuine, unresolved gap before implementation began,
rather than either faking encryption or silently dropping the
requirement.

## Decision

**Ship Milestone 1.0 with transport security only (TLS) and message
content stored in plaintext at rest, explicitly documented as a known,
tracked gap against the canonical V1 requirement.** The founder chose
this directly: "Defer E2EE, document the gap honestly... no fake/
partial crypto."

Concretely:

- `messages.content` is a plain `text` column (`packages/database/src/schema/messages.ts`),
  with an inline comment stating this explicitly and pointing to this
  ADR — anyone reading the schema sees the gap at the source, not only
  in a document that could go stale.
- No cryptographic library, key-exchange protocol, or client-side
  encryption code was added anywhere in this milestone. Message
  confidentiality in transit relies entirely on TLS between client and
  server (terminated at the hosting platform, per
  [ADR-0012](./ADR-0012-railway.md)/[ADR-0013](./ADR-0013-vercel.md));
  the server itself can read every message's plaintext content.
- `ROADMAP.md` and the PRD are updated to show E2EE as a distinct,
  explicitly deferred follow-up requirement against the real PINChat
  V1 scope — not silently removed from the product requirements, and
  not marked complete.

## Alternatives Considered

- **Implement a minimal/partial encryption scheme now (e.g. encrypt at
  rest with a server-held key, call it "encrypted"):** rejected
  outright — this would not be end-to-end encryption (the server could
  still read every message), and presenting it as meeting the V1
  requirement would be dishonest about the actual security property
  delivered. The task brief explicitly forbids exactly this.
- **Block all messaging work until a full E2EE design is complete:**
  available and offered, but not chosen — the founder preferred a
  working, honestly-labeled plaintext vertical slice now over blocking
  the entire milestone on a cryptographic design effort with no
  existing groundwork.
- **Silently drop E2EE from the requirements without flagging it:**
  rejected — violates the Product Documentation Policy's "raise the
  conflict instead of silently changing" instruction and would leave
  a real security gap undocumented.

## Consequences

- Anyone with direct database access (including, at minimum, whoever
  operates the production PostgreSQL instance) can read every
  message's content in plaintext. This must be treated as a real,
  current limitation in any security review or threat-model discussion
  of this system, not a theoretical one.
- No message content should be treated as confidential from BlueMoon's
  own infrastructure until a real E2EE design ships. Product/marketing
  claims must not describe Milestone 1.0 messaging as end-to-end
  encrypted.
- The database schema, service layer, and WebSocket payloads all
  operate on plaintext `content` directly — a future E2EE
  implementation will likely need to change the `messages` table
  (e.g. storing ciphertext + per-recipient key material) and the
  message-send/receive contract, not just add a library.

## Tradeoffs

Shipping without E2EE is a genuine, material gap against the product's
own stated privacy-by-default philosophy
([Architecture-Overview.md](../architecture/Architecture-Overview.md))
and the explicit V1 requirement — accepted deliberately, in exchange
for a working messaging vertical slice now, with the gap tracked
honestly rather than hidden or faked.

## Future Implications

A real E2EE design is required before this system can honestly claim
to meet the canonical V1 product specification. That design is a
dedicated future effort — likely its own milestone — covering at
minimum: key generation and storage per device, a key-exchange
protocol for establishing a shared secret between two participants,
how multi-device support interacts with per-device keys, and how
(or whether) the server can still support features like message
history search without ever holding plaintext. None of these are
decided here; this ADR only records that the gap exists and why it
was deliberately not addressed in Milestone 1.0.
