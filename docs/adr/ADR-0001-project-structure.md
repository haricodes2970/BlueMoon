# ADR-0001: Repository and Documentation Structure

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

BlueMoon is intended to be a long-term, multi-year communication platform
(first product: PINChat), maintained by a team over time. Before any
application code is written, the repository needs a structure that
supports that lifespan: discoverable documentation, a durable decision
log, and conventions that don't need to be re-negotiated on every
feature.

## Decision

Adopt the following repository conventions from day one:

- A `/docs` directory organized by topic (`architecture`, `product`,
  `engineering`, `security`, `backend`, `frontend`, `api`, `database`,
  `deployment`, `adr`, `meeting-notes`).
- An Architecture Decision Record (ADR) system under `docs/adr/`,
  sequentially numbered, using the template in `docs/adr/README.md`.
- A root `CLAUDE.md` as persistent engineering memory (phase, active
  tasks, principles, conventions), updated as work completes.
- A root `ROADMAP.md` tracking phase/milestones/progress, and
  `CHANGELOG.md` following Keep a Changelog + SemVer.
- Standard OSS root files: `README.md`, `LICENSE`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- Conventional Commits for all commit messages.
- Documentation is treated as production code: changes to architecture
  or behavior update docs in the same change.

## Alternatives Considered

- **Minimal repo, add docs later:** rejected — retrofitting
  documentation and decision history onto an already-growing codebase is
  where most projects lose the "why" behind early decisions.
- **Single flat `docs/` with no subfolders:** rejected — does not scale
  past a handful of documents; a multi-year project will accumulate many.
- **Decisions recorded only in commit messages / PR descriptions:**
  rejected — not discoverable, not indexed, easy to lose.

## Consequences

- Every future significant technical decision must be recorded as an
  ADR; this adds a small amount of process overhead per decision but
  keeps the "why" discoverable long-term.
- `CLAUDE.md` and `ROADMAP.md` require discipline to keep current — they
  are only useful if updated alongside the work they describe, not
  after the fact.
- No application code is introduced by this ADR; it only establishes
  structure and conventions.
