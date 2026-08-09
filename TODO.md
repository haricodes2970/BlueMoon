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
      for Username/Credential/session-lifetime/lockout-policy/
      BlueMoon-Token-lifetime — pure functions, no infra needed).
      Repository-level and HTTP-level real-database coverage landed
      in Milestones 0.8/0.9 (`pnpm test:db`, 39 tests) — see
      [Phase-0.8.md](./docs/phases/Phase-0.8.md),
      [Phase-0.9.md](./docs/phases/Phase-0.9.md)
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

- [ ] Validate the three hypothesis personas with real user research
- [ ] Begin Milestone 1.0 (PINChat MVP) once 0.2 and 0.4 (founder
      document/architecture sign-off) are actually closed out — 0.5
      through 0.9 are engineering-complete

## See Also

- [ROADMAP.md](./ROADMAP.md) — milestone-level tracking
- [CLAUDE.md](./CLAUDE.md) — persistent engineering memory
