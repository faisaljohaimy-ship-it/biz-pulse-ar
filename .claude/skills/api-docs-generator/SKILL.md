---
name: api-docs-generator
description: Generate clear API documentation from code, route handlers, OpenAPI specs, or endpoint descriptions — including auth, request/response examples, and error catalogs. Use when the user asks to document an API, write endpoint references, or produce developer docs.
---

# API Docs Generator

Turn source code or endpoint descriptions into documentation a developer can integrate against on the first read.

## When to trigger
- "Document this API / these endpoints / this route file"
- Producing developer reference docs, README API sections, or OpenAPI descriptions
- Onboarding docs for internal services

## Process
1. **Read the source of truth**: actual handlers, schemas, and middleware — not just names. Extract methods, paths, params, body shape, response shape, status codes, and auth requirements.
2. **Per-endpoint template**:
   - One-line purpose
   - Method + path
   - Auth requirement (and scope/role if applicable)
   - Parameters table: name, type, required, description, constraints
   - Request example (curl + one language the project uses)
   - Success response example (real shape, realistic values)
   - Error table: status, code, when it happens, how to fix
3. **Global sections**: base URL & environments, authentication, rate limits, pagination convention, versioning, common error envelope.
4. **Truth over completeness**: if behavior can't be verified from source, mark it `⚠ unverified` rather than guessing.

## Rules
- Examples must be copy-paste runnable: valid JSON, real field names, no `<placeholder>` unless unavoidable.
- Document the errors developers will actually hit (401 vs 403 distinction, validation failures) — error docs are half the value.
- Keep prose minimal; structure and examples carry the weight.
- Output format: Markdown by default; OpenAPI 3.1 YAML on request.

## Quality bar
A developer who has never seen the codebase makes a successful authenticated request within 5 minutes using only the docs.
