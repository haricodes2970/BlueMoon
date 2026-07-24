# ADR-0019: Dependency Rules — Enforced Import Direction Across Apps, Packages, and Layers

- **Date:** 2026-07-24
- **Status:** Accepted

## Context

ADR-0017 (overall architecture) and ADR-0018 (package boundaries)
establish *what* the pieces are; without explicit import rules,
nothing prevents those boundaries from being violated in practice (e.g.
`packages/ui` quietly importing from `packages/database`, or `domain/`
importing a Hono type). Boundaries that aren't enforced tend to erode.

## Decision

Adopt the import rules and matrix documented in
[Dependency-Rules.md](../architecture/Dependency-Rules.md) as binding:

- Apps depend on packages; packages never depend on apps.
- `packages/ui` never depends on server-only packages (`database`,
  `auth`'s internals); `packages/database` never depends on
  `packages/ui`.
- `packages/types` and `packages/utils` are leaves — nothing they
  depend on may depend back on them except each other (rarely).
- Within `apps/server`, dependencies point inward: `domain/` depends on
  nothing but `packages/types`/`packages/utils`; everything else
  depends toward `domain/`, never the reverse.
- Within `apps/web`, `components/` never depends on `features/`.

One documented exception: `packages/auth` may depend on
`packages/database` (session persistence is inherent to what `auth`
owns) — any other cross-capability package dependency requires a new
ADR.

## Alternatives Considered

- **No formal matrix, rely on the layer descriptions alone:** rejected
  — "dependencies point inward" as prose is ambiguous enough that
  reviewers will disagree at the margins; an explicit allowed/forbidden
  table (as in Dependency-Rules.md) removes that ambiguity.
- **Allow all packages to depend on all packages ("just don't create
  cycles"):** rejected — permits exactly the kind of coupling ADR-0018
  is meant to prevent (e.g. `ui` importing `database` "just this once")
  and makes future refactors (extracting a service) much harder to
  reason about.
- **Enforce via documentation only, forever:** considered as the
  starting point (see Consequences) but explicitly not the end state —
  automated enforcement is planned, see Future Implications.

## Consequences

- The import matrix in
  [Dependency-Rules.md](../architecture/Dependency-Rules.md) is the
  single source of truth for "is this import allowed" — code review
  should reject violations by pointing to that table, not by ad hoc
  judgment.
- As of this ADR, enforcement is **code review only** — no ESLint rule
  or CI check yet fails a violating import. This is a known gap, not an
  oversight (see [System-Architecture.md](../architecture/System-Architecture.md#validation--risks)
  risk #1).

## Tradeoffs

Documenting rules before automating them means violations are possible
until enforcement lands — accepted because no application code exists
yet (Milestone 0.4 is architecture-only), so there is nothing to
violate the rules today. The tradeoff becomes real risk once
implementation starts, which is why automated enforcement is flagged as
a near-term follow-up rather than a someday item.

## Future Implications

Add `eslint-plugin-boundaries` (or equivalent) to
`tooling/eslint-config`, configured against the matrix in
Dependency-Rules.md, before or very early in Milestone 1.0 (PINChat
MVP implementation) — tracked in [TODO.md](../../TODO.md). Until that
lands, this ADR's rules are a review checklist, not a CI gate.
