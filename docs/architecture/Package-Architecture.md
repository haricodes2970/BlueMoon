# Package Architecture

**Status: Draft v1 — authored 2026-07-24, pending review**

Exact responsibilities for each of the six `packages/*` workspace
packages. Nothing else is added to `packages/` without the
justification process below. No implementation is specified here — see
[Backend-Architecture.md](./Backend-Architecture.md) and
[Frontend-Architecture.md](./Frontend-Architecture.md) for how apps
consume these packages.

## The "Shared, Not Product-Specific" Rule

A package belongs in `packages/*` only if it is a **capability** usable
by more than one current-or-future app without modification —
consistent with the platform/product split in
[System-Architecture.md](./System-Architecture.md#architectural-style).
If logic only ever makes sense for PINChat specifically, it belongs in
`apps/web` or `apps/server`, not in a shared package.

## packages/auth

**Owns:** session/PIN issuance, session lifecycle (create, join, expire),
the optional ephemeral-session → persisted-contact upgrade path, and
any future durable-identity primitives.

**Does not own:** HTTP route handlers, request validation, UI — those
are `apps/server` concerns that *use* this package.

**Why shared:** every future BlueMoon product (Communities, Voice,
Video) needs the same "session/PIN as the unit of access" primitive
described in
[Architecture Overview](./Architecture-Overview.md#architectural-principles).
Duplicating it per product would violate "platform, not app."

## packages/database

**Owns:** Drizzle schema definitions, migrations, and the query layer
for PostgreSQL (per [ADR-0005](../adr/ADR-0005-postgresql.md),
[ADR-0006](../adr/ADR-0006-drizzle.md)).

**Does not own:** business rules about *when* a row should be written
(that's a `apps/server` service-layer concern, see
[Backend-Architecture.md](./Backend-Architecture.md)) — this package
provides the mechanism, not the policy.

**Why shared:** future products' backends will need database access
using the same connection/schema conventions; centralizing migrations
avoids divergent schema-management approaches per product.

## packages/types

**Owns:** shared TypeScript types/contracts — API request/response
shapes, domain entity shapes referenced across app boundaries (e.g. a
`Session` type used by both `apps/web` and `apps/server`).

**Does not own:** internal types private to a single app or package
(those stay local to that app/package, not hoisted here by default).

**Why shared:** this is the mechanism that makes end-to-end type safety
(ADR-0014) possible across the client/server boundary without manual
duplication or codegen.

## packages/utils

**Owns:** small, pure, framework-agnostic utility functions with no
side effects and no business meaning on their own (e.g. string
formatting, date helpers, ID generation helpers).

**Does not own:** anything that encodes a BlueMoon-specific business
rule. A function that decides *when* a session expires is domain logic
(belongs in `apps/server`'s domain layer or `packages/auth`), not a
"utility," even though it might look like a small pure function.
This distinction is the main scope-creep risk flagged in
[System-Architecture.md](./System-Architecture.md#validation--risks) —
when reviewing a PR that adds to `packages/utils`, ask "would this
function make sense in a project with no BlueMoon domain knowledge at
all?" If no, it doesn't belong here.

**Why shared:** genuinely generic helpers are needed by both frontend
and backend, and every future product.

## packages/ui

**Owns:** shared UI component primitives (shadcn/ui-based, per
[ADR-0008](../adr/ADR-0008-shadcn.md)) — buttons, dialogs, inputs, and
other visual building blocks with no PINChat-specific business logic
embedded.

**Does not own:** PINChat-specific composed views (a "session join
screen" is a feature in `apps/web`, built *from* `packages/ui`
primitives, not itself part of `packages/ui`). See
[Frontend-Architecture.md](./Frontend-Architecture.md#features).

**Why shared:** every future BlueMoon web client (not just PINChat)
should look and behave consistently without rebuilding primitives.

## packages/config

**Owns:** typed parsing/validation of environment variables and runtime
configuration, consumed by both `apps/web` and `apps/server` (see
[environment-strategy.md](../engineering/environment-strategy.md)).

**Does not own:** the actual `.env.example` files (those stay per-app,
since each app has a different variable set) — this package owns *how*
variables are parsed and validated, not *which* variables exist for a
given app.

**Why shared:** consistent, type-safe config loading/validation
behavior across every app, rather than each app inventing its own.

## Adding a New Package

A new `packages/*` entry requires, in the same PR:

1. Justification against the "shared, not product-specific" rule above
   — what capability is this, and which two or more apps need it?
2. An entry added to this document (same structure as above).
3. An entry added to
   [System-Architecture.md](./System-Architecture.md#package-boundaries-summary)'s
   summary table.
4. Confirmation it doesn't duplicate responsibility already owned by an
   existing package (if it's a variant of an existing responsibility,
   extend that package instead).

Absent this, new shared logic belongs inside the consuming app until a
second consumer actually exists — do not create a package speculatively
for a future product that doesn't have code yet.

## Related Documents

- [System-Architecture.md](./System-Architecture.md)
- [Dependency-Rules.md](./Dependency-Rules.md)
- [Tech-Stack-Decision.md](./Tech-Stack-Decision.md)
