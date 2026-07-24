# ADR-0015: Turborepo for Monorepo Task Orchestration

- **Date:** 2026-07-24
- **Status:** Accepted

## Context

The monorepo (ADR-0002) has multiple apps and packages with
interdependencies (e.g. `apps/web` depends on `packages/ui` and
`packages/types`; `apps/server` depends on `packages/database`,
`packages/auth`). Running lint/type-check/test/build across all of them
needs to respect dependency order and avoid re-running unchanged work.

## Decision

Use Turborepo to orchestrate `build`, `dev`, `lint`, `type-check`, and
`test` tasks across the workspace, configured in `turbo.json` at the
root.

## Alternatives Considered

- **Native pnpm workspace scripts (`pnpm -r run <script>`):** rejected
  as the primary orchestrator — pnpm's recursive run has no built-in
  task-graph awareness (dependency-ordered execution) or caching, so
  every task re-runs on every package regardless of what changed.
- **Nx:** a more feature-complete alternative (generators, richer
  dependency graph visualization); rejected as heavier than needed for
  a small monorepo, and its opinionated project structure conventions
  would add ceremony disproportionate to current scale — consistent
  with "boring where it doesn't matter" in
  [Architecture Overview](../architecture/Architecture-Overview.md#design-philosophy).
- **No orchestration, manual per-package scripts:** rejected — does not
  scale past a couple of packages without becoming error-prone and slow.

## Consequences

- Task execution respects the dependency graph (`dependsOn: ["^build"]`)
  automatically from workspace `package.json` dependencies.
- Local caching means unchanged packages skip re-running lint/test/build,
  keeping iteration fast as the workspace grows.
- Adds a build-tool dependency and a `turbo.json` contributors need to
  understand when adding new tasks or packages.

## Tradeoffs

Turborepo's caching and remote-cache features are most valuable at a
scale this repository hasn't reached yet — the tradeoff is accepting
that overhead now in exchange for not having to migrate task
orchestration later once the app count grows.

## Future Implications

Remote caching (Vercel Remote Cache or self-hosted) can be enabled later
without changing `turbo.json`'s task graph — track as a follow-up once
CI build times become a concern (see Milestone 0.3 in
[ROADMAP.md](../../ROADMAP.md)).
