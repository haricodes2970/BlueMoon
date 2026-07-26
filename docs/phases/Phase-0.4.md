# Phase 0.4 — Core Architecture

**Status: In Progress — pending founder review** | **Dates:** 2026-07-24

## Purpose

Design the architecture every future BlueMoon feature must follow —
overall style, package responsibilities, enforced dependency rules,
and backend/frontend layering — before any messaging, auth, or
database entity is implemented.

## Goals

- Overall architectural style, dependency direction, package/app
  boundaries documented with diagrams.
- Exact responsibility for each of the six `packages/*`.
- An enforced (even if not yet automated) import matrix.
- Backend and frontend layer definitions.
- Expanded coding standards matching the new layers.
- Three ADRs recording these decisions.

## Tasks

- [x] `System-Architecture.md`
- [x] `Package-Architecture.md`
- [x] `Dependency-Rules.md`
- [x] `Backend-Architecture.md`
- [x] `Frontend-Architecture.md`
- [x] Expanded `coding-standards.md`
- [x] ADR-0017, ADR-0018, ADR-0019
- [ ] Founder review and sign-off on all five architecture documents
- [ ] Automated dependency-rule enforcement (deferred past this
      milestone, tracked for before Milestone 1.0)

## Completed Work

`System-Architecture.md`: modular monolith + Clean Architecture +
platform/product split as the overall style; dependency direction (two
independent rules: Clean Architecture layering within an app, workspace
direction across apps/packages/tooling); a system diagram; a validation
pass explicitly checking for circular dependencies, scalability,
testability, future-product fit, and developer experience, surfacing
real risks (no automated enforcement yet; `packages/utils` scope-creep
risk; `packages/config` vs. per-app env overlap needing clarification
later). `Package-Architecture.md`: exact responsibility for each of the
six fixed packages, the "shared, not product-specific" test, and the
justification process required to add a seventh. `Dependency-Rules.md`:
the full allowed/forbidden import matrix, one documented exception
(`auth` → `database`), and an explicit "enforcement: code review only"
status. `Backend-Architecture.md` and `Frontend-Architecture.md`: full
layer breakdowns (routes through events; app router through assets)
with diagrams and dependency direction rules specific to each app.
Expanded `coding-standards.md`: folder/file naming, barrel-export
policy (public API boundary only), import ordering, error handling,
logging, comments, and testing conventions mapped onto the new layers.
ADR-0017 (overall architecture), ADR-0018 (package boundaries — six
fixed, justification required to add more), ADR-0019 (dependency
rules — the enforced matrix, explicitly not yet automated).

## Files Created

`docs/architecture/{System-Architecture,Package-Architecture,
Dependency-Rules,Backend-Architecture,Frontend-Architecture}.md`,
`docs/adr/ADR-0017-overall-architecture.md`,
`docs/adr/ADR-0018-package-boundaries.md`,
`docs/adr/ADR-0019-dependency-rules.md`.

## Files Modified

`docs/engineering/coding-standards.md` (major expansion), all six
`packages/*/README.md` (linked to their Package-Architecture.md entry),
`CLAUDE.md`, `ROADMAP.md`, `DECISIONS.md`,
`docs/engineering/Engineering-Journal.md`.

## Architecture Decisions

ADR-0017 (overall architecture), ADR-0018 (package boundaries),
ADR-0019 (dependency rules).

## Problems Found

No automated enforcement exists for the dependency rules this phase
defined — a real, acknowledged gap (documented in
`System-Architecture.md`'s Validation & Risks section and ADR-0019's
Future Implications), not an oversight discovered later.

## Problems Solved

N/A for this phase — the enforcement gap is tracked, not yet fixed
(see `TODO.md`).

## Quality Gate Results

Not applicable — documentation-only phase, no application code exists
yet to lint/type-check/test/build against these rules.

## Lessons Learned

Documenting an enforced-sounding rule ("dependency rules") without
actually wiring automated enforcement risks the rules quietly eroding
once real implementation starts. Explicitly flagging "code review only,
not yet automated" in the documents themselves (rather than implying
enforcement exists) keeps that risk visible instead of hidden.

## Next Phase

[Phase-0.5.md](./Phase-0.5.md) — Core Infrastructure: the first real
`pnpm install`, and turning the placeholder apps/packages into working
infrastructure code.
