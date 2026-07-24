# Engineering Journal

Chronological log of completed milestones. One short entry per
milestone completion — not per commit. Purpose: fast human/AI review
without reading every commit or ADR individually. Newest entry on top.

Entry format:

```
## YYYY-MM-DD

Milestone X.Y

Completed
- ...

Decisions
- ...

Problems
- ...

Next
- ...
```

---

## 2026-07-24

Milestone 0.4

Completed
- System-Architecture.md: modular monolith + Clean Architecture +
  platform/product split, dependency direction, system diagram,
  validation pass (circular deps, scalability, testability, future
  products, DX) with identified risks
- Package-Architecture.md: exact responsibility for each of the six
  packages, "shared, not product-specific" rule, add-a-package process
- Dependency-Rules.md: full import matrix, backend/frontend layer
  rules, one documented exception (auth -> database), enforcement gap
  flagged (code review only, no automated check yet)
- Backend-Architecture.md: routes/controllers/services/domain/
  repositories/infrastructure/middleware/validation/websocket/jobs/
  events, with diagram
- Frontend-Architecture.md: app/layouts/features/components/hooks/
  services/stores/lib/providers/assets, with diagram
- Expanded coding-standards.md: folder/file naming, barrel export
  policy (public API boundary only), import ordering, error handling,
  logging, comments, expanded testing conventions mapped to the new
  layers
- ADR-0017 (overall architecture), ADR-0018 (package boundaries),
  ADR-0019 (dependency rules)

Decisions
- Modular monolith + Clean Architecture + platform/product split
  (ADR-0017)
- Six fixed packages, justification required to add more (ADR-0018)
- Enforced import matrix, currently review-only (ADR-0019)

Problems
- No automated enforcement of dependency rules yet — nothing fails CI
  if a future PR violates the import matrix. Flagged as a pre-1.0
  requirement, not yet scheduled with a milestone.
- Architecture is unverified against real code — no application code
  exists yet, so layer boundaries (e.g. domain/ zero-infra-deps) are
  design intent only.
- Milestones 0.2 and 0.3 still open (real product docs not received;
  workspace install not verified) — 0.4 proceeded in parallel per
  explicit instruction, not because those blockers cleared.

Next
- Founder review/sign-off on all five Milestone 0.4 architecture docs
- Add eslint-plugin-boundaries (or equivalent) before Milestone 1.0
  implementation starts
- Still pending: real product docs, verified pnpm install/CI
- Begin Milestone 1.0 once 0.2/0.3/0.4 are all actually closed out

---

## 2026-07-24

Milestone 0.3

Completed
- pnpm workspace scaffold: `apps/{web,server}`, `packages/{ui,config,
  types,utils,database,auth}`, `tooling/{typescript-config,eslint-config,
  prettier-config}` — structure and config only, no feature code
- Root TypeScript project references, strict ESLint, Prettier,
  EditorConfig
- Husky pre-commit/commit-msg hooks, lint-staged, Commitlint
- Turborepo task pipeline; environment variable strategy doc +
  per-app `.env.example`
- `.github/` scaffold: issue/PR templates, CODEOWNERS, Dependabot, CI
  workflow (lint/type-check/test/build/docs-validate, no deploy job)
- Added Engineering Journal itself (this file)

Decisions
- Turborepo (ADR-0015)
- pnpm workspaces (ADR-0016)

Problems
- Workspace has not actually been installed or run — `pnpm install`
  not executed in this environment, CI not yet verified against a real
  PR. Treat all tooling as unverified until confirmed.
- Milestone 0.2 still blocked: product docs under `docs/product/` are
  assistant-authored drafts, not the founder's real specification —
  corrected by the founder (2026-07-23) but real documents not yet
  received.

Next
- Get `pnpm install` run and CI verified green
- Receive and swap in real product documents (highest priority)
- Deploy pipelines to Railway/Vercel (deliberately deferred, not part
  of 0.3)
- Begin Milestone 1.0 once 0.2 and 0.3 are both actually closed out

---

## 2026-07-22

Milestone 0.1

Completed
- Repository scaffold (root standards files, .gitignore)
- `/docs` directory structure (11 areas)
- ADR system + ADR-0001 (project/documentation structure)
- CLAUDE.md, ROADMAP.md, CHANGELOG.md
- Engineering coding standards document

Decisions
- ADR-0001: docs/adr system, CLAUDE.md as persistent memory

Problems
- None

Next
- Draft product documentation
- Define architecture direction and tech stack

---

## 2026-07-22

Milestone 0.2

Completed
- Architecture overview (principles, boundaries, future modules)
- Tech stack decision summary
- ADR-0002 through ADR-0014 (full technology stack)
- Root navigation files: BLUEPRINT.md, ARCHITECTURE.md, DECISIONS.md,
  TODO.md
- Product Documentation Policy added to CLAUDE.md (freeze `/docs/product`
  against silent AI rewrites)

Decisions
- Monorepo (ADR-0002)
- Next.js (ADR-0003)
- Hono (ADR-0004)
- PostgreSQL (ADR-0005)
- Drizzle (ADR-0006)
- Tailwind (ADR-0007)
- shadcn/ui (ADR-0008)
- Zustand (ADR-0009)
- TanStack Query (ADR-0010)
- Cloudflare R2 (ADR-0011)
- Railway (ADR-0012)
- Vercel (ADR-0013)
- TypeScript (ADR-0014)

Problems
- Ephemeral session data store vs. PostgreSQL — unresolved (see
  ADR-0005 Future Implications)
- Product docs were initially drafted from an assistant-authored guess
  rather than the founder's actual approved documents — corrected;
  awaiting real documents to replace the drafts before Milestone 0.2
  can be marked complete

Next
- Replace draft product docs with approved v1.0.0 documents
- Founder review of architecture docs
- Begin Milestone 0.3 (tooling & CI)
