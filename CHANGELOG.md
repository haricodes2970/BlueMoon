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
- `DECISIONS.md` updated with ADR-0015 and ADR-0016.

### Fixed

- Stale "stack choice pending" notes in `docs/backend`, `docs/frontend`,
  `docs/api`, `docs/database`, `docs/deployment` READMEs, contradicting
  the ADRs that had already decided the stack.
