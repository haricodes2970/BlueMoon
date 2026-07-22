# Contributing to BlueMoon

## Guiding Principle

Documentation is treated as production code. Whenever a change affects
architecture, behavior, or conventions, update the relevant documentation in
the same change set — never after the fact.

## Workflow

1. Check [`CLAUDE.md`](./CLAUDE.md) and [`ROADMAP.md`](./ROADMAP.md) for
   current phase and active tasks before starting work.
2. Significant technical decisions require an Architecture Decision Record
   (ADR) under [`docs/adr`](./docs/adr). See that folder's README for the
   template and numbering scheme.
3. Branch from `main`. Use short-lived feature branches.
4. Keep commits small and meaningful — one logical change per commit.
5. Update [`CHANGELOG.md`](./CHANGELOG.md) for any user- or API-facing change.

## Commit Conventions

This repository follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, `revert`.

Examples:

```
docs(adr): add ADR-0002 authentication strategy
feat(api): add message delivery endpoint
fix(frontend): correct message ordering in thread view
```

Never generate commits with vague messages ("update", "wip", "fix stuff").
Every commit should be independently understandable from its message.

## Code Quality Expectations

Once application code exists, the repository enforces:

- Strict TypeScript
- ESLint + Prettier
- Husky pre-commit hooks + lint-staged
- Commitlint (enforces Conventional Commits)
- Automated tests for new logic
- Clean Architecture / SOLID principles
- Feature-first folder organization

See [`docs/engineering/coding-standards.md`](./docs/engineering/coding-standards.md)
for details.

## Pull Requests

- Reference the related ADR or roadmap item where applicable.
- Describe what changed and why, not just what.
- Ensure documentation is updated before requesting review.
