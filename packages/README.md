# packages/

Shared code consumed by `apps/*`, published internally as workspace
packages (not published to a public registry).

- [`ui`](./ui) — shared UI component primitives
- [`config`](./config) — runtime app configuration / env parsing
- [`types`](./types) — shared TypeScript types/contracts
- [`utils`](./utils) — framework-agnostic utility functions
- [`database`](./database) — Drizzle schema, migrations, queries
- [`auth`](./auth) — session/identity primitives

All are structure-only placeholders as of Milestone 0.3 — no
functionality implemented yet. See [ROADMAP.md](../ROADMAP.md)
Milestone 1.0.
