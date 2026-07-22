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

### Changed

- `CLAUDE.md` updated for Milestone 0.2 (current milestone, completed/
  active tasks, architecture goals, documentation index).
- `ROADMAP.md` restructured around explicit milestones (0.1–1.0) with
  status and completion criteria.
- `docs/backend`, `docs/frontend`, `docs/api`, `docs/database`,
  `docs/deployment` index stubs updated to reference the now-decided
  stack instead of saying it was still pending.
