# Phase 0.2 — Engineering Foundation

**Status: In Progress — blocked** | **Dates:** 2026-07-22 – 2026-07-24

## Purpose

Establish product direction and the full technology stack before any
implementation begins: draft (later, replace) product documentation,
document architecture principles, and record every stack decision as
an ADR.

## Goals

- Product documents (literature survey, blueprint, vision, personas,
  user journeys), cross-linked.
- `docs/architecture/Architecture-Overview.md` and
  `Tech-Stack-Decision.md`.
- ADR-0002 through ADR-0014 for the full stack.
- Root navigation files for fast orientation.

## Tasks

- [x] Draft + cross-link all five product documents
- [x] `Architecture-Overview.md`, `Tech-Stack-Decision.md`
- [x] ADR-0002 through ADR-0014
- [x] `BLUEPRINT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TODO.md`
- [x] Product Documentation Policy added to `CLAUDE.md`
- [ ] **Replace draft product documents with the founder's real,
      approved documents**
- [ ] Founder review and sign-off on architecture documents

## Completed Work

Drafted five product documents based on the product direction
described (PIN-based, low-friction, privacy-first messaging) — later
corrected: these were assistant-authored, not the founder's real
specification (see Problems Found). Architecture Overview (principles,
system boundaries, future modules, design philosophy — no
implementation detail) and Tech Stack Decision (summary + rationale for
every stack choice, linking each ADR). Recorded ADR-0002 through
ADR-0014: monorepo, Next.js, Hono, PostgreSQL, Drizzle, Tailwind,
shadcn/ui, Zustand, TanStack Query, Cloudflare R2, Railway, Vercel,
TypeScript. Added root navigation files (`BLUEPRINT.md`,
`ARCHITECTURE.md`, `DECISIONS.md`, `TODO.md`) as thin indexes into
`/docs`. Added the Product Documentation Policy to `CLAUDE.md`, freezing
`/docs/product` against silent AI rewrites going forward. Fixed stale
"stack choice pending" language left in `docs/{backend,frontend,api,
database,deployment}` READMEs after the stack was actually decided.

## Files Created

`docs/product/{literature-survey,product-blueprint,product-vision-and-philosophy,
user-personas-and-research,user-journey-and-flow-specification}.md`,
`docs/architecture/{Architecture-Overview,Tech-Stack-Decision}.md`,
`docs/adr/ADR-0002-monorepo.md` through `ADR-0014-typescript.md`,
`BLUEPRINT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TODO.md`.

## Files Modified

`CLAUDE.md` (Product Documentation Policy, milestone status),
`ROADMAP.md` (converted to milestone tracking), `docs/product/README.md`,
`docs/{backend,frontend,api,database,deployment}/README.md` (stale
stack-pending language fixed).

## Architecture Decisions

ADR-0002 (monorepo) through ADR-0014 (TypeScript) — the full initial
technology stack.

## Problems Found

**The five product documents were drafted by the engineering assistant
from a stack/product description, not the founder's actual approved
specification.** Flagged by the founder as an error. Per the Product
Documentation Policy (added in response), these must not be rewritten
or summarized further by Claude Code — they stay as-is until replaced
with the real documents.

## Problems Solved

Stale documentation drift caught and fixed: several `docs/*` README
stubs still said "stack choice pending" after ADR-0002 through
ADR-0014 had already decided it — corrected in the same phase, not
left for a later cleanup pass.

## Quality Gate Results

Not applicable — documentation-only phase, no code exists yet.

## Lessons Learned

Drafting product documentation without the founder's real input, even
when explicitly asked to "draft full content now," created real rework
risk — everything downstream (architecture principles, personas-driven
journeys) inherited assumptions that may not hold. The Product
Documentation Policy exists specifically to prevent this class of
mistake from compounding silently in future sessions.

## Next Phase

[Phase-0.3.md](./Phase-0.3.md) — Engineering Environment: pnpm/Turborepo
workspace, tooling, CI scaffold. This phase (0.2) remains open,
blocked on receiving the founder's real product documents.
