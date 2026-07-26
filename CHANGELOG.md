# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Repository scaffold: `.gitignore`, `README.md`, `LICENSE` (placeholder),
  `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- `CLAUDE.md` persistent engineering memory file.
- `ROADMAP.md` progress tracking file.
- `/docs` directory structure (architecture, product, engineering,
  security, backend, frontend, api, database, deployment, adr,
  meeting-notes).
- ADR system with ADR-0001 (project structure).
- Engineering coding standards document.
- Draft v1 product documentation: literature survey, product blueprint,
  product vision & philosophy, user personas & research, user journey &
  flow specification — cross-linked, pending founder review.
- `docs/architecture/Architecture-Overview.md` (principles, system
  boundaries, future modules, design philosophy).
- `docs/architecture/Tech-Stack-Decision.md` summarizing the full stack.
- ADR-0002 through ADR-0014: monorepo, Next.js, Hono, PostgreSQL,
  Drizzle, Tailwind, shadcn/ui, Zustand, TanStack Query, Cloudflare R2,
  Railway, Vercel, TypeScript.
- Root navigation files: `BLUEPRINT.md`, `ARCHITECTURE.md`,
  `DECISIONS.md`, `TODO.md`.
- Product Documentation Policy in `CLAUDE.md` (freezes `/docs/product`
  against silent AI rewrites).
- `docs/engineering/Engineering-Journal.md` — chronological
  per-milestone log.
- pnpm workspace: `apps/{web,server}`,
  `packages/{ui,config,types,utils,database,auth}`,
  `tooling/{typescript-config,eslint-config,prettier-config}` —
  structure and configuration only, no application code.
- Root `tsconfig.json` (project references), ESLint, Prettier,
  `.editorconfig`.
- Husky pre-commit/commit-msg hooks, lint-staged, Commitlint.
- `turbo.json` Turborepo pipeline (ADR-0015); pnpm workspaces formally
  recorded as ADR-0016.
- `docs/engineering/environment-strategy.md` + per-app `.env.example`
  (`apps/web`, `apps/server`).
- `.github/`: issue templates, PR template, `CODEOWNERS`,
  `dependabot.yml`, CI workflow skeleton (lint, type-check, test,
  build, docs-validate — no deployment job).
- `docs/architecture/System-Architecture.md`: overall style (modular
  monolith, Clean Architecture, platform/product split), dependency
  direction, boundaries, system diagram, validation/risks pass.
- `docs/architecture/Package-Architecture.md`: exact responsibility for
  each of the six `packages/*`, package-addition justification process.
- `docs/architecture/Dependency-Rules.md`: full import matrix, backend/
  frontend layer rules, enforcement status.
- `docs/architecture/Backend-Architecture.md`: `apps/server` layers
  (routes through events) with diagram.
- `docs/architecture/Frontend-Architecture.md`: `apps/web` layers (app
  router through assets) with diagram.
- ADR-0017 (overall architecture), ADR-0018 (package boundaries),
  ADR-0019 (dependency rules).
- `packages/types`: `Environment`, `ApiResponse<T>`, typed `ErrorCode`/
  `ApiErrorBody`, `HealthCheckResponse`.
- `packages/utils`: pino-based `createLogger`/`withRequestId`, date/id
  helpers, `Result<T, E>`, `AppError` class hierarchy.
- `packages/config`: Zod `baseEnvSchema`/`extendEnvSchema`, fail-fast
  `loadEnv()`.
- `packages/database`: Drizzle + `postgres.js` connection, migration
  config, seed entry point, `checkDatabaseConnection()` — no business
  schema.
- `packages/auth`: placeholder exports (`createSession`/`joinSession`/
  `expireSession`, all throw "not implemented").
- `apps/server`: working Hono app — `@hono/zod-openapi`, request-ID
  middleware, centralized error handler, `GET /health`,
  `GET /openapi.json`, `GET /docs`.
- `apps/web`: working Next.js App Router app — Tailwind + shadcn/ui
  token setup and one primitive (`Button`), TanStack Query provider.
- ADR-0020 (logging), ADR-0021 (configuration), ADR-0022 (error
  handling).
- Identity domain schema in `packages/database`: `users`, `devices`,
  `trusted_devices`, `sessions`, `refresh_tokens`, `login_attempts`,
  `audit_events` (migration generated, not yet applied to a live DB).
- Identity domain layer in `apps/server`
  (`src/domain/identity`): `Username`/`Credential` value objects,
  entities, session-lifetime + lockout rules, typed domain errors.
- Identity infrastructure (`src/infrastructure/identity`): Argon2id
  hashing, JWT access tokens, opaque rotating refresh tokens, in-memory
  rate limiter, audit writer.
- Identity repositories (`src/repositories/identity`): one per entity.
- Identity application layer (`src/services/identity`): register,
  login, logout, refresh-session (rotation + reuse detection),
  revoke-session, trust-device/revoke-device-trust, change-credential
  use cases; Zod validation schemas (`src/validation/identity`); output
  DTOs stripping internal user fields.
- `docs/security/Authentication.md`, `Session-Management.md`,
  `docs/database/Identity-Schema.md`.
- ADR-0023 (identity domain model), ADR-0024 (session strategy),
  ADR-0025 (credential authentication).

### Changed

- `CLAUDE.md` updated for Milestone 0.2 (current milestone, completed/
  active tasks, architecture goals, documentation index).
- `ROADMAP.md` restructured around explicit milestones (0.1–1.0) with
  status and completion criteria.
- `docs/backend`, `docs/frontend`, `docs/api`, `docs/database`,
  `docs/deployment` index stubs updated to reference the now-decided
  stack instead of saying it was still pending.
- `CLAUDE.md` updated for Milestone 0.3; flagged that `docs/product/`
  drafts are assistant-authored, not the founder's real specification,
  pending replacement.
- `ROADMAP.md` updated: Milestone 0.2 marked blocked on real product
  docs; Milestone 0.3 (renamed from "Tooling & CI" to "Engineering
  Environment") tracked with unverified-install caveat.
- `CONTRIBUTING.md` gained a Quality Gates section.
- `DECISIONS.md` updated with ADR-0015 through ADR-0019.
- `docs/engineering/coding-standards.md` expanded: folder/file naming,
  barrel export policy, import ordering, error handling, logging,
  comments, and testing conventions mapped to the new architecture
  layers.
- All six `packages/*/README.md` linked to their
  `Package-Architecture.md` entry.
- `CLAUDE.md`, `ROADMAP.md`, and the Engineering Journal updated for
  Milestone 0.4.
- `CLAUDE.md`, `ROADMAP.md`, `DECISIONS.md`, and the Engineering
  Journal updated for Milestone 0.5; Milestone 0.3 marked Complete now
  that `pnpm install`/lint/build have actually been verified.
- `CLAUDE.md`, `ROADMAP.md`, `DECISIONS.md`, `TODO.md`, and the
  Engineering Journal updated for Milestone 0.6.
- `apps/server/package.json` gained `drizzle-orm` as an explicit
  dependency (was only reachable transitively through
  `packages/database`).
- `tsBuildInfoFile` set to live inside `dist/` for every package/app
  with an `outDir` (previously defaulted to living next to
  `tsconfig.json`).

### Fixed

- Stale "stack choice pending" notes in `docs/backend`, `docs/frontend`,
  `docs/api`, `docs/database`, `docs/deployment` READMEs, contradicting
  the ADRs that had already decided the stack.
- ESLint 9 flat-config migration across the whole workspace (tooling
  shipped legacy `.eslintrc` format; `eslint` was never an actual
  installed dependency anywhere).
- Shared packages (`types`, `utils`, `config`, `database`, `auth`)
  compiled to `dist/` with `package.json` `main`/`types` pointing
  there, so `node` can resolve them in a real production start (they
  previously pointed straight at raw `.ts` source).
- `"type": "module"` added consistently across packages, fixing
  ESM/CJS named-export interop under tsx/Node; every package's
  `eslint.config.js` renamed to `.cjs` since that change broke
  ESLint's config-file resolution.
- `eslint-config-next`'s parser doesn't satisfy typescript-eslint's
  parser-services check (crashed `consistent-type-imports`) and
  doesn't track type-only-import usage correctly (false "unused"
  errors) — reordered the Next config so the shared base wins; disabled
  Next's redundant build-time ESLint pass in favor of the dedicated
  `pnpm lint` gate.
- `packages/ui` given a minimal empty placeholder so the workspace-wide
  `type-check`/`build` gates pass (it remains out of scope otherwise).
- Root-caused and fixed a reproducible `tsc` build race: composite TS
  projects write their incremental cache next to `tsconfig.json` by
  default, not inside `outDir`, so `rm -rf dist` (used ad hoc in
  Milestones 0.5/0.6) never invalidated it and `tsc` sometimes silently
  skipped re-emitting files it wrongly believed were still current.
