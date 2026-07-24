# @bluemoon/auth

Session/identity primitives — PIN issuance, session lifecycle, and the
optional persisted-contact upgrade path (see
[Architecture Overview](../../docs/architecture/Architecture-Overview.md#system-boundaries)).
**Placeholder exports only — no logic implemented.** `src/session.ts`
exports the shape (`createSession`, `joinSession`, `expireSession`) but
every function throws "not implemented." This package owns the
"session/PIN as the unit of access" boundary; it does not implement
account-based auth as a precondition for messaging. Real logic lands
starting Milestone 1.0 — implementing it now is explicitly out of
scope for Milestone 0.5 (infrastructure only).

Full responsibility definition: [Package-Architecture.md](../../docs/architecture/Package-Architecture.md#packagesauth).
