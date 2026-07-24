# Coding Standards

These standards apply once application code is introduced. They are
assumed defaults for BlueMoon/PINChat; deviations require an ADR.

## Language & Type Safety

- Strict TypeScript everywhere (`strict: true`, no implicit `any`).
- Prefer explicit types on public function signatures and module
  boundaries; inference is fine for local variables.
- No `// @ts-ignore` without a comment explaining why and a linked issue.

## Architecture

- Clean Architecture: dependencies point inward (domain has no
  dependency on frameworks, infra, or UI). Full layer definitions:
  [Backend-Architecture.md](../architecture/Backend-Architecture.md).
- SOLID principles, applied pragmatically — don't over-engineer for
  hypothetical requirements.
- Feature-first folder organization on the frontend: group
  product-specific logic by feature, not by technical layer. Full
  layer definitions: [Frontend-Architecture.md](../architecture/Frontend-Architecture.md).
- Workspace-level and cross-layer import rules are not optional style
  preferences — see [Dependency-Rules.md](../architecture/Dependency-Rules.md)
  for the enforced matrix.

## Naming Conventions

### Folder Naming

- `kebab-case` for all folders (`session-join/`, not `sessionJoin/` or
  `SessionJoin/`).
- Layer folder names match [Backend-Architecture.md](../architecture/Backend-Architecture.md)
  / [Frontend-Architecture.md](../architecture/Frontend-Architecture.md)
  exactly (`services/`, `repositories/`, `features/`, etc.) — don't
  invent synonyms (`helpers/` vs `utils/`, `views/` vs `pages/`).

### File Naming

- `kebab-case` for non-component files (`session.service.ts`,
  `format-date.ts`).
- `PascalCase` for React component files (`SessionCard.tsx`), matching
  the component's exported name.
- Suffix files by role where it disambiguates:  `*.service.ts`,
  `*.repository.ts`, `*.controller.ts`, `*.test.ts`, `*.types.ts`.
- One primary export per file where practical — a file's name should
  tell you what it exports without opening it.

### Identifiers

- Variables/functions: `camelCase`.
- Types/interfaces/classes: `PascalCase`.
- Constants: `SCREAMING_SNAKE_CASE` for true constants (module-level,
  never reassigned, meaningful on their own — not every `const`).
- Booleans: prefix with `is`, `has`, `should`, `can`.

## Folder Conventions

Layer folders inside each app follow
[Backend-Architecture.md](../architecture/Backend-Architecture.md) (for
`apps/server`) and [Frontend-Architecture.md](../architecture/Frontend-Architecture.md)
(for `apps/web`) exactly — those documents are the source of truth for
folder structure, not this file. `packages/*` folder responsibilities
are defined in [Package-Architecture.md](../architecture/Package-Architecture.md).

- Tests live next to the code they test (`*.test.ts` / `*.spec.ts`), not
  in a parallel `__tests__` tree, unless the framework requires it.

## Barrel Exports

- Allowed **only** at a package's public API boundary (`packages/*/src/index.ts`)
  — this is what other packages/apps import from.
- Not allowed inside a package or app's internal folders (e.g. no
  `features/session/index.ts` re-exporting everything in that feature).
  Internal barrels obscure what's actually used, slow down tooling, and
  make circular-dependency risk harder to see. Import directly from the
  specific file.

## Import Ordering

Enforced by ESLint (`tooling/eslint-config`) once the import-order rule
is added — see [TODO.md](../../TODO.md). Until then, follow manually:

1. External packages (`react`, `hono`, etc.)
2. Workspace packages (`@bluemoon/*`)
3. Internal absolute imports (app-local, e.g. `@/features/...`)
4. Relative imports (`./`, `../`)

Each group separated by a blank line; alphabetized within a group.

## Error Handling

- Never swallow errors silently (`catch {}` with no action). Either
  handle it meaningfully or let it propagate.
- Domain/service-layer errors are typed/discriminated (not generic
  `Error` with a string message parsed elsewhere) so callers can branch
  on error kind, not error text.
- Controllers/route handlers are the boundary that converts internal
  errors into HTTP responses — domain and service layers don't know
  about HTTP status codes.
- Client-side: errors from `services/` (TanStack Query) surface through
  its built-in error state, not ad hoc `try/catch` scattered through
  components.

## Logging

- Structured logging (not bare `console.log`) once a logger is chosen —
  tracked as a future decision, not yet an ADR.
- Log at the boundary where context is richest (e.g. in
  `middleware/`/`controllers/` for request-level context), not deep
  inside `domain/` where framework/request context isn't available.
- Never log secrets, tokens, or full message content (see
  [Product Vision & Philosophy](../product/product-vision-and-philosophy.md#2-privacy-by-default-not-as-an-upsell) —
  privacy-by-default applies to logs too).

## Comments

- Default to no comments — well-named identifiers should carry meaning.
- Write a comment only when the *why* isn't obvious from the code: a
  non-obvious constraint, a workaround for a specific bug, a subtle
  invariant. Never comment *what* the code does.
- No commented-out code committed — delete it; git history preserves it.

## Documentation

See [Documentation Conventions](#documentation-conventions) below —
duplicated here only as a pointer since it's a coding standard too:
architecture/behavior changes update `/docs` in the same change.

## Commit Conventions

- [Conventional Commits](https://www.conventionalcommits.org/) enforced
  via Commitlint.
- One logical change per commit.
- See [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for full detail.

## Testing Conventions

- New logic requires tests; bug fixes require a regression test.
- Unit tests for `domain/` (backend) and pure `lib/`/`utils` logic —
  these have zero infrastructure dependencies by design (see
  [Backend-Architecture.md](../architecture/Backend-Architecture.md#domain)),
  so they should never need a database, network, or mock server to test.
- Integration tests for `repositories/` (against a real/test database)
  and `services/` (crossing multiple layers).
- Component tests for `features/`/`components/` in `apps/web`; avoid
  testing `packages/ui` primitives' internals beyond accessibility and
  basic rendering — they're intentionally thin wrappers.
- Test names describe behavior: `it("rejects messages over the size limit")`,
  not `it("test1")`.
- A test runner has not yet been selected (see
  [ROADMAP.md](../../ROADMAP.md) Milestone 0.3 open items) — this
  section defines expectations, not tooling, until that's decided.

## Documentation Conventions

- Any change to architecture or public behavior updates the relevant
  doc under `/docs` in the same change.
- Significant technical decisions get an ADR under `docs/adr/` — see
  that folder's README for the template.
- Docs are Markdown, one topic per file, indexed by a folder README
  where a folder holds more than one file.

## Tooling

Configured as of Milestone 0.3 (see [ROADMAP.md](../../ROADMAP.md);
not yet verified via an actual `pnpm install` in this environment):

- ESLint + Prettier for lint/format (`tooling/eslint-config`,
  `tooling/prettier-config`).
- Husky + lint-staged for pre-commit enforcement (`.husky/`).
- Commitlint for commit message enforcement (`commitlint.config.js`).
- Turborepo for task orchestration ([ADR-0015](../adr/ADR-0015-turborepo.md)).
- A test runner is not yet selected — open item, see
  [ROADMAP.md](../../ROADMAP.md) Milestone 0.3.
