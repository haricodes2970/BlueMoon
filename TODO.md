# TODO.md — Short-Term Engineering Tasks

Working list of near-term tasks. This is the tactical, frequently-churning
counterpart to [ROADMAP.md](./ROADMAP.md) (milestones) and CLAUDE.md's
Active Tasks (persistent memory). When a task here is done, check it off
and remove it on the next pass rather than letting completed items pile up.

## Now (top priority, blocking multiple milestones)

- [ ] Replace Draft v1 product documents in `docs/product/` with the
      founder's real, approved documents (blocks Milestone 0.2 close-out)
- [ ] Founder review of the
      [Product Requirements Document](./docs/product/Product-Requirements-Document.md)
- [ ] Run `pnpm install` and verify the workspace installs cleanly;
      confirm CI passes on an actual PR (blocks Milestone 0.3 close-out)
- [ ] Founder review and sign-off on all five Milestone 0.4 architecture
      documents (System/Package/Dependency-Rules/Backend/Frontend)

## Next (before Milestone 1.0 implementation starts)

- [ ] Expand Vitest coverage to the domain layer directly (unit tests
      for Username/Credential/session-lifetime/lockout-policy — pure
      functions, no infra needed). Repository-level and HTTP-level
      real-database coverage landed in Milestone 0.8
      (`pnpm test:db`, 21 tests) — see
      [Phase-0.8.md](./docs/phases/Phase-0.8.md)
- [ ] Add automated dependency-rule enforcement — `eslint-plugin-boundaries`
      or equivalent in `tooling/eslint-config`, configured against
      [Dependency-Rules.md](./docs/architecture/Dependency-Rules.md)
      (see ADR-0019 Future Implications)
- [ ] Move the in-memory rate limiter to a shared store (e.g. Redis)
      before horizontal scaling — see
      [Authentication.md](./docs/security/Authentication.md#rate-limiting)
- [ ] Implement email verification/recovery for Identity ("forgot
      credential" flow depends on this — see
      [Authentication.md](./docs/security/Authentication.md#credential-rules))
- [ ] Resolve open question: separate store for ephemeral session data
      vs. PostgreSQL (see ADR-0005 Future Implications)
- [ ] Final license decision (currently a proprietary placeholder)
- [ ] Deploy pipelines to Railway and Vercel (deliberately deferred)

## Later

- [ ] Implement BlueMoon Token (friend-request capability) — documented
      in the [PRD](./docs/product/Product-Requirements-Document.md#bluemoon-token)
      as a future capability; explicitly not implemented until the
      friendship milestone
- [ ] Validate the three hypothesis personas with real user research
- [ ] Begin Milestone 1.0 (PINChat MVP) once 0.2 through 0.8 are all
      actually closed out

## See Also

- [ROADMAP.md](./ROADMAP.md) — milestone-level tracking
- [CLAUDE.md](./CLAUDE.md) — persistent engineering memory
