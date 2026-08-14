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

## Next (before Milestone 1.1 — the real PINChat V1 — implementation starts)

- [ ] Design the real PINChat V1 session/PIN model (no-account
      conversation start) and how it relates to Milestone 1.0's
      interim friendship-gated messaging — see
      [ADR-0027](./docs/adr/ADR-0027-messaging-friendship-gate-deviation.md)
      Future Implications
- [ ] Design and implement real end-to-end encryption for message
      content — see
      [ADR-0029](./docs/adr/ADR-0029-message-encryption-deferred.md)
      Future Implications
- [ ] Expand Vitest coverage to the domain layer directly (unit tests
      for Username/Credential/session-lifetime/lockout-policy/
      BlueMoon-Token-lifetime/MessageContent — pure functions, no
      infra needed). Repository-level and HTTP-level real-database
      coverage landed in Milestones 0.8/0.9/1.0 (`pnpm test:db`, 59
      tests) — see [Phase-0.8.md](./docs/phases/Phase-0.8.md),
      [Phase-0.9.md](./docs/phases/Phase-0.9.md),
      [Phase-1.0.md](./docs/phases/Phase-1.0.md)
- [x] Add rate limiting to Messaging (conversation creation, WS ticket
      issuance, `send_message` volume) — done in the 2026-08-13
      production-hardening pass; see
      [Messaging.md](./docs/security/Messaging.md#rate-limiting)
- [ ] Add automated dependency-rule enforcement — `eslint-plugin-boundaries`
      or equivalent in `tooling/eslint-config`, configured against
      [Dependency-Rules.md](./docs/architecture/Dependency-Rules.md)
      (see ADR-0019 Future Implications)
- [ ] Move the in-memory rate limiter and Messaging's presence/broadcast
      registries to a shared store (e.g. Redis) before horizontal
      scaling — see
      [Authentication.md](./docs/security/Authentication.md#rate-limiting),
      [ADR-0028](./docs/adr/ADR-0028-messaging-websocket-architecture.md)
      Future Implications
- [ ] Implement email verification/recovery for Identity ("forgot
      credential" flow depends on this — see
      [Authentication.md](./docs/security/Authentication.md#credential-rules))
- [ ] Resolve open question: separate store for ephemeral session data
      vs. PostgreSQL (see ADR-0005 Future Implications)
- [ ] Final license decision (currently a proprietary placeholder)
- [ ] Deploy pipelines to Railway and Vercel (deliberately deferred) —
      deployment _documentation_ and env-config validation now exist
      ([docs/deployment/README.md](./docs/deployment/README.md),
      [ADR-0031](./docs/adr/ADR-0031-deployment-architecture.md)); no
      Dockerfile/Railway/Vercel config file exists yet, and nothing
      has been verified against a real account

## Later

- [ ] Validate the three hypothesis personas with real user research
- [ ] Begin Milestone 1.1 (PINChat V1) once 0.2, 0.4 (founder
      document/architecture sign-off), and the session/PIN + E2EE
      design work above are done — 0.5 through 1.0 are
      engineering-complete

## See Also

- [ROADMAP.md](./ROADMAP.md) — milestone-level tracking
- [CLAUDE.md](./CLAUDE.md) — persistent engineering memory
