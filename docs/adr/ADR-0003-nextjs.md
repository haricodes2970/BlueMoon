# ADR-0003: Next.js for the Web Client

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

PINChat's V1 client is web-based (see
[Product Blueprint](../product/product-blueprint.md)). It needs to serve
a fast-loading, SEO-viable landing/entry experience (for shared PIN
links to resolve well when opened cold) as well as a real-time,
app-like session/chat interface once joined.

## Decision

Use Next.js (React) as the web client framework.

## Alternatives Considered

- **Plain React SPA (e.g. Vite):** rejected as primary choice — weaker
  out-of-the-box story for the fast-loading, shareable-link entry
  experience (PIN join links) that benefits from server rendering.
- **Remix:** a reasonable alternative with similar SSR capabilities;
  Next.js chosen for ecosystem maturity, Vercel deployment fit (see
  ADR-0013), and team familiarity.
- **SvelteKit / other framework:** rejected — React ecosystem alignment
  with the rest of the chosen stack (shadcn, TanStack Query, Zustand)
  outweighs any framework-specific advantage.

## Consequences

- Client benefits from server-side rendering for shareable/cold-start
  routes (PIN join links) and client-side interactivity for the live
  session/chat experience.
- Couples the client to the React ecosystem; all UI-layer decisions
  (ADR-0007 Tailwind, ADR-0008 shadcn, ADR-0009 Zustand, ADR-0010
  TanStack Query) follow from this choice.

## Tradeoffs

Next.js brings more framework surface area (routing conventions,
rendering modes) than a minimal SPA would. Accepted because the
shareable-link entry experience is core to the product's low-friction
premise (see [Literature Survey](../product/literature-survey.md)), not
a peripheral concern.

## Future Implications

If PINChat later ships native mobile clients, the shared logic
(session/state management patterns, API contracts) should be kept
framework-agnostic where possible so it can be reused outside Next.js.
