# Roadmap

## Current Phase

**Phase 0 — Repository Initialization**

Establishing the repository as a production-grade engineering project
before any application code is written.

## Milestones

### Milestone 0.1 — Repository Scaffold (in progress)

- [x] Git repository initialized
- [x] Root standards files (README, LICENSE, CODE_OF_CONDUCT,
      CONTRIBUTING, SECURITY, .gitignore)
- [x] `/docs` directory structure
- [x] ADR system + ADR-0001
- [x] CLAUDE.md / ROADMAP.md / CHANGELOG.md
- [x] Engineering coding standards document
- [ ] Product documentation ingested into `docs/product`

### Milestone 0.2 — Architecture Definition (not started)

- [ ] System architecture ADR for PINChat
- [ ] Backend framework/stack decision (ADR)
- [ ] Frontend framework/stack decision (ADR)
- [ ] Database choice (ADR)
- [ ] Authentication strategy (ADR)
- [ ] Deployment target decision (ADR)

### Milestone 0.3 — Tooling & CI (not started)

- [ ] TypeScript strict config
- [ ] ESLint + Prettier
- [ ] Husky + lint-staged
- [ ] Commitlint (Conventional Commits enforcement)
- [ ] Test runner setup
- [ ] CI pipeline

### Milestone 1.0 — PINChat MVP (not started)

- [ ] Blocked on Milestones 0.2 and 0.3

## Completed Work

- Repository scaffold: documentation structure, root standards files,
  ADR system, engineering memory files.

## Remaining Work

- Ingest actual product documentation (literature survey, blueprint,
  vision, personas, user journeys).
- Define and record architecture decisions for PINChat.
- Stand up tooling and CI.
- Build PINChat MVP.

## Blocked Work

- Architecture Definition (0.2) is blocked on product documentation
  being added to `docs/product` — implementation decisions must not
  contradict source-of-truth product docs that do not yet exist in the
  repo.

## Progress

**Phase 0: ~40% complete** (scaffold done, product docs and tooling
pending).

## Next Objective

Receive product documentation (literature survey, product blueprint,
vision & philosophy, personas, user journeys) and incorporate into
`docs/product`, replacing the current stubs.
