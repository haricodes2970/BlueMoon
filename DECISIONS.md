# DECISIONS.md — ADR Index

Root-level index of every Architecture Decision Record. Full ADR
content (context, alternatives, consequences, tradeoffs) lives under
[`docs/adr`](./docs/adr) — this file is a map, not a duplicate.

Update this table whenever a new ADR is added or a status changes.
Never delete a row, even for superseded/deprecated ADRs — the history is
the point.

| ADR | Title | Status |
|---|---|---|
| [0001](./docs/adr/ADR-0001-project-structure.md) | Repository and Documentation Structure | Accepted |
| [0002](./docs/adr/ADR-0002-monorepo.md) | Monorepo | Accepted |
| [0003](./docs/adr/ADR-0003-nextjs.md) | Next.js for the Web Client | Accepted |
| [0004](./docs/adr/ADR-0004-hono.md) | Hono for the Backend API | Accepted |
| [0005](./docs/adr/ADR-0005-postgresql.md) | PostgreSQL for Persistent Storage | Accepted |
| [0006](./docs/adr/ADR-0006-drizzle.md) | Drizzle as the ORM/Query Layer | Accepted |
| [0007](./docs/adr/ADR-0007-tailwind.md) | Tailwind CSS for Styling | Accepted |
| [0008](./docs/adr/ADR-0008-shadcn.md) | shadcn/ui for Component Primitives | Accepted |
| [0009](./docs/adr/ADR-0009-zustand.md) | Zustand for Client State Management | Accepted |
| [0010](./docs/adr/ADR-0010-tanstack-query.md) | TanStack Query for Server State | Accepted |
| [0011](./docs/adr/ADR-0011-cloudflare-r2.md) | Cloudflare R2 for Object Storage | Accepted |
| [0012](./docs/adr/ADR-0012-railway.md) | Railway for Backend/Database Hosting | Accepted |
| [0013](./docs/adr/ADR-0013-vercel.md) | Vercel for Frontend Hosting | Accepted |
| [0014](./docs/adr/ADR-0014-typescript.md) | TypeScript Across the Stack | Accepted |
| [0015](./docs/adr/ADR-0015-turborepo.md) | Turborepo for Monorepo Task Orchestration | Accepted |
| [0016](./docs/adr/ADR-0016-pnpm-workspaces.md) | pnpm Workspaces as the Package Manager | Accepted |
| [0017](./docs/adr/ADR-0017-overall-architecture.md) | Overall Architecture — Modular Monolith, Clean Architecture, Platform/Product Split | Accepted |
| [0018](./docs/adr/ADR-0018-package-boundaries.md) | Package Boundaries — Six Fixed Packages | Accepted |
| [0019](./docs/adr/ADR-0019-dependency-rules.md) | Dependency Rules — Enforced Import Direction | Accepted |

## Adding a New ADR

1. Create `docs/adr/ADR-XXXX-kebab-case-title.md` using the template in
   [`docs/adr/README.md`](./docs/adr/README.md).
2. Add a row to the table above in the same commit.
3. If it supersedes an earlier ADR, update that ADR's status in both
   its own file and this table — don't delete the old row.

## See Also

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system overview these decisions implement
- [BLUEPRINT.md](./BLUEPRINT.md) — product intent behind these decisions
- [docs/adr/README.md](./docs/adr/README.md) — ADR template and lifecycle rules
