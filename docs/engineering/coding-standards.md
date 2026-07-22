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
  dependency on frameworks, infra, or UI).
- SOLID principles, applied pragmatically — don't over-engineer for
  hypothetical requirements.
- Feature-first folder organization: group by feature/domain, not by
  technical layer (`features/messaging/`, not `controllers/`,
  `services/`, `models/` at the root).

## Naming Conventions

- Files: `kebab-case` for non-component files, `PascalCase` for React
  components.
- Variables/functions: `camelCase`.
- Types/interfaces/classes: `PascalCase`.
- Constants: `SCREAMING_SNAKE_CASE` for true constants.
- Booleans: prefix with `is`, `has`, `should`, `can`.

## Folder Conventions

- `src/features/<feature>/` — feature-owned code (components, hooks,
  services, types scoped to that feature).
- `src/shared/` — cross-feature utilities, UI primitives, types.
- `src/config/` — environment and app configuration.
- Tests live next to the code they test (`*.test.ts` / `*.spec.ts`), not
  in a parallel `__tests__` tree, unless the framework requires it.

## Commit Conventions

- [Conventional Commits](https://www.conventionalcommits.org/) enforced
  via Commitlint.
- One logical change per commit.
- See [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for full detail.

## Testing Conventions

- New logic requires tests; bug fixes require a regression test.
- Unit tests for domain/business logic, integration tests for
  cross-boundary behavior (API, database).
- Test names describe behavior: `it("rejects messages over the size limit")`,
  not `it("test1")`.

## Documentation Conventions

- Any change to architecture or public behavior updates the relevant
  doc under `/docs` in the same change.
- Significant technical decisions get an ADR under `docs/adr/` — see
  that folder's README for the template.
- Docs are Markdown, one topic per file, indexed by a folder README
  where a folder holds more than one file.

## Tooling (planned, see ROADMAP Milestone 0.3)

- ESLint + Prettier for lint/format.
- Husky + lint-staged for pre-commit enforcement.
- Commitlint for commit message enforcement.
