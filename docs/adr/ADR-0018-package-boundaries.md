# ADR-0018: Package Boundaries — Six Fixed Packages, Justification Required to Add More

- **Date:** 2026-07-24
- **Status:** Accepted

## Context

Following ADR-0017's platform/product split, `packages/*` needs defined
boundaries — otherwise shared packages tend to either proliferate
(a new package per feature) or collapse into a single "shared" dumping
ground, both of which defeat the purpose of having boundaries at all.

## Decision

Fix `packages/*` at exactly six packages — `auth`, `database`, `types`,
`utils`, `ui`, `config` — each with a single, named responsibility (full
detail: [Package-Architecture.md](../architecture/Package-Architecture.md)).
A new package may only be added by following the justification process
documented there: it must be a capability usable by more than one
current-or-future app, not product-specific logic.

## Alternatives Considered

- **No fixed set, add packages freely as needs arise:** rejected —
  without an explicit "shared, not product-specific" test and a
  justification requirement, package proliferation is the likely
  outcome (a `packages/session-ui`, `packages/pinchat-helpers`, etc.,
  each eroding the platform/product split ADR-0017 just established).
- **One large `packages/shared` instead of six named packages:**
  rejected — a single shared package with no internal boundary tends to
  accumulate mixed concerns (a database helper next to a UI component)
  and makes the dependency rules in ADR-0019 impossible to state
  precisely (you can't say "UI can't depend on database" if they're the
  same package).
- **Package-per-feature instead of package-per-capability:** rejected —
  features are product-specific by definition (see
  [Frontend-Architecture.md](../architecture/Frontend-Architecture.md#features));
  packaging them would violate the "shared, not product-specific" rule
  this ADR exists to enforce.

## Consequences

- Every workspace package has one clear owner-responsibility, documented
  in [Package-Architecture.md](../architecture/Package-Architecture.md),
  making "where does X belong" a lookup, not a debate.
- Adding a package has friction by design (the justification process) —
  intentional, to keep the six-package set meaningful rather than
  eroding within a few PRs.
- Some judgment calls remain genuinely ambiguous (e.g. is a date
  formatter for message timestamps a `utils` concern or a `ui` concern?)
  — Package-Architecture.md's scope-creep guidance helps but doesn't
  eliminate the need for reviewer judgment.

## Tradeoffs

A fixed, small package set is less flexible than "add packages freely,"
in exchange for keeping the dependency graph (ADR-0019) simple enough
to reason about and enforce.

## Future Implications

Expect this list to grow exactly once a genuine second consumer exists
for a new capability (e.g. a `packages/notifications` once a second
product needs shared notification logic) — track any such addition as
an update to this ADR's package count, not a silent expansion.
