# Environment Variable Strategy

**Status: Draft v1 — authored 2026-07-24**

## Environments

Three environments, each with its own variable set:

| Environment | Purpose | Where variables live |
|---|---|---|
| Development | Local machine | `.env.local` (per app, gitignored, copied from `.env.example`) |
| Testing | CI / automated tests | CI secrets store (GitHub Actions secrets), never committed |
| Production | Deployed (Railway backend, Vercel frontend) | Platform-native secret/env stores (Railway variables, Vercel environment variables) |

## Rule: No Secrets in the Repository

No `.env`, `.env.local`, `.env.development`, `.env.production`, or any
file containing real values is ever committed. Only `.env.example`
files (placeholder values, safe to commit) live in the repo. Enforced
via `.gitignore`.

## Naming Conventions

- `SCREAMING_SNAKE_CASE` for all variable names.
- Client-exposed variables in `apps/web` (Next.js) must be prefixed
  `NEXT_PUBLIC_` — anything without that prefix is server-only and must
  never be referenced from client-side code.
- Shared conceptual variables (e.g. `DATABASE_URL`) use the same name
  across environments; only the value changes per environment.
- Prefer full words over abbreviations (`DATABASE_URL`, not `DB_URL`).

## Per-App Example Files

- [`apps/web/.env.example`](../../apps/web/.env.example)
- [`apps/server/.env.example`](../../apps/server/.env.example)

Each app's `.env.example` is the source of truth for which variables
that app needs. When a new variable is introduced, add it to the
relevant `.env.example` in the same change (per
[coding-standards.md](./coding-standards.md) documentation-first rule).

## Loading Order (local development)

1. `.env.example` copied to `.env.local` once, per app, by the
   developer (not automated, not committed).
2. Framework-native loading applies: Next.js loads `apps/web/.env.local`
   automatically; `apps/server` will load its `.env.local` via its own
   config package (`packages/config`, placeholder as of Milestone 0.3).

## Production / Testing

- Production values are set directly in Railway (backend/database) and
  Vercel (frontend) environment variable UIs/CLIs — never synced from a
  file in this repository.
- CI (testing) values are set in GitHub Actions repository/environment
  secrets — see `.github/workflows/ci.yml`.

## Related Documents

- [ADR-0012 Railway](../adr/ADR-0012-railway.md)
- [ADR-0013 Vercel](../adr/ADR-0013-vercel.md)
- [packages/config](../../packages/config/README.md)
