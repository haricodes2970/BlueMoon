# ADR-0008: shadcn/ui for Component Primitives

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

Following ADR-0007 (Tailwind), the client needs accessible, consistent
UI primitives (dialogs, inputs, buttons) without building every
component from scratch or depending on a heavyweight component library
that fights the "calm technology" minimal-surface principle.

## Decision

Use shadcn/ui as the source of UI component primitives, copied into the
codebase and customized rather than consumed as an opaque dependency.

## Alternatives Considered

- **Material UI (MUI):** rejected — strong opinionated visual language
  that would need significant override work to match a minimal, calm
  product surface, and adds a heavier runtime dependency.
- **Chakra UI:** rejected — solid alternative, but shadcn's
  copy-into-repo model gives more direct control, which fits the
  "own the code" philosophy already used for documentation ownership
  (see [CONTRIBUTING.md](../../CONTRIBUTING.md)).
- **Build all primitives from scratch:** rejected — unnecessary
  reinvention of accessible component behavior (focus management,
  ARIA) that shadcn already gets right on top of Radix primitives.

## Consequences

- Component code lives directly in the repo, fully editable, with no
  opaque library version to work around.
- The team is responsible for keeping copied components updated
  manually rather than via a package bump.

## Tradeoffs

Trades automatic upstream updates for full control and no black-box
dependency — consistent with keeping the platform's core pieces
inspectable end to end.

## Future Implications

As the design system matures, consider extracting shared shadcn-based
components into a workspace package (enabled by the monorepo, ADR-0002)
for reuse across future BlueMoon client surfaces.
