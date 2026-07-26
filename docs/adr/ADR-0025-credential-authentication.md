# ADR-0025: Credential-Based Authentication (Numeric Secret, Argon2id)

- **Date:** 2026-07-25
- **Status:** Accepted, with an open unresolved conflict (see below)

## Context

BlueMoon's platform authentication uses a numeric secret rather than a
traditional alphanumeric password. An explicit instruction directed
that this secret never be called "PIN" in code or docs, to avoid
confusion with PINChat's unrelated ephemeral session join-code (see
[ADR-0023](./ADR-0023-identity-domain-model.md)) — "credential" or
"authSecret" were specified instead.

## Decision

- Term used throughout the codebase and docs: **credential**.
- Format: 4–8 numeric digits (`CREDENTIAL_MIN_LENGTH` /
  `CREDENTIAL_MAX_LENGTH` in
  `apps/server/src/domain/identity/value-objects/credential.ts`),
  rejecting a fixed list of trivial values (`0000`, `1234`, etc.).
- Hashing: **Argon2id** (via the `argon2` package), never plaintext.
- Login failure messaging is deliberately generic (`InvalidLoginError`,
  "Invalid username or credential") for both "unknown username" and
  "wrong credential" cases, to avoid username enumeration.

## Open Conflict — Not Silently Resolved

A later instruction specified "4–6 digit PIN" as the term and range
for this same concept — directly reintroducing the word "PIN" (the
thing the earlier instruction said to avoid) and changing the digit
range from what's already implemented and tested (4–8).

Per the Product Documentation Policy (raise conflicts, don't silently
resolve them by picking a side), this ADR does **not** rename anything.
Current, shipped behavior stays as described above (credential, 4–8
digits) until a decision is made. Two possible resolutions, neither
applied yet:

1. Keep "credential" / 4–8 digits (current implementation) as the
   final decision — no code change needed, only clarify the newer
   instruction was superseded/mistaken.
2. Adopt "PIN" / 4–6 digits — requires renaming `Credential` →
   presumably `Pin` or similar throughout the domain/services/
   infrastructure/validation layers, changing
   `CREDENTIAL_MAX_LENGTH` from 8 to 6, updating every doc that
   currently says "credential," and re-verifying the trivial-value
   rejection list still makes sense at 6 digits.

Tracked as an open item in
[Product Requirements Document — Open Questions](../product/Product-Requirements-Document.md#open-questions)
and [TODO.md](../../TODO.md).

## Alternatives Considered

- **Traditional alphanumeric password:** rejected — product requirement
  specifies a numeric secret (originally "PIN," now "credential"
  pending the naming resolution above); a numeric-only secret is also
  consistent with lower-friction, mobile-first entry.
- **bcrypt/scrypt instead of Argon2id:** rejected — Argon2id is the
  current best-practice recommendation (OWASP) for password/credential
  hashing, with better resistance to GPU/ASIC cracking than bcrypt and
  simpler tuning than raw scrypt.
- **Specific message per failure reason ("username not found" vs.
  "wrong credential"):** rejected — enables username enumeration
  (an attacker can determine which usernames exist by which error they
  get back). Generic message chosen deliberately, at the cost of a
  slightly worse legitimate-user error experience.

## Consequences

- A numeric-only secret has a smaller keyspace than an alphanumeric
  password of the same length — mitigated by Argon2id's slow hashing
  (resists offline brute force) and the account lockout policy after 5
  failed attempts (resists online brute force). See
  [Authentication.md](../security/Authentication.md#lockout-policy).
- The open naming/range conflict means any documentation or code
  written referencing "credential"/4-8 could be wrong once resolved —
  every such reference in this milestone's docs links back to this ADR
  so they can be found and updated together, not fixed piecemeal.

## Tradeoffs

Shipping with an acknowledged-open naming conflict, rather than
blocking all Identity work on it being resolved first, was chosen
because the underlying security properties (hashing algorithm, lockout,
generic failure messages) don't depend on which name/range wins —
only cosmetic renaming and one numeric constant would need to change.

## Future Implications

Resolve before Milestone 1.0 (PINChat MVP) begins consuming this
system, so the naming doesn't need to change underneath a consuming
product. If "PIN"/4-6 is chosen, this ADR should be superseded, not
edited in place, per [DECISIONS.md](../../DECISIONS.md)'s convention
of never deleting a row.
