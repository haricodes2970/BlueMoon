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

Documentation, architecture direction, and technology decisions are
being established before feature implementation begins. No application
code has been written yet.

## Current Milestone

**Milestone 0.4 — Core Architecture** (in progress)

Designed the architecture every future feature must follow: overall
style (modular monolith, Clean Architecture, platform/product split),
exact `packages/*` responsibilities, the enforced dependency/import
matrix, backend layer structure (`routes` through `events`), frontend
layer structure (`app` through `assets`), and expanded coding standards
(naming, barrel exports, import order, error handling, logging,
comments). Three new ADRs (0017–0019). No messaging, auth, or database
entities implemented — architecture-only, per this milestone's scope.

## Active Tasks

- [ ] Replace Draft v1 product documents with the founder's actual
      approved documents (see Known Limitations — current drafts were
      assistant-authored, not real product specs) — **still the
      top-priority blocker, carried over from Milestone 0.2**
- [ ] Founder review of Architecture Overview, Tech Stack Decision, and
      all five new Milestone 0.4 architecture documents
- [ ] Add automated dependency-rule enforcement (`eslint-plugin-boundaries`
      or equivalent) — currently code-review-only, see ADR-0019
- [ ] Validate the three hypothesis personas with real user research
- [ ] Choose final license and update `LICENSE`
- [ ] Run `pnpm install` to activate Husky hooks and verify the
      workspace installs cleanly (not yet executed/verified)
- [ ] Begin Milestone 1.0 (PINChat MVP) once 0.2, 0.3, and 0.4 are
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

| Area | Path |
|---|---|
| Product (source of truth) | [`docs/product`](./docs/product) |
| Architecture overview & tech stack | [`docs/architecture`](./docs/architecture) |
| ADR log (19 records as of Milestone 0.4) | [`docs/adr`](./docs/adr) |
| System / Package / Dependency / Backend / Frontend architecture | [`docs/architecture/{System,Package,Dependency-Rules,Backend,Frontend}-Architecture.md`](./docs/architecture) |
| Engineering standards | [`docs/engineering`](./docs/engineering) |
| Engineering journal (chronological milestone log) | [`docs/engineering/Engineering-Journal.md`](./docs/engineering/Engineering-Journal.md) |
| Environment variable strategy | [`docs/engineering/environment-strategy.md`](./docs/engineering/environment-strategy.md) |
| Backend / Frontend / API / Database / Deployment / Security | `docs/{backend,frontend,api,database,deployment,security}` — index stubs only, populated as each area is implemented |
| Meeting notes | [`docs/meeting-notes`](./docs/meeting-notes) |
| Workspace apps | [`apps/`](./apps) — `web` (frontend), `server` (backend), both placeholders |
| Workspace packages | [`packages/`](./packages) — `ui`, `config`, `types`, `utils`, `database`, `auth`, all placeholders |
| Shared tooling | [`tooling/`](./tooling) — `typescript-config`, `eslint-config`, `prettier-config` |
| Roadmap | [`ROADMAP.md`](./ROADMAP.md) |
| Changelog | [`CHANGELOG.md`](./CHANGELOG.md) |

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
writing: ADR-0001 through ADR-0019, covering repository structure, the
full technology stack, build tooling, and core architecture (overall
style, package boundaries, dependency rules) for PINChat.

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
- No application code exists yet (by design). `apps/*`, `packages/*`,
  and `tooling/*` are structure and config only as of Milestone 0.3.
- The workspace has not been installed or run (`pnpm install` has not
  been executed in this environment) — configs are believed correct
  but unverified. Husky hooks are inactive until install runs.
- License is still a proprietary placeholder pending a final decision.
- Dependency rules (ADR-0019, [Dependency-Rules.md](./docs/architecture/Dependency-Rules.md))
  are documented but not automated — nothing currently fails CI if a
  future PR violates them. Code review is the only enforcement today.
- Architecture documented in Milestone 0.4 has no application code
  exercising it yet — the layer split (e.g. `domain/` with zero
  infrastructure deps) is a design intent, unverified against real
  implementation.

## Pending Discussions

- Receiving and swapping in the founder's real product documents
  (highest priority — current drafts are placeholders, not spec).
- Final license choice.
- Whether the ephemeral-session data store should be separate from
  PostgreSQL (flagged in ADR-0005's Future Implications, not yet
  decided).
- Verifying the pnpm workspace installs and CI passes once real
  dependencies are added.
- Adding automated dependency-boundary enforcement before Milestone 1.0
  implementation begins (see ADR-0019 Future Implications).

## Future Roadmap

See [`ROADMAP.md`](./ROADMAP.md).
