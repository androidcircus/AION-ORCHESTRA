---
name: OpenAPI and Zod compatibility
description: A generator/runtime compatibility constraint for numeric OpenAPI schemas in this workspace.
---

When adding numeric fields to the shared OpenAPI contract, prefer `type: number` until the workspace Zod runtime is upgraded to a version that exports `zod.int()`.

**Why:** The current codegen emits `zod.int()` for OpenAPI `integer`, while the installed Zod runtime does not provide that function, causing generated library typechecks to fail after otherwise successful codegen.

**How to apply:** If the Zod dependency is intentionally upgraded later, re-evaluate this constraint and regenerate all API clients before changing existing numeric fields.