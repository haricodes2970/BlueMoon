# Architecture Decision Records

This folder contains the log of significant technical decisions made in
the BlueMoon project. Every ADR is numbered sequentially and never
renumbered or deleted, even if later superseded.

## File Naming

```
ADR-XXXX-kebab-case-title.md
```

Example: `ADR-0001-project-structure.md`, `ADR-0002-authentication.md`.

## Template

```markdown
# ADR-XXXX: Title

- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Superseded by ADR-YYYY | Deprecated

## Context

What problem are we solving? What forces (technical, product, team)
are in play?

## Decision

What did we decide to do?

## Alternatives Considered

What other options were evaluated, and why were they not chosen?

## Consequences

What becomes easier or harder as a result of this decision? Any
follow-up work required?
```

## Lifecycle

1. Draft as `Status: Proposed`.
2. Once agreed, update to `Status: Accepted`.
3. If a later ADR replaces this decision, update this ADR's status to
   `Superseded by ADR-YYYY` and link forward; do not delete it.
