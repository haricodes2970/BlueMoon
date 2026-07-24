# Roadmap

Tracked as milestones. Each milestone has a status, scope, and
completion criteria. Do not mark a milestone Complete until its
completion criteria are fully met.

## Milestone 0.1 — Repository Scaffold

**Status: Complete**

- [x] Git repository initialized
- [x] Root standards files (README, LICENSE, CODE_OF_CONDUCT,
      CONTRIBUTING, SECURITY, .gitignore)
- [x] `/docs` directory structure (11 areas)
- [x] ADR system + ADR-0001
- [x] CLAUDE.md / ROADMAP.md / CHANGELOG.md
- [x] Engineering coding standards document

## Milestone 0.2 — Engineering Foundation

**Status: In Progress** (blocked — see below)

- [x] Draft + cross-link all five product documents (literature survey,
      blueprint, vision & philosophy, personas, user journeys)
- [x] `docs/architecture/Architecture-Overview.md` (principles, system
      boundaries, future modules, design philosophy — no implementation)
- [x] `docs/architecture/Tech-Stack-Decision.md`
- [x] ADR-0002 through ADR-0014 (full technology stack)
- [x] CLAUDE.md updated for current milestone
- [x] ROADMAP.md converted to milestone tracking (this file)
- [x] Documentation consistency review (contradictions/improvements)
- [ ] **Replace draft product documents with the founder's real,
      approved documents** — the drafts were assistant-authored from a
      product description, not the actual specification; this is now
      the primary blocker for closing 0.2 (see Product Documentation
      Policy in [CLAUDE.md](./CLAUDE.md))
- [ ] Founder review and sign-off on architecture documents

**Completion criteria:** `docs/product/` contains the founder's actual
approved documents (versioned from 1.0.0), and architecture documents
are reviewed/accepted.

## Milestone 0.3 — Engineering Environment

**Status: In Progress**

- [x] pnpm workspace (`apps/`, `packages/`, `tooling/`) — recommended
      structure confirmed before generating
- [x] `apps/web`, `apps/server` placeholders (no feature code)
- [x] `packages/{ui,config,types,utils,database,auth}` placeholders
- [x] `tooling/{typescript-config,eslint-config,prettier-config}`
- [x] Root `tsconfig.json` project references
- [x] ESLint, Prettier, EditorConfig (strict)
- [x] Husky + lint-staged + Commitlint
- [x] Turborepo build system + ADR-0015; pnpm workspaces + ADR-0016
- [x] Environment variable strategy + per-app `.env.example` (dev/test/prod)
- [x] `.github/`: issue templates, PR template, CODEOWNERS, Dependabot
- [x] CI workflow skeleton: lint, type-check, test, build, docs-validate
      (no deployment job yet, by design)
- [ ] `pnpm install` executed and verified to succeed in a real environment
- [ ] CI workflow verified green on an actual PR
- [ ] Deploy pipelines to Railway (ADR-0012) and Vercel (ADR-0013) —
      deliberately deferred past this milestone

**Completion criteria:** a contributor can clone the repo, run
`pnpm install`, and see lint/type-check/test/build succeed locally and
in CI on a trivial PR — before any feature code exists. Not yet
verified in this environment (no Node/pnpm execution performed).

## Milestone 0.4 — Core Architecture

**Status: In Progress**

- [x] `docs/architecture/System-Architecture.md` — style, dependency
      direction, boundaries, system diagram, validation/risks
- [x] `docs/architecture/Package-Architecture.md` — exact responsibility
      per package, "add a package" justification process
- [x] `docs/architecture/Dependency-Rules.md` — import matrix, layer
      rules
- [x] `docs/architecture/Backend-Architecture.md` — routes → events
      layers, diagram
- [x] `docs/architecture/Frontend-Architecture.md` — app → assets
      layers, diagram
- [x] Expanded coding standards (naming, barrel exports, import order,
      error handling, logging, comments, testing)
- [x] ADR-0017 (overall architecture), ADR-0018 (package boundaries),
      ADR-0019 (dependency rules)
- [ ] Founder review and sign-off on all five architecture documents
- [ ] Automated dependency-rule enforcement (ESLint boundaries rule) —
      deliberately deferred past this milestone, tracked for before
      Milestone 1.0 implementation begins (see ADR-0019)

**Completion criteria:** all five architecture documents and three new
ADRs reviewed/accepted by the founder. Automated enforcement is not a
blocker for closing 0.4 but must land before Milestone 1.0 writes real
code across these boundaries.

## Milestone 1.0 — PINChat MVP

**Status: Blocked** (depends on 0.2, 0.3, and 0.4)

- [ ] Session/PIN issuance and join flow (Journey 1)
- [ ] Group session lifecycle (Journey 2)
- [ ] Real-time messaging within a session
- [ ] Basic media sharing (Cloudflare R2, per ADR-0011)
- [ ] End-to-end encryption of message content
- [ ] Contact-save / persistence flow
- [ ] Session expiry

**Completion criteria:** both user journeys in
[User Journey & Flow Specification](./docs/product/user-journey-and-flow-specification.md)
are implemented end-to-end and match the V1 scope in
[Product Blueprint](./docs/product/product-blueprint.md).

## Progress Summary

| Milestone | Status | Progress |
|---|---|---|
| 0.1 Repository Scaffold | Complete | 100% |
| 0.2 Engineering Foundation | In Progress — blocked on real product docs | ~85% |
| 0.3 Engineering Environment | In Progress — unverified | ~85% |
| 0.4 Core Architecture | In Progress — pending review | ~90% |
| 1.0 PINChat MVP | Blocked | 0% |

## Next Objective

Receive the founder's actual approved product documents and replace the
current drafts in `docs/product/` (versioned 1.0.0). In parallel, run
`pnpm install` and confirm the workspace/CI actually work end to end,
and get founder sign-off on the Milestone 0.4 architecture documents.

