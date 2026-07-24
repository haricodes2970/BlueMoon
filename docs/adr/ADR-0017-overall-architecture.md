# ADR-0017: Overall Architecture — Modular Monolith with Clean Architecture and Platform/Product Split

- **Date:** 2026-07-24
- **Status:** Accepted

## Context

BlueMoon must support PINChat today and multiple future products
(Communities, Voice, Video, AI, Storage — per
[Architecture Overview](../architecture/Architecture-Overview.md#future-modules-anticipated-not-committed))
without rewriting shared infrastructure each time. At current team size
and product maturity (no application code exists yet — Milestone 0.4),
the architecture must be simple enough to move fast in, while not
foreclosing future extraction into separate services.

## Decision

Adopt a **modular monolith** (single deployable `apps/web`, single
deployable `apps/server` today) with **Clean Architecture layering**
inside `apps/server`, and a **platform/product split** at the
workspace level: product-agnostic capabilities live in `packages/*`;
product-specific behavior is assembled from those packages inside
product-specific apps. Full detail:
[System-Architecture.md](../architecture/System-Architecture.md).

## Alternatives Considered

- **Microservices from day one:** rejected — operational overhead
  (service discovery, inter-service auth, distributed tracing) is
  disproportionate to a team shipping a single product with no users
  yet. Conflicts with "boring where it doesn't matter" in
  [Architecture Overview](../architecture/Architecture-Overview.md#design-philosophy).
- **Single unstructured app (no layering, no package split):**
  rejected — would work for PINChat alone but directly contradicts the
  "platform, not app" principle; every future product would either
  duplicate session/auth/database logic or require a disruptive
  refactor to extract it later.
- **Layering without the platform/product package split (Clean
  Architecture inside a single app, no `packages/*` reuse mechanism):**
  rejected — solves internal code organization but not multi-product
  reuse, which is this milestone's stated goal.

## Consequences

- A future service extraction (e.g. pulling messaging into its own
  process) is possible without redesigning business logic, because
  Clean Architecture layering already isolates domain logic from
  transport/infrastructure.
- Every future product app reuses `packages/auth`, `packages/database`,
  `packages/types` rather than reimplementing them, directly enabling
  the multi-product goal this milestone was scoped for.
- Two dependency directions must be maintained simultaneously (layering
  within an app, workspace direction across apps/packages) — more rules
  to hold in mind than a flat structure, but each is narrow and
  documented (see ADR-0019).

## Tradeoffs

Accepts more upfront structural ceremony (layers, package boundaries)
than the fastest possible path to a PINChat MVP would need on its own,
in exchange for not having to redo that structure when a second product
is added. Justified because BlueMoon is explicitly scoped as a
multi-product platform, not a single app (see
[Product Vision & Philosophy](../product/product-vision-and-philosophy.md#5-built-for-the-long-term)).

## Future Implications

If a future product's needs don't fit this shape (e.g. a product
requiring a genuinely different data model that can't share
`packages/database`'s schema conventions), that's a signal to revisit
this ADR with a superseding decision — not to quietly bypass the
layering for that one product.
