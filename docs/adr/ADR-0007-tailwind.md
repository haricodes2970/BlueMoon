# ADR-0007: Tailwind CSS for Styling

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

The web client (ADR-0003, Next.js) needs a styling approach that
supports fast iteration on a small, calm UI surface — per the "calm
technology" principle in
[Product Vision & Philosophy](../product/product-vision-and-philosophy.md#4-calm-technology) —
without accumulating unbounded custom CSS.

## Decision

Use Tailwind CSS as the styling approach.

## Alternatives Considered

- **CSS Modules:** rejected as primary approach — more boilerplate per
  component and no built-in design token constraints, making it easier
  to drift from a consistent, minimal visual language over time.
- **styled-components / CSS-in-JS:** rejected — runtime style generation
  overhead and a heavier abstraction than needed; also less directly
  compatible with shadcn (ADR-0008), which is built on Tailwind.
- **Plain hand-written CSS:** rejected — no constraint system, higher
  risk of visual inconsistency as the UI surface grows.

## Consequences

- Consistent design tokens (spacing, color, typography) enforced by
  Tailwind's config rather than ad hoc values per component.
- Class-heavy markup, which some contributors find less readable than
  separated stylesheets — mitigated by component extraction conventions
  in [coding standards](../engineering/coding-standards.md).

## Tradeoffs

Trades stylesheet separation for utility-class velocity and consistency.
Directly enables ADR-0008 (shadcn), which assumes Tailwind.

## Future Implications

None expected to require revisiting in the near term; if a design system
overhaul happens, re-evaluate alongside ADR-0008.
