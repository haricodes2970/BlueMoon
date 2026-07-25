# @bluemoon/web

PINChat frontend. Infrastructure only as of Milestone 0.5 — no product
features yet (that starts Milestone 1.0).

- Framework: Next.js App Router ([ADR-0003](../../docs/adr/ADR-0003-nextjs.md))
- Styling: Tailwind + shadcn/ui ([ADR-0007](../../docs/adr/ADR-0007-tailwind.md), [ADR-0008](../../docs/adr/ADR-0008-shadcn.md))
- Client state: Zustand + TanStack Query ([ADR-0009](../../docs/adr/ADR-0009-zustand.md), [ADR-0010](../../docs/adr/ADR-0010-tanstack-query.md))
- Hosting: Vercel ([ADR-0013](../../docs/adr/ADR-0013-vercel.md))

## What exists

- App Router shell: `src/app/layout.tsx` + `src/app/page.tsx` (placeholder
  content only).
- Tailwind wired end to end, with the standard shadcn/ui CSS-variable
  color tokens (`src/app/globals.css`, `tailwind.config.ts`).
- One shadcn/ui primitive, `src/components/ui/button.tsx`, hand-added
  (the shadcn CLI needs an interactive registry fetch this environment
  doesn't have) — proves the Tailwind/shadcn wiring renders correctly.
  `components.json` is configured so the CLI works normally going
  forward.
- `src/providers/query-provider.tsx` — TanStack Query's
  `QueryClientProvider`, wrapping the app in `src/providers/index.tsx`.
  No queries defined yet.
- Zustand is installed as a dependency; no store exists yet — one
  isn't needed until there's client state to manage (Milestone 1.0).
- Per [Frontend-Architecture.md](../../docs/architecture/Frontend-Architecture.md),
  `layouts/`, `features/`, `hooks/`, `services/`, `stores/`, `assets/`
  are not created yet — they land with the first real feature that
  needs them, not speculatively.

## Running

```bash
pnpm --filter @bluemoon/web dev     # next dev
pnpm --filter @bluemoon/web build   # next build
pnpm --filter @bluemoon/web start   # next start
```

See `.env.example` for required variables. Linting: `pnpm lint`'s own
gate is authoritative; Next's internal build-time ESLint pass is
disabled (`next.config.mjs`) since it resolves our flat config
differently and is redundant with the dedicated `lint` CI job.
