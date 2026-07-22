# ADR-0011: Cloudflare R2 for Object Storage

- **Date:** 2026-07-22
- **Status:** Accepted

## Context

Per [Product Blueprint](../product/product-blueprint.md), PINChat V1
supports basic media sharing (images, files) within a session. This
requires object storage distinct from the relational database
(ADR-0005, PostgreSQL), consistent with keeping ephemeral/large binary
data structurally separate from relational data.

## Decision

Use Cloudflare R2 for object storage (media/file uploads).

## Alternatives Considered

- **AWS S3:** the default industry choice; rejected as primary pick
  because R2 offers S3-compatible APIs with no egress fees, which
  matters for a media-sharing product where read volume can be
  unpredictable, without giving up S3-compatible tooling.
- **Storing media directly in PostgreSQL (bytea/large objects):**
  rejected — anti-pattern for binary media at any meaningful scale;
  bloats the relational store that ADR-0005 is meant to keep focused on
  structured data.
- **Google Cloud Storage:** a reasonable alternative; R2 preferred for
  cost predictability (no egress fees) and simplicity of adding one more
  Cloudflare-adjacent service.

## Consequences

- Media uploads/downloads are decoupled from the primary database,
  keeping PostgreSQL focused and performant.
- Introduces a dependency on Cloudflare's object storage product and its
  operational characteristics (availability, regional behavior).

## Tradeoffs

R2's ecosystem/tooling is younger than S3's; mitigated by R2's
S3-compatible API, which limits lock-in risk.

## Future Implications

If media features expand significantly (e.g. transcoding, large video),
revisit whether R2 alone is sufficient or whether a dedicated media
pipeline service is warranted — track as a future ADR when that need
arises.
