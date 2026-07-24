# Dependency Rules

**Status: Draft v1 — authored 2026-07-24, pending review**

Enforced (or to-be-enforced — see [Enforcement](#enforcement)) import
rules across the workspace. Every rule here follows from
[System-Architecture.md](./System-Architecture.md#dependency-direction).

## Workspace-Level Rules

1. **Apps may depend on packages. Packages must never depend on apps.**
   `packages/*` code cannot import anything from `apps/*`. This is what
   keeps packages reusable across future products.
2. **`packages/ui` cannot depend on server-only packages.** `packages/ui`
   must not import `packages/database` or `packages/auth`'s server-side
   internals — a UI primitive has no business talking to a database.
3. **`packages/database` cannot depend on frontend packages.**
   `packages/database` must not import `packages/ui`. Database access
   has no UI concern.
4. **`packages/types` and `packages/utils` are leaves.** They may depend
   on each other's exported types/functions where genuinely needed
   (rare), but must not depend on `packages/auth`, `packages/database`,
   `packages/ui`, or `packages/config`. Everything else may depend on
   `types`/`utils`; they depend on nothing else in the workspace.
5. **`packages/config` may depend on `packages/types` and
   `packages/utils` only.** It must not depend on `packages/auth`,
   `packages/database`, or `packages/ui`.
6. **`apps/web` must never depend on `apps/server` (or vice versa).**
   Communication crosses the process boundary via the HTTP/WebSocket API
   only, never a direct import.
7. **Everything may depend on `tooling/*` as a dev dependency only**
   (configs), never as a runtime dependency.

## Import Matrix

`✓` = allowed, `—` = forbidden. Rows import columns.

| From \ To | auth | database | types | utils | ui | config | apps/web | apps/server |
|---|---|---|---|---|---|---|---|---|
| **auth** | — | ✓ (see note) | ✓ | ✓ | — | — | — | — |
| **database** | — | — | ✓ | ✓ | — | — | — | — |
| **types** | — | — | — | ✓ (rare) | — | — | — | — |
| **utils** | — | — | ✓ (rare) | — | — | — | — | — |
| **ui** | — | — | ✓ | ✓ | — | — | — | — |
| **config** | — | — | ✓ | ✓ | — | — | — | — |
| **apps/web** | — | — | ✓ | ✓ | ✓ | ✓ | — | — |
| **apps/server** | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | — |

Note: `packages/auth` may depend on `packages/database` if session
persistence requires it (e.g. storing active sessions) — this is the
one intentional exception to "packages don't depend on other
capability packages," justified because session persistence is
inherent to what `auth` owns. Any other cross-capability package
dependency (e.g. `ui` depending on `auth`) requires a new ADR before
being added.

## Backend Layer Rules (within apps/server)

See [Backend-Architecture.md](./Backend-Architecture.md) for full layer
definitions. Summary rule: dependencies point inward.

```
routes → controllers → services → repositories → domain
middleware, validation → controllers (not domain directly)
infrastructure → repositories, domain
websocket, jobs, events → services (same as routes)
```

`domain` must not import from `routes`, `controllers`, `services`,
`repositories`, `infrastructure`, `middleware`, `websocket`, `jobs`, or
`events`. It may only depend on `packages/types` and `packages/utils`.

## Frontend Layer Rules (within apps/web)

See [Frontend-Architecture.md](./Frontend-Architecture.md) for full
layer definitions. Summary rule:

```
app (routes/layouts) → features → components, hooks, services, stores
providers → wrap app, may be imported by app/layouts
lib → imported by anything (pure helpers, framework glue)
```

`components` (generic, reusable) must not import from `features`
(product-specific composition) — that dependency only goes one
direction, matching `packages/ui`'s "shared, not product-specific" rule
applied inside the app.

## Enforcement

**Currently: code review only.** No automated lint rule enforces this
matrix yet — flagged as a risk in
[System-Architecture.md](./System-Architecture.md#validation--risks).

Planned (tracked in [TODO.md](../../TODO.md), not yet implemented):
add `eslint-plugin-boundaries` (or equivalent) to
`tooling/eslint-config`, configured against the matrix above, so
violations fail `pnpm lint` / CI instead of relying on reviewers to
catch them.

## Related Documents

- [System-Architecture.md](./System-Architecture.md)
- [Package-Architecture.md](./Package-Architecture.md)
- [Backend-Architecture.md](./Backend-Architecture.md)
- [Frontend-Architecture.md](./Frontend-Architecture.md)
