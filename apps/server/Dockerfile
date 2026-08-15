# Production image for @bluemoon/server. Built from the repository
# root (see .dockerignore) so the pnpm workspace / Turborepo graph
# resolves correctly -- apps/server depends on four workspace packages
# (config, database, types, utils) that must be built and present in
# node_modules, not just apps/server's own source.
#
# Build from repo root:
#   docker build -f apps/server/Dockerfile -t bluemoon-server .
# Run:
#   docker run -p 8787:8787 --env-file apps/server/.env bluemoon-server

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app
# Root package.json's "prepare" script runs husky, which expects a git
# repo and a devDependency not installed in the --prod stage below --
# CI=true makes husky's own install script skip itself instead of
# failing the build.
ENV CI=true

# ---- builder: install + build only what @bluemoon/server needs -------
# Deliberately does not touch apps/web (Next.js, sharp, etc.) -- a
# full unfiltered `pnpm install` would pull in the entire workspace's
# dependency graph for an image that only ever runs the server.
FROM base AS builder

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY tooling/typescript-config/package.json ./tooling/typescript-config/package.json

RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));delete p.scripts.prepare;fs.writeFileSync('package.json',JSON.stringify(p))"
RUN pnpm install --frozen-lockfile --filter=@bluemoon/server...

COPY apps/server ./apps/server
COPY packages/config ./packages/config
COPY packages/database ./packages/database
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY tooling/typescript-config ./tooling/typescript-config

RUN pnpm turbo run build --filter=@bluemoon/server...

# ---- prod-deps: production-only node_modules for server + its workspace deps
FROM base AS prod-deps

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/utils/package.json ./packages/utils/package.json

# Root package.json's "prepare" script runs husky, which isn't a
# production dependency and isn't installed in this --prod stage;
# strip it before install rather than skip all lifecycle scripts
# (argon2's postinstall, which compiles its native addon, must run).
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));delete p.scripts.prepare;fs.writeFileSync('package.json',JSON.stringify(p))"
RUN pnpm install --frozen-lockfile --prod --filter=@bluemoon/server...

# ---- runtime: minimal image, no dev deps, no source, no build tools --
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Not every workspace package has its own node_modules (pnpm only
# creates one per package if that package has dependencies of its own
# -- types/utils currently have none) -- copy the whole prod-deps
# /app tree in one shot instead of naming each one, so a future
# dependency addition doesn't silently break the image.
COPY --from=prod-deps /app ./

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/config/package.json ./packages/config/package.json
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/utils/package.json ./packages/utils/package.json

WORKDIR /app/apps/server
EXPOSE 8787

CMD ["node", "dist/index.js"]
