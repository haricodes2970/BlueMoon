# @bluemoon/typescript-config

Shared strict TypeScript base configs, consumed via `"extends"` by every
app and package in the workspace.

- `base.json` — strict compiler options shared by everything
- `nextjs.json` — extends base, adds Next.js-specific options
- `node.json` — extends base, adds Node backend-specific options

See [ADR-0014](../../docs/adr/ADR-0014-typescript.md) and
[coding standards](../../docs/engineering/coding-standards.md).
