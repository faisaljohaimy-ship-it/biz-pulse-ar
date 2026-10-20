# SADEED command and FNN execution — 2026-10-20

Owner instruction: SADEED coordinates management and analysis; FNN handles bounded technical execution. The owner's final instruction authorizes publishing after verification. No production database migration, destructive change, secret change, billing change or permission bypass is included.

## Continuation baseline

Based on PR #7 `f79c0964184962029ea76990fdc95cc4529b04e4`, stacked on PR #6. Main at audit: `e21bea0b7f06c07ec6acb32372890e3a2b67ec98`. PR #7 CI run 39412013811 executed and passed unit/audit, static, build/budget/contrast and real-Postgres RAG preflight. Credential-dependent E2E steps and deployment skipped. This is inherited verification, not proof of this change or a production release.

Recovered Claude's missing execution lifecycle changes from `74af2963a396de339fa4ed0507cde48bc5ccd4a1`: selected execution/runtime/API/test files only. Retained Microsoft gateway decoupling; did not import its unrelated CI or quota changes. Added conditional rejection claiming to prevent approval-versus-rejection races.

## Implemented integration

- `/orchestration` contains SADEED leadership and FNN engineering tabs with an existing-navigation entry. Private history is scoped to verified organization membership and current actor. Metrics describe the most recent 50 permitted executions, not global enterprise performance. Unknown metrics remain unknown.
- `src/lib/dual-agent` defines authenticated handoff and overview APIs. SADEED and FNN share server-created task/correlation UUIDs in existing execution/audit records. The server accepts fixed tool IDs only: operational reads, incident proposals and work-order update proposals. Writes require the existing human approval path even when a registry entry does not require approval. Client input cannot set preApproved.
- Execution uses the existing tool registry, role checks, tenant isolation, approvals, audit, result records and available rollback. No arbitrary SQL, shell, URL, secret management or deployment tool is exposed. Outcomes are recorded as outcomes, not asserted to be semantically verified by an AI model.
- `/knowledge-upload` validates file types and 10 MiB size before parsing, previews extracted content and SHA-256 provenance locally, and requires an explicit confirmation before the existing upload/ingestion path. PDF and DOCX reuse installed parsers; CSV/XLSX support bounded tables, field extraction, duplicate-row removal and rejection of formulas in workbook cells; JSON validates record shape. Text is normalized and bounded by the existing 250,000-character limit. Parsing does not execute model instructions.
- Existing deterministic FNN planning now covers data ingestion and engineering review, without invoking a paid model. Existing voice/chat, reports, workflows, integrations and approval screens are linked and preserved.

## Explicit limitations

- The app does not have a GitHub code-writing executor, isolated code sandbox or Vercel publishing executor. Engineering requests can be planned and reviewed; this change does not invent connected runtime capabilities.
- No malware scanner is installed. Preview says not scanned; validation is not a malware-safety certificate. Legacy binary DOC/XLS and image-only PDF OCR are not supported by this path.
- Previewed fields become knowledge text, not arbitrary operational-table writes. Atomic document deduplication/transactional ingestion and universal rollback are not supplied by the existing schema. These require separately reviewed database work; no production schema changes are made.
- Full enterprise KPIs, strategic planning, scheduled ETL and integration execution depend on actual connected data and registered tools. Current command metrics are an actor-scoped execution sample.
- Existing AI spend gates remain in place. Opening the command center and preparing previews do not call a model. Confirming knowledge ingestion may use the existing embedding quota.
- Vercel connector inspection returned 403 for `faisaljohaimy-ship-its-projects`; no Vercel CLI was available. GitHub Actions settings explicitly show no repository or environment secrets, so its existing deployment workflow has no VERCEL_TOKEN either. Supabase connector denied the read-only production schema query. Live execution/RLS, embeddings and publishing cannot be certified through those connections.

## Release verification

Local verification completed on the final implementation:

- TypeScript and lint: zero errors; 33 existing lint warnings.
- Unit/component/contract tests: 203 files, 2,663 passed, 28 skipped. The ingestion suite additionally passed 6/6 after adding an XLSX fixture.
- Production Node build passed. A combined check had been killed by local memory pressure while browser/dev processes were active; the isolated final build succeeded after stopping them.
- All six bundle budgets and configured contrast checks passed. JavaScript (9.92/10 MiB) and CSS (0.58/0.60 MiB) headroom is tight.
- Tracked-file secret scan passed. Dependency audit has no high/critical findings, but retains one low and four moderate findings.
- Built-app Chromium checks at 390 and 1280 pixels in light/dark modes: no horizontal overflow; guest delegation disabled. CSV preview removed a duplicate, made zero POST requests before approval, and cancelled successfully.
- Quality guardian approved pushing the isolated branch and opening its PR.

Exact-head remote CI is checked after publishing the branch. Live authenticated integration and production publishing remain blocked by the service access described above. Never interpret skipped E2E tests or absent deployment as passed production verification.
