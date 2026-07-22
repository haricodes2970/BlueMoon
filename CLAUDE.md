# CLAUDE.md — BlueMoon Engineering Memory

This file is the persistent engineering memory for the BlueMoon repository.
It must be updated whenever meaningful work is completed, a decision is made,
or the roadmap changes. Do not let this file go stale.

## Project Overview

BlueMoon is a long-term communication platform. The first product built on
top of it is **PINChat**.

Source-of-truth product documentation (Literature Survey, Product Blueprint,
Product Vision & Philosophy, User Personas & User Research, User Journey &
User Flow Specification) is intended to live under [`docs/product`](./docs/product).
As of this writing those documents have not yet been supplied to the
repository — stubs exist marking them `TBD`. Implementation decisions must
not contradict these documents once they are added.

## Current Phase

**Phase 0 — Repository Initialization**

The repository is being bootstrapped as a production-grade engineering
project: documentation structure, ADR system, engineering standards, and
repository conventions. No application code has been written yet.

## Current Milestone

Milestone 0.1 — Repository scaffold complete (docs structure, root
standards files, ADR system, CLAUDE.md/ROADMAP.md/CHANGELOG.md).

## Active Tasks

- [ ] Receive and incorporate actual product documentation (literature
      survey, blueprint, vision, personas, user journeys) into
      `docs/product`
- [ ] Define initial system architecture (ADR) once product docs land
- [ ] Choose final license and update `LICENSE`

## Completed Tasks

- [x] Initialize git repository
- [x] Create root standards files (README, LICENSE, CODE_OF_CONDUCT,
      CONTRIBUTING, SECURITY, .gitignore)
- [x] Create `/docs` structure (architecture, product, engineering,
      security, backend, frontend, api, database, deployment, adr,
      meeting-notes)
- [x] Establish ADR system and record ADR-0001 (project structure)
- [x] Create CLAUDE.md, ROADMAP.md, CHANGELOG.md
- [x] Establish engineering coding standards document

## Engineering Principles

- Optimize for maintainability, scalability, readability, security, and
  developer experience, in that rough priority order.
- Analyze and propose architecture before implementing. Explain tradeoffs
  when more than one reasonable option exists.
- Documentation is production code: it is never allowed to go stale.
  Update docs in the same change that alters architecture or behavior.
- Every significant technical decision gets an ADR.
- Never contradict existing product documentation.

## Coding Standards

Full detail in [`docs/engineering/coding-standards.md`](./docs/engineering/coding-standards.md).
Summary: Strict TypeScript, ESLint, Prettier, Husky + lint-staged,
Commitlint, feature-first Clean Architecture, SOLID.

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

## Important Decisions

See [`docs/adr`](./docs/adr) for the authoritative log. As of this
writing: ADR-0001 (initial repository/documentation structure).

## Known Limitations

- Product documentation (literature survey, blueprint, vision, personas,
  user journeys) has not yet been added to the repository — placeholders
  only. No architecture or implementation decisions should be treated as
  final until these land.
- No application code exists yet (by design — see Initial Task in
  bootstrap instructions).

## Pending Discussions

- Final license choice (currently a proprietary placeholder in `LICENSE`).
- Tech stack selection for PINChat backend/frontend (blocked on product
  docs and an architecture ADR).

## Future Roadmap

See [`ROADMAP.md`](./ROADMAP.md).
