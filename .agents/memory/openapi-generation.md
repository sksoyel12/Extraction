---
name: OpenAPI generation
description: Non-obvious Orval export behavior in this workspace
---

When an OpenAPI operation's generated parameter type has the same exported
name as a schema generated into the shared Zod barrel, `tsc` reports duplicate
exports. Use operation IDs that are distinct from schema names, and keep the
Zod barrel's exports explicit when generated output includes parameter schemas.

**Why:** Orval generates both operation parameter schemas and component schema
types into the same package, so wildcard barrels can create collisions.

**How to apply:** After changing OpenAPI paths or operation IDs, run codegen and
the root typecheck; if codegen rewrites the Zod barrel, reapply the explicit
exports before validating.