# TODO.md — Short-Term Engineering Tasks

Working list of near-term tasks. This is the tactical, frequently-churning
counterpart to [ROADMAP.md](./ROADMAP.md) (milestones) and CLAUDE.md's
Active Tasks (persistent memory). When a task here is done, check it off
and remove it on the next pass rather than letting completed items pile up.

## Now (Milestone 0.2 close-out)

- [ ] Founder review of all five Draft v1 product documents
- [ ] Founder review of Architecture Overview and Tech Stack Decision
- [ ] Resolve open question: separate store for ephemeral session data
      vs. PostgreSQL (see ADR-0005 Future Implications)
- [ ] Final license decision (currently a proprietary placeholder)

## Next (Milestone 0.3 — Tooling & CI)

- [ ] Monorepo workspace setup (per ADR-0002)
- [ ] TypeScript strict config, ESLint, Prettier
- [ ] Husky + lint-staged + Commitlint
- [ ] Test runner setup
- [ ] CI pipeline (build/lint/test on PR)
- [ ] Initial deploy pipelines to Railway and Vercel

## Later

- [ ] Validate the three hypothesis personas with real user research
- [ ] Begin Milestone 1.0 (PINChat MVP) once 0.3 is complete

## See Also

- [ROADMAP.md](./ROADMAP.md) — milestone-level tracking
- [CLAUDE.md](./CLAUDE.md) — persistent engineering memory
