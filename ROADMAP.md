# Roadmap

Tracked as milestones. Each milestone has a status, scope, and
completion criteria. Do not mark a milestone Complete until its
completion criteria are fully met.

## Milestone 0.1 — Repository Scaffold

**Status: Complete**

- [x] Git repository initialized
- [x] Root standards files (README, LICENSE, CODE_OF_CONDUCT,
      CONTRIBUTING, SECURITY, .gitignore)
- [x] `/docs` directory structure (11 areas)
- [x] ADR system + ADR-0001
- [x] CLAUDE.md / ROADMAP.md / CHANGELOG.md
- [x] Engineering coding standards document

## Milestone 0.2 — Engineering Foundation

**Status: In Progress**

- [x] Draft + cross-link all five product documents (literature survey,
      blueprint, vision & philosophy, personas, user journeys)
- [x] `docs/architecture/Architecture-Overview.md` (principles, system
      boundaries, future modules, design philosophy — no implementation)
- [x] `docs/architecture/Tech-Stack-Decision.md`
- [x] ADR-0002 through ADR-0014 (full technology stack)
- [x] CLAUDE.md updated for current milestone
- [x] ROADMAP.md converted to milestone tracking (this file)
- [ ] Documentation consistency review (contradictions/improvements)
- [ ] Founder review and sign-off on all Draft v1 documents

**Completion criteria:** all product and architecture documents reviewed
and accepted by the founder (or revised until they are); no open
consistency issues from the review pass.

## Milestone 0.3 — Tooling & CI

**Status: Not Started**

- [ ] Monorepo workspace setup (per ADR-0002)
- [ ] TypeScript strict config (per ADR-0014)
- [ ] ESLint + Prettier
- [ ] Husky + lint-staged
- [ ] Commitlint (Conventional Commits enforcement)
- [ ] Test runner setup
- [ ] CI pipeline (build/lint/test on PR)
- [ ] Initial deploy pipelines to Railway (ADR-0012) and Vercel (ADR-0013)

**Completion criteria:** a contributor can clone the repo, install, run
lint/tests/build, and see a CI check pass on a trivial PR — before any
feature code exists.

## Milestone 1.0 — PINChat MVP

**Status: Blocked** (depends on 0.2 and 0.3)

- [ ] Session/PIN issuance and join flow (Journey 1)
- [ ] Group session lifecycle (Journey 2)
- [ ] Real-time messaging within a session
- [ ] Basic media sharing (Cloudflare R2, per ADR-0011)
- [ ] End-to-end encryption of message content
- [ ] Contact-save / persistence flow
- [ ] Session expiry

**Completion criteria:** both user journeys in
[User Journey & Flow Specification](./docs/product/user-journey-and-flow-specification.md)
are implemented end-to-end and match the V1 scope in
[Product Blueprint](./docs/product/product-blueprint.md).

## Progress Summary

| Milestone | Status | Progress |
|---|---|---|
| 0.1 Repository Scaffold | Complete | 100% |
| 0.2 Engineering Foundation | In Progress | ~85% |
| 0.3 Tooling & CI | Not Started | 0% |
| 1.0 PINChat MVP | Blocked | 0% |

## Next Objective

Complete the documentation consistency review for Milestone 0.2, then
route all Draft v1 documents to the founder for review before starting
Milestone 0.3.
