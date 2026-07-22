# CLAUDE.md — BlueMoon Engineering Memory

This file is the persistent engineering memory for the BlueMoon repository.
It must be updated whenever meaningful work is completed, a decision is made,
or the roadmap changes. Do not let this file go stale.

## Project Overview

BlueMoon is a long-term communication platform. The first product built on
top of it is **PINChat** — a PIN-based, low-friction, privacy-first
messaging product (see [Product Blueprint](./docs/product/product-blueprint.md)).

Source-of-truth product documentation lives under
[`docs/product`](./docs/product): Literature Survey, Product Blueprint,
Product Vision & Philosophy, User Personas & User Research, and User
Journey & User Flow Specification. All five exist as **Draft v1**
(authored 2026-07-22), cross-linked, and pending founder review —
see the Known Limitations section below before treating them as final.
Implementation decisions must not contradict these documents.

## Product Documentation Policy

The documents under `/docs/product/` are the canonical product
specification.

Claude Code must never rewrite, replace, or substantially modify these
documents unless explicitly instructed.

Engineering must conform to product documentation.

If implementation appears to conflict with product documentation, raise
the conflict instead of silently changing the documents.

## Current Phase

**Phase 0 — Engineering Foundation**

Documentation, architecture direction, and technology decisions are
being established before feature implementation begins. No application
code has been written yet.

## Current Milestone

**Milestone 0.2 — Engineering Foundation** (in progress)

Product docs drafted and cross-linked, architecture direction documented
(principles/boundaries, not implementation), and the full technology
stack recorded as ADRs. Next milestone (0.3) is tooling/CI setup,
followed by 1.0 (PINChat MVP implementation).

## Active Tasks

- [ ] Founder review of all five Draft v1 product documents
- [ ] Founder review of Architecture Overview and Tech Stack Decision
- [ ] Validate the three hypothesis personas with real user research
- [ ] Choose final license and update `LICENSE`
- [ ] Begin Milestone 0.3 (tooling & CI) once 0.2 is reviewed/accepted

## Completed Tasks

**Milestone 0.1 — Repository Scaffold**
- [x] Initialize git repository; root standards files; `/docs` structure
- [x] ADR system established; ADR-0001 (project/documentation structure)
- [x] CLAUDE.md, ROADMAP.md, CHANGELOG.md; coding standards document

**Milestone 0.2 — Engineering Foundation**
- [x] Drafted and cross-linked all five product documents
- [x] Authored `docs/architecture/Architecture-Overview.md` (principles,
      system boundaries, future modules, design philosophy)
- [x] Authored `docs/architecture/Tech-Stack-Decision.md`
- [x] Recorded ADR-0002 through ADR-0014 (full technology stack: monorepo,
      Next.js, Hono, PostgreSQL, Drizzle, Tailwind, shadcn, Zustand,
      TanStack Query, Cloudflare R2, Railway, Vercel, TypeScript)

## Engineering Principles

- Optimize for maintainability, scalability, readability, security, and
  developer experience, in that rough priority order.
- Analyze and propose architecture before implementing. Explain tradeoffs
  when more than one reasonable option exists.
- Documentation is production code: it is never allowed to go stale.
  Update docs in the same change that alters architecture or behavior.
- Every significant technical decision gets an ADR.
- Never contradict existing product documentation.

## Architecture Goals

(Full detail: [Architecture Overview](./docs/architecture/Architecture-Overview.md))

- Session/PIN as the unit of access — no account required to start a
  conversation; identity is additive, never a precondition.
- Privacy by default — end-to-end encryption, minimal metadata
  retention, no tradeoffs against this to ship faster.
- Ephemeral-first data lifecycle — session data is cleanly discardable;
  persistence (contacts) is an explicit opt-in, not the default.
- Platform, not app — the session/identity/transport/storage core must
  outlive PINChat and support future BlueMoon products without a rewrite.
- Boring where it doesn't matter, careful where it does — rigor is
  proportional to how core a component is to trust/privacy guarantees.

## Coding Standards

Full detail in [`docs/engineering/coding-standards.md`](./docs/engineering/coding-standards.md).
Summary: Strict TypeScript, ESLint, Prettier, Husky + lint-staged,
Commitlint, feature-first Clean Architecture, SOLID.

## Documentation Index

Root navigation files (quick orientation for humans and AI agents):
[BLUEPRINT.md](./BLUEPRINT.md), [ARCHITECTURE.md](./ARCHITECTURE.md),
[DECISIONS.md](./DECISIONS.md), [TODO.md](./TODO.md). These are thin
indexes — full content stays in `/docs`.

| Area | Path |
|---|---|
| Product (source of truth) | [`docs/product`](./docs/product) |
| Architecture overview & tech stack | [`docs/architecture`](./docs/architecture) |
| ADR log (14 records as of Milestone 0.2) | [`docs/adr`](./docs/adr) |
| Engineering standards | [`docs/engineering`](./docs/engineering) |
| Engineering journal (chronological milestone log) | [`docs/engineering/Engineering-Journal.md`](./docs/engineering/Engineering-Journal.md) |
| Backend / Frontend / API / Database / Deployment / Security | `docs/{backend,frontend,api,database,deployment,security}` — index stubs only, populated as each area is implemented |
| Meeting notes | [`docs/meeting-notes`](./docs/meeting-notes) |
| Roadmap | [`ROADMAP.md`](./ROADMAP.md) |
| Changelog | [`CHANGELOG.md`](./CHANGELOG.md) |

## Repository Conventions

- Conventional Commits for all commit messages.
- One logical change per commit; no vague or batch commits.
- Sequential ADR numbering: `ADR-XXXX-kebab-case-title.md` under
  `docs/adr/`.
- Semantic Versioning tracked in `CHANGELOG.md`.

## Documentation Conventions

- All docs in Markdown.
- Organized by topic under `docs/<area>/`.
- Each doc area should have a short index/README when it contains more
  than one file.
- Cross-link related documents (product docs, architecture docs, and
  ADRs reference each other directly — see each document's "Related
  Documents" section).

## Important Decisions

See [`docs/adr`](./docs/adr) for the authoritative log. As of this
writing: ADR-0001 (repository/documentation structure) through ADR-0014
(TypeScript), covering the full technology stack for PINChat.

## Known Limitations

- All five product documents and both architecture documents are
  **Draft v1, authored by the engineering assistant from a stack/product
  description, not yet reviewed or confirmed by the founder.** Treat as
  directionally correct, not final.
- The three personas in `docs/product/user-personas-and-research.md`
  are explicitly hypothesis-driven, not validated by real user research.
- No application code exists yet (by design — Milestone 0.2 is
  documentation/architecture only, not implementation).
- License is still a proprietary placeholder pending a final decision.

## Pending Discussions

- Founder review/revision of all Draft v1 documents.
- Final license choice.
- Whether the ephemeral-session data store should be separate from
  PostgreSQL (flagged in ADR-0005's Future Implications, not yet
  decided).

## Future Roadmap

See [`ROADMAP.md`](./ROADMAP.md).
