# Phase 0.3 — Engineering Environment

**Status: Complete** | **Dates:** 2026-07-24

## Purpose

Build a world-class development environment: pnpm/Turborepo monorepo
structure, shared tooling, CI scaffold, environment variable strategy
— all before any feature code, so every future contributor lands in a
fully-configured workspace.

## Goals

- Recommended, then generated, `apps/`/`packages/`/`tooling/` structure.
- Placeholder apps (`web`, `server`) and packages (`ui`, `config`,
  `types`, `utils`, `database`, `auth`) — structure only, no logic.
- Strict TypeScript project references, ESLint, Prettier, Husky,
  lint-staged, Commitlint, EditorConfig.
- Turborepo build system, recorded as an ADR.
- Environment variable strategy (dev/test/prod).
- `.github/` scaffold and a CI workflow skeleton (no deployment yet).

## Tasks

- [x] pnpm workspace structure confirmed before generating
- [x] `apps/web`, `apps/server` placeholders
- [x] `packages/{ui,config,types,utils,database,auth}` placeholders
- [x] `tooling/{typescript-config,eslint-config,prettier-config}`
- [x] Root `tsconfig.json` project references
- [x] ESLint, Prettier, EditorConfig
- [x] Husky + lint-staged + Commitlint
- [x] Turborepo (ADR-0015) + pnpm workspaces formally recorded (ADR-0016)
- [x] Environment variable strategy + per-app `.env.example`
- [x] `.github/`: issue templates, PR template, CODEOWNERS, Dependabot
- [x] CI workflow skeleton (lint, type-check, test, build, docs-validate)

## Completed Work

Recommended the target structure (`apps/`, `packages/`, `tooling/`,
`docs/`) before generating anything, per instruction. Created every
app/package as a structure-only placeholder (`package.json`, `tsconfig.json`,
`README.md`, no `src/` logic). Shared tooling packages
(`@bluemoon/typescript-config`, `@bluemoon/eslint-config`,
`@bluemoon/prettier-config`) consumed via `workspace:*`. Root
`tsconfig.json` with project references to every app/package. Husky
`pre-commit` (lint-staged) and `commit-msg` (Commitlint) hooks —
not yet activated (`pnpm install` hadn't been run in this environment
yet at this phase). `turbo.json` task pipeline; both Turborepo and pnpm
workspaces formally recorded as ADRs (0015, 0016) since ADR-0002 had
established "a monorepo" without specifying the concrete tooling.
`docs/engineering/environment-strategy.md` documenting dev/test/prod
variable handling, `NEXT_PUBLIC_` prefix convention, no-secrets-in-repo
rule. `.github/` scaffold: issue templates (bug report, feature
request), PR template, `CODEOWNERS`, Dependabot config, and a CI
workflow skeleton covering lint/type-check/test/build/docs-validate —
deliberately no deployment job yet.

## Files Created

`pnpm-workspace.yaml`, root `package.json`, `turbo.json`, `tsconfig.json`,
`.eslintrc.json`, `.editorconfig`, `.prettierignore`, `commitlint.config.js`,
`.husky/{pre-commit,commit-msg}`, `apps/{web,server}/*` (placeholders),
`packages/{ui,config,types,utils,database,auth}/*` (placeholders),
`tooling/{typescript-config,eslint-config,prettier-config}/*`,
`docs/adr/ADR-0015-turborepo.md`, `docs/adr/ADR-0016-pnpm-workspaces.md`,
`docs/engineering/environment-strategy.md`, `.github/*` (templates,
CODEOWNERS, dependabot.yml, workflows/ci.yml).

## Files Modified

`.gitignore` (env file patterns), `CLAUDE.md`, `ROADMAP.md`, `CHANGELOG.md`,
`DECISIONS.md`, `docs/engineering/Engineering-Journal.md` (added).

## Architecture Decisions

ADR-0015 (Turborepo for task orchestration), ADR-0016 (pnpm workspaces
as the package manager).

## Problems Found

None structural — this phase's risk (an untested workspace) was
explicitly deferred and caught in Phase 0.5, when `pnpm install` was
actually run for the first time.

## Problems Solved

N/A for this phase specifically — see Phase 0.5 for the real bugs
`pnpm install` surfaced once it was actually run.

## Quality Gate Results

Not run in this phase — the workspace was scaffolded but `pnpm install`
had not yet been executed. Marked as an open item at the time; closed
in Phase 0.5.

## Lessons Learned

Scaffolding a workspace's configuration is not the same as verifying
it works — several real bugs (ESLint 9 flat-config requirement, missing
`dist/` builds, ESM/CJS mismatches) were latent in this phase's output
and only surfaced once `pnpm install` actually ran in Phase 0.5. Future
phases should run install/build gates as early as possible rather than
deferring verification.

## Next Phase

[Phase-0.4.md](./Phase-0.4.md) — Core Architecture: system-wide
architecture design (style, package boundaries, dependency rules,
backend/frontend layering) before any implementation.
