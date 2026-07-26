# ADR-0023: Identity Domain Model

- **Date:** 2026-07-25
- **Status:** Accepted

## Context

BlueMoon needs a persistent platform identity system — accounts,
authentication, sessions — that every future product (starting with
PINChat) can build on. PINChat's product documentation already
describes an unrelated concept: a PIN-based _ephemeral session
join-code_ with no account required (see
[Product Vision & Philosophy](../product/product-vision-and-philosophy.md),
[System-Architecture.md](../architecture/System-Architecture.md)).
Building real platform identity risked either contradicting that
documented product vision or silently overloading the same
terminology for two different things.

## Decision

Model Identity as its own bounded context, structurally and
terminologically separate from PINChat's session join-code:

- **Entities**: `User`, `Username` (value object), `Credential` (value
  object — the authentication secret, deliberately never called "PIN"
  in code, see [ADR-0025](./ADR-0025-credential-authentication.md)),
  `Device`, `TrustedDevice`, `Session`, `RefreshToken`, `LoginAttempt`.
- **Layering**: follows [Backend-Architecture.md](../architecture/Backend-Architecture.md)
  exactly — `domain/identity` (zero infra deps), `repositories/identity`,
  `services/identity` (application/use-case layer),
  `infrastructure/identity`, `validation/identity`,
  `events/identity-events.ts`. No new top-level folders invented for
  this domain.
- **No dependency on PINChat's session-code concept**, and vice versa —
  the two are unrelated capabilities that happen to share a
  vocabulary collision ("PIN"/"session") if care isn't taken.

## Alternatives Considered

- **Reuse/overload the PIN-based session-join concept for account
  authentication:** rejected — conflates two genuinely different
  things (a shareable, ephemeral, no-account join code vs. a private,
  permanent, account-bound authentication secret). Would have forced a
  contradiction with already-published product documentation.
- **Put Identity in `packages/auth` directly, skipping the
  domain/services/repositories layering used elsewhere:** rejected —
  `packages/auth` (per [Package-Architecture.md](../architecture/Package-Architecture.md#packagesauth))
  is meant to own only the shared, cross-product session/identity
  _primitives_, not a full product's worth of use-case logic. Identity
  as implemented here is genuinely `apps/server`-specific
  orchestration (registration flow, login flow, etc.) built using
  patterns, not something every future product would import wholesale
  — see Future Implications.

## Consequences

- Product documentation is not contradicted: PINChat's ephemeral
  session join-code remains exactly as documented, untouched by this
  work.
- A real terminology conflict surfaced mid-implementation (a later
  instruction reintroduced "PIN" for platform authentication) — see
  [ADR-0025](./ADR-0025-credential-authentication.md) for how that's
  being handled (flagged, not silently resolved).
- Full Clean Architecture layering was applied to a single bounded
  context before any second one exists, which is more structure than a
  minimal implementation would need — accepted because
  [Backend-Architecture.md](../architecture/Backend-Architecture.md)
  already committed to this layering as the standard for every future
  domain; Identity is the first proof it works, not a one-off.

## Tradeoffs

Keeping Identity and PINChat's session-code fully separate means no
code reuse between them even where they might look superficially
similar (both are "short numeric codes," at a glance) — correct here,
since their security properties, lifetimes, and purposes are entirely
different.

## Future Implications

- If a second product needs the same registration/login/session flows,
  revisit whether the current `services/identity/*.service.ts` use
  cases should be promoted into `packages/auth` (shared) rather than
  staying `apps/server`-local — not done now because there is no
  second consumer yet, per the package-addition rule in
  [Package-Architecture.md](../architecture/Package-Architecture.md#adding-a-new-package).
- The terminology conflict in ADR-0025 may require a rename
  (`credential` → something else, or digit-range change) once the
  founder resolves it — tracked, not blocking this ADR's acceptance.
