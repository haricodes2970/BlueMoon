# ADR-0016: pnpm Workspaces as the Package Manager

- **Date:** 2026-07-24
- **Status:** Accepted

## Context

ADR-0002 established a monorepo but did not specify which package
manager/workspace implementation to use. The choice affects install
speed, disk usage, dependency isolation strictness, and how cleanly
`workspace:*` internal packages (`tooling/*`, `packages/*`) resolve.

## Decision

Use pnpm with pnpm workspaces (`pnpm-workspace.yaml`) as the package
manager for the monorepo.

## Alternatives Considered

- **npm workspaces:** rejected as primary choice — npm's workspace
  implementation is functional but has historically weaker
  deduplication and slower installs than pnpm at monorepo scale; no
  particular advantage here outweighs pnpm's strengths.
- **Yarn (Classic or Berry/PnP):** a reasonable alternative; Yarn PnP's
  non-`node_modules` resolution can cause friction with tooling
  (editors, some build tools) that assume a `node_modules` layout.
  Yarn Classic lacks pnpm's strict dependency isolation. Rejected in
  favor of pnpm's more predictable behavior.
- **Turborepo without pnpm (npm/yarn + Turborepo):** rejected — pnpm and
  Turborepo are commonly paired and well-documented together (see
  ADR-0015); no reason to introduce a less-common combination.

## Consequences

- Strict dependency isolation: packages can only import what they
  explicitly declare as a dependency, catching "phantom dependency" bugs
  early (a package accidentally working because a sibling package
  hoisted a shared dependency).
- Faster installs and lower disk usage via pnpm's content-addressable
  store, especially valuable as more apps/packages are added.
- Contributors must have pnpm installed (enforced via the `packageManager`
  field in root `package.json`); npm/yarn commands will not work
  correctly against this workspace.

## Tradeoffs

pnpm's strictness occasionally surfaces dependency issues that npm/Yarn
would silently tolerate (via hoisting) — treated as a feature here,
since surfacing them early is cheaper than debugging them in production.

## Future Implications

None expected — this pairs directly with ADR-0002 (monorepo) and
ADR-0015 (Turborepo) and is not expected to be revisited absent a major
tooling shift in the ecosystem.
