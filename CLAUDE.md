# CLAUDE.md — BlueMoon Engineering Memory

This file is the persistent engineering memory for the BlueMoon repository.
It must be updated whenever meaningful work is completed, a decision is made,
or the roadmap changes. Do not let this file go stale.

## Project Overview

BlueMoon is a long-term communication platform. The first product built on
top of it is **PINChat** — a PIN-based, low-friction, privacy-first
messaging product (see [Product Blueprint](./docs/product/product-blueprint.md)).

Source-of-truth product documentation lives under
[`docs/product`](./docs/product): Literature Survey, Product Blueprint,
Product Vision & Philosophy, User Personas & User Research, and User
Journey & User Flow Specification. All five exist as **Draft v1**
(authored 2026-07-22), cross-linked, and pending founder review —
see the Known Limitations section below before treating them as final.
Implementation decisions must not contradict these documents.

## Product Documentation Policy

The documents under `/docs/product/` are the canonical product
specification.

Claude Code must never rewrite, replace, or substantially modify these
documents unless explicitly instructed.

Engineering must conform to product documentation.

If implementation appears to conflict with product documentation, raise
the conflict instead of silently changing the documents.

## Current Phase

**Phase 0 — Engineering Foundation**

Documentation, architecture, and infrastructure are being established
before product feature implementation begins. Real infrastructure code
exists as of Milestone 0.5 (shared packages, a working backend and
frontend shell) — no messaging/friends/users/auth _product_ logic yet;
that starts Milestone 1.0.

## Current Milestone

**Milestone 0.5 — Core Infrastructure** (in progress)

Implementation begins. `pnpm install` actually run and verified (not
just documented) — surfaced and fixed several real bugs (ESLint 9
needs flat config; shared packages need a real `dist/` build for
`node` to resolve them; ESM/CJS mismatches; a Next.js/typescript-eslint
parser conflict). `packages/{types,utils,config,database,auth}`
implemented for real (not placeholders) per this milestone's scope;
`apps/server` is a working Hono app with OpenAPI, Zod validation,
centralized logging, typed error handling, and a verified `/health`
endpoint; `apps/web` is a working Next.js App Router app with
Tailwind, one shadcn/ui primitive, and TanStack Query wired up. Three
new ADRs (0020–0022). No messaging, friends, users, or authentication
_logic_ — infrastructure only, per this milestone's scope.

## Active Tasks

- [ ] Replace Draft v1 product documents with the founder's actual
      approved documents (see Known Limitations — current drafts were
      assistant-authored, not real product specs) — **still the
      top-priority blocker, carried over from Milestone 0.2**
- [ ] Founder review of Architecture Overview, Tech Stack Decision, and
      all five Milestone 0.4 architecture documents
- [ ] Add automated dependency-rule enforcement (`eslint-plugin-boundaries`
      or equivalent) — currently code-review-only, see ADR-0019
- [ ] Validate the three hypothesis personas with real user research
- [ ] Choose final license and update `LICENSE`
- [ ] Verify `apps/server` against a real PostgreSQL instance (health
      check's DB branch and `packages/database`'s migrate/seed scripts
      are implemented but untested against a live database — none was
      available in this environment)
- [ ] Begin Milestone 1.0 (PINChat MVP) once 0.2, 0.3, 0.4, and 0.5 are
      all verified/reviewed

## Completed Tasks

**Milestone 0.1 — Repository Scaffold**

- [x] Initialize git repository; root standards files; `/docs` structure
- [x] ADR system established; ADR-0001 (project/documentation structure)
- [x] CLAUDE.md, ROADMAP.md, CHANGELOG.md; coding standards document

**Milestone 0.2 — Engineering Foundation**

- [x] Drafted and cross-linked all five product documents (later found
      to be assistant-authored drafts, not real specs — see Product
      Documentation Policy and Known Limitations)
- [x] Authored `docs/architecture/Architecture-Overview.md` (principles,
      system boundaries, future modules, design philosophy)
- [x] Authored `docs/architecture/Tech-Stack-Decision.md`
- [x] Recorded ADR-0002 through ADR-0014 (full technology stack: monorepo,
      Next.js, Hono, PostgreSQL, Drizzle, Tailwind, shadcn, Zustand,
      TanStack Query, Cloudflare R2, Railway, Vercel, TypeScript)
- [x] Added root navigation files (BLUEPRINT.md, ARCHITECTURE.md,
      DECISIONS.md, TODO.md) and Product Documentation Policy

**Milestone 0.3 — Engineering Environment**

- [x] pnpm workspace (`pnpm-workspace.yaml`, root `package.json`)
- [x] `apps/web`, `apps/server` placeholders (no feature code)
- [x] `packages/{ui,config,types,utils,database,auth}` placeholders
- [x] `tooling/{typescript-config,eslint-config,prettier-config}` shared configs
- [x] Root `tsconfig.json` with project references
- [x] Root ESLint, Prettier wiring, `.editorconfig`
- [x] Husky pre-commit/commit-msg hooks + lint-staged + Commitlint
- [x] Turborepo (`turbo.json`) + ADR-0015; pnpm workspaces + ADR-0016
- [x] Environment variable strategy doc + per-app `.env.example`
- [x] `.github/` scaffold: issue templates, PR template, CODEOWNERS,
      Dependabot
- [x] CI workflow skeleton: lint, type-check, test, build, docs-validate
      (no deployment job)
- [x] Engineering Journal added (`docs/engineering/Engineering-Journal.md`)

**Milestone 0.4 — Core Architecture**

- [x] `docs/architecture/System-Architecture.md` (style, dependency
      direction, boundaries, diagram, validation/risks)
- [x] `docs/architecture/Package-Architecture.md` (exact responsibility
      per package + "add a package" justification process)
- [x] `docs/architecture/Dependency-Rules.md` (import matrix, layer
      rules, enforcement status)
- [x] `docs/architecture/Backend-Architecture.md` (routes → events
      layers, diagram)
- [x] `docs/architecture/Frontend-Architecture.md` (app → assets
      layers, diagram)
- [x] Expanded `docs/engineering/coding-standards.md` (naming, barrel
      exports, import order, error handling, logging, comments, testing)
- [x] ADR-0017 (overall architecture), ADR-0018 (package boundaries),
      ADR-0019 (dependency rules)

**Milestone 0.5 — Core Infrastructure**

- [x] Ran a real `pnpm install`; found and fixed real workspace bugs
      (ESLint 9 flat config migration, package `dist/` builds so
      `node` can resolve compiled output, ESM/CJS `"type"` mismatches,
      Next.js/typescript-eslint parser conflicts) — all fixes verified
      by actually running `pnpm lint`/`type-check`/`build`, not just
      re-reading config
- [x] `packages/types`: `Environment`, `ApiResponse<T>`, typed
      `ErrorCode`/`ApiErrorBody`, `HealthCheckResponse`
- [x] `packages/utils`: pino-based `createLogger`/`withRequestId`,
      date/id helpers, `Result<T, E>`, `AppError` hierarchy
- [x] `packages/config`: Zod `baseEnvSchema`/`extendEnvSchema`, fail-fast
      `loadEnv()`
- [x] `packages/database`: Drizzle + `postgres.js` connection, empty
      schema (no business entities), migrate/seed CLI entry points,
      `checkDatabaseConnection()` health helper
- [x] `packages/auth`: placeholder exports only (`createSession`/
      `joinSession`/`expireSession`, all throw "not implemented")
- [x] `apps/server`: Hono + `@hono/zod-openapi`, `GET /health` +
      `GET /openapi.json` + `GET /docs`, request-ID middleware,
      centralized error handler, fail-fast env — verified end-to-end
      (dev server hit directly, and a real `next build`-style
      `tsc` → `node dist/index.js` production start)
- [x] `apps/web`: Next.js App Router, Tailwind + shadcn/ui token setup,
      one hand-added shadcn primitive, TanStack Query provider wired —
      verified via a real `next build` + `next start` + response
      inspection
- [x] ADR-0020 (logging), ADR-0021 (configuration), ADR-0022 (error
      handling)

## Engineering Principles

- Optimize for maintainability, scalability, readability, security, and
  developer experience, in that rough priority order.
- Analyze and propose architecture before implementing. Explain tradeoffs
  when more than one reasonable option exists.
- Documentation is production code: it is never allowed to go stale.
  Update docs in the same change that alters architecture or behavior.
- Every significant technical decision gets an ADR.
- Never contradict existing product documentation.

## Architecture Goals

(Full detail: [Architecture Overview](./docs/architecture/Architecture-Overview.md))

- Session/PIN as the unit of access — no account required to start a
  conversation; identity is additive, never a precondition.
- Privacy by default — end-to-end encryption, minimal metadata
  retention, no tradeoffs against this to ship faster.
- Ephemeral-first data lifecycle — session data is cleanly discardable;
  persistence (contacts) is an explicit opt-in, not the default.
- Platform, not app — the session/identity/transport/storage core must
  outlive PINChat and support future BlueMoon products without a rewrite.
- Boring where it doesn't matter, careful where it does — rigor is
  proportional to how core a component is to trust/privacy guarantees.

## Coding Standards

Full detail in [`docs/engineering/coding-standards.md`](./docs/engineering/coding-standards.md).
Summary: Strict TypeScript, ESLint, Prettier, Husky + lint-staged,
Commitlint, feature-first Clean Architecture, SOLID.

## Documentation Index

Root navigation files (quick orientation for humans and AI agents):
[BLUEPRINT.md](./BLUEPRINT.md), [ARCHITECTURE.md](./ARCHITECTURE.md),
[DECISIONS.md](./DECISIONS.md), [TODO.md](./TODO.md). These are thin
indexes — full content stays in `/docs`.

| Area                                                            | Path                                                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product (source of truth)                                       | [`docs/product`](./docs/product)                                                                                                                       |
| Architecture overview & tech stack                              | [`docs/architecture`](./docs/architecture)                                                                                                             |
| ADR log (22 records as of Milestone 0.5)                        | [`docs/adr`](./docs/adr)                                                                                                                               |
| System / Package / Dependency / Backend / Frontend architecture | [`docs/architecture/{System,Package,Dependency-Rules,Backend,Frontend}-Architecture.md`](./docs/architecture)                                          |
| Engineering standards                                           | [`docs/engineering`](./docs/engineering)                                                                                                               |
| Engineering journal (chronological milestone log)               | [`docs/engineering/Engineering-Journal.md`](./docs/engineering/Engineering-Journal.md)                                                                 |
| Environment variable strategy                                   | [`docs/engineering/environment-strategy.md`](./docs/engineering/environment-strategy.md)                                                               |
| Backend / Frontend / API / Database / Deployment / Security     | `docs/{backend,frontend,api,database,deployment,security}` — index stubs only, populated as each area is implemented                                   |
| Meeting notes                                                   | [`docs/meeting-notes`](./docs/meeting-notes)                                                                                                           |
| Workspace apps                                                  | [`apps/`](./apps) — `web` (Next.js, implemented), `server` (Hono, implemented) — infrastructure only, no product features                              |
| Workspace packages                                              | [`packages/`](./packages) — `types`, `utils`, `config`, `database` implemented; `auth` placeholder exports only; `ui` empty placeholder (out of scope) |
| Shared tooling                                                  | [`tooling/`](./tooling) — `typescript-config`, `eslint-config`, `prettier-config`                                                                      |
| Roadmap                                                         | [`ROADMAP.md`](./ROADMAP.md)                                                                                                                           |
| Changelog                                                       | [`CHANGELOG.md`](./CHANGELOG.md)                                                                                                                       |

## Repository Conventions

- Conventional Commits for all commit messages.
- One logical change per commit; no vague or batch commits.
- Sequential ADR numbering: `ADR-XXXX-kebab-case-title.md` under
  `docs/adr/`.
- Semantic Versioning tracked in `CHANGELOG.md`.

## Documentation Conventions

- All docs in Markdown.
- Organized by topic under `docs/<area>/`.
- Each doc area should have a short index/README when it contains more
  than one file.
- Cross-link related documents (product docs, architecture docs, and
  ADRs reference each other directly — see each document's "Related
  Documents" section).

## Important Decisions

See [`docs/adr`](./docs/adr) for the authoritative log, and
[`DECISIONS.md`](./DECISIONS.md) for the root-level index. As of this
writing: ADR-0001 through ADR-0022, covering repository structure, the
full technology stack, build tooling, core architecture, and
infrastructure (logging, configuration, error handling) for PINChat.

## Known Limitations

- **The five documents under `docs/product/` were drafted by the
  engineering assistant from a stack/product description — they are
  not the founder's real product specification.** This was flagged as
  an error by the founder (see Engineering Journal, Milestone 0.2
  entry). They remain in place only until replaced with the actual
  approved documents; per the Product Documentation Policy above, they
  must not be rewritten or summarized further by Claude Code in the
  meantime.
- The three personas in `docs/product/user-personas-and-research.md`
  are explicitly hypothesis-driven, not validated by real user research
  — doubly so given the above.
- No product features exist yet (by design — Milestone 0.5 is
  infrastructure only; messaging/friends/users/auth logic starts
  Milestone 1.0).
- The workspace **has** been installed and run for real as of
  Milestone 0.5 (`pnpm install`, `lint`, `type-check`, `build`,
  `format:check` all verified green from a clean `node_modules`).
  Husky hooks are active (confirmed firing on real commits).
- `apps/server` has never connected to a real PostgreSQL database —
  no instance was available in this environment. `packages/database`'s
  connection/migrate/seed code type-checks and `drizzle-kit generate`
  runs successfully against the (empty) schema, but actual
  connectivity is unverified. The `/health` endpoint's "degraded when
  DB unreachable" branch is implemented but untested against a real
  outage.
- License is still a proprietary placeholder pending a final decision.
- Dependency rules (ADR-0019, [Dependency-Rules.md](./docs/architecture/Dependency-Rules.md))
  are documented but not automated — nothing currently fails CI if a
  future PR violates them. Code review is the only enforcement today.
- CI (`.github/workflows/ci.yml`) has not been verified against an
  actual GitHub Actions run in this environment — only local
  equivalents of its jobs (`pnpm lint`/`type-check`/`build`) were run
  directly.

## Pending Discussions

- Receiving and swapping in the founder's real product documents
  (highest priority — current drafts are placeholders, not spec).
- Final license choice.
- Whether the ephemeral-session data store should be separate from
  PostgreSQL (flagged in ADR-0005's Future Implications, not yet
  decided).
- Verifying a real GitHub Actions CI run passes (only run locally so far).
- Verifying `apps/server` against a live PostgreSQL instance.
- Adding automated dependency-boundary enforcement before Milestone 1.0
  implementation begins (see ADR-0019 Future Implications).

## Future Roadmap

See [`ROADMAP.md`](./ROADMAP.md).
