# ADR-0025: Credential-Based Authentication (Numeric Secret, Argon2id)

- **Date:** 2026-07-25, resolved 2026-07-27
- **Status:** Accepted

## Context

BlueMoon's platform authentication uses a numeric secret rather than a
traditional alphanumeric password. An explicit instruction directed
that this secret never be called "PIN" in code or docs, to avoid
confusion with PINChat's unrelated ephemeral session join-code (see
[ADR-0023](./ADR-0023-identity-domain-model.md)) — "credential" or
"authSecret" were specified instead. A later instruction reintroduced
"PIN" and a different digit range (4–6 vs. the implemented 4–8),
creating a real conflict — see Resolution below for how it was closed.

## Decision

- **Internal code (types, variables, function names, DB columns, ADRs,
  engineering docs) uses "credential."** Unchanged from the original
  decision — `Credential` the value object, `credentialHash`/
  `credential_hash` the field, etc.
- **User-facing UI copy uses "PIN."** Applies to whatever the founder
  or product wants a user to read on screen ("Enter your PIN") once a
  UI exists — no UI has been built yet, so this is a naming convention
  for future work, not a change to anything shipped. The internal/
  external split means the codebase never has to choose one word for
  both audiences.
- **Database fields are not renamed to PIN.** `credential_hash`,
  `credential_updated_at`, etc. stay exactly as implemented in
  [Identity-Schema.md](../database/Identity-Schema.md) — this decision
  is explicit and final, not just "not done yet."
- Format: 4–8 numeric digits (`CREDENTIAL_MIN_LENGTH` /
  `CREDENTIAL_MAX_LENGTH` in
  `apps/server/src/domain/identity/value-objects/credential.ts`),
  rejecting a fixed list of trivial values (`0000`, `1234`, etc.). The
  4–6 digit range from the conflicting instruction was **not** adopted
  — only the naming split was requested; the digit range is a separate
  question, not addressed by this resolution. If a narrower range is
  wanted later, that is a new, explicit decision, not implied by this
  one.
- Hashing: **Argon2id** (via the `argon2` package), never plaintext.
- Login failure messaging stays deliberately generic
  (`InvalidLoginError`, "Invalid username or credential" internally;
  UI copy would say "Invalid username or PIN") for both "unknown
  username" and "wrong credential" cases, to avoid username
  enumeration.

## Resolution

The conflict flagged when this ADR was first written (raised, not
silently resolved, per the Product Documentation Policy) is closed by
explicit instruction: **internal code keeps "credential"; only
user-facing UI copy says "PIN."** This requires zero code changes —
every existing `Credential`/`credentialHash`/`CREDENTIAL_MIN_LENGTH`
reference in the domain, application, infrastructure, and validation
layers (Milestones 0.6–0.7) is correct as-is and stays correct going
forward. Only future UI-layer copy (labels, placeholder text, error
messages shown to a user) should say "PIN" instead of "credential."

## Alternatives Considered

- **Traditional alphanumeric password:** rejected — product requirement
  specifies a numeric secret; lower-friction, mobile-first entry.
- **bcrypt/scrypt instead of Argon2id:** rejected — Argon2id is the
  current best-practice recommendation (OWASP) for password/credential
  hashing, with better resistance to GPU/ASIC cracking than bcrypt and
  simpler tuning than raw scrypt.
- **Specific message per failure reason ("username not found" vs.
  "wrong credential"):** rejected — enables username enumeration.
  Generic message chosen deliberately.
- **Renaming internal code to "PIN" to match the later instruction
  literally:** rejected by the resolving instruction itself — internal
  code stays "credential"; only the UI-facing word changes.

## Consequences

- A numeric-only secret has a smaller keyspace than an alphanumeric
  password of the same length — mitigated by Argon2id's slow hashing
  (resists offline brute force) and the account lockout policy after 5
  failed attempts (resists online brute force). See
  [Authentication.md](../security/Authentication.md#lockout-policy).
- Every reference to "credential" in code and engineering docs
  (Milestones 0.6/0.7) remains accurate and does not need updating.
- Future UI work must remember the split: read "credential" in code,
  write "PIN" in anything a user sees. Worth a lint/review checklist
  item once UI work starts, to avoid the wrong word leaking into copy
  or vice versa.

## Tradeoffs

An internal/external naming split is an extra rule contributors need
to know (don't just search-and-replace one word for the other), in
exchange for needing zero code changes to resolve the conflict and
never having database/API naming drift from what's actually
implemented.

## Future Implications

None outstanding — this ADR is fully resolved. If the digit range
(4–8 vs. some narrower range) is revisited later, that is a new,
separate ADR, not a reopening of this one.
