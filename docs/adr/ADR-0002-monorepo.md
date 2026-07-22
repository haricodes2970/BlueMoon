# ADR-0002: Monorepo

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

BlueMoon will eventually consist of multiple coordinated pieces: a web
client, an API/backend, shared types/contracts, and (per
[Architecture Overview](../architecture/Architecture-Overview.md)) a
platform edge intended to serve future products beyond PINChat. These
pieces change together frequently in an early-stage product, especially
shared types between client and API.

## Decision

Use a single monorepo for BlueMoon, containing the web client, backend
service(s), and shared packages (types, config, UI primitives),
managed with workspace tooling (e.g. npm/pnpm workspaces).

## Alternatives Considered

- **Polyrepo (separate repos per app/service):** rejected for now —
  cross-repo versioning and coordinated changes (e.g. a shared type used
  by both client and API) add process overhead disproportionate to a
  small early-stage team. Revisit once teams/services are large enough
  to want independent release cadences.
- **Single repo, no workspace structure (flat app):** rejected — doesn't
  cleanly support the client/backend/shared-package separation implied
  by the architecture boundaries.

## Consequences

- Shared types and contracts can be changed atomically in one commit/PR
  instead of coordinated across repos.
- CI/CD must be structured to build/deploy only what changed, or build
  times grow as the repo grows.
- All code is visible to all contributors by default — acceptable at
  current team size; would need reconsideration if strict access
  separation between components is ever required.

## Tradeoffs

Gains coordination simplicity now; trades away independent
versioning/release cadence per component. Acceptable while BlueMoon is a
single small team shipping one product (PINChat).

## Future Implications

If BlueMoon grows into multiple independently-owned services/teams, this
decision should be revisited via a superseding ADR — monorepos are not
assumed to be correct at all scales.
