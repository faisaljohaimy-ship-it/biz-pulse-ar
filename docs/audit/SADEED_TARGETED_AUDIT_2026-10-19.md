# SADEED targeted owner audit — 2026-10-19 UTC

## Scope and identity

Initial local SHA: `374f207d1ee4241af31752141c373e7939cbb360`.
Managed edit branch: `edit/edt-3c63e4c6-21ad-49b2-88c3-ab157df457e1`.
No manual Git mutation, merge, push, production deploy, DB writes, permissions,
secret changes or billing changes. Local remotes point to managed storage;
the stated GitHub CI run/SHA was supplied by the owner, not independently queried.

## Reproduced and repaired

- Latency contracts: 2 failed / 10 passed before repair. Evaluate actual council
  guard across text/voice/deep, empty/nonempty input and OpenAI/default selection;
  evaluate provider-absence guard with Gemini/OpenAI present/absent. OpenAI remains
  explicit opt-in; no chat production routing change.
- CI policy: 2 failing tests before repair. Audit runs with `always()` after
  successful installation. Security E2E retains intentional optional deployment
  policy; missing credentials/upstream failures are explicitly NOT RUN in summary.
- Public HTTP classifier: 2 failed / 3 passed on reproduced old behavior, then
  5 passed. 500/429 remain errors, not absent records. Permit read has 4s timeout;
  unsubscribe check 4s and confirmation 10s. Retry never automatically writes.
- Backend lookup regression: 2 failed / 2 passed before repair, then all 4 passed.
  DB errors return 500; missing rows return 404 in permit GET and unsubscribe
  GET/POST. Existing queries and mutation behavior otherwise preserved.
- Static sitemap advertised `/about` and `/os`, both browser-confirmed 404;
  removed only those entries. Both sitemap implementations inspected: neither
  emits `lastmod`; no invented timestamps added.

## Executed evidence

- `bunx vitest run`: final run 2,604 passed, 28 skipped, 199 files.
  The 28 skips comprise 27 credential-gated RLS checks and one live retrieval
  evaluation; these are NOT security coverage.
- `npm run lint`: 0 errors, 33 existing warnings.
- `npm run check:secrets`: 2,622 tracked files clean at the final checkpoint.
- `npm run check:audit`: unavailable audit endpoint at sandbox registry.
- `npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org`:
  exit success; 4 low / 5 moderate, no high/critical. No forced dependency upgrade.
- Latest automatic preview build log: build OK after server fixes. No manual
  build/typecheck or dependency reinstall; full `npm ci` / `npm run check` gate
  NOT claimed.
- `npm run check:performance` and `npm run check:contrast`: blocked because
  production output is unavailable in checkout.
- `npm run check:rag`: failed: local PostgreSQL socket unavailable, not evidence
  of production data/permission failure. No production migration applied.
- SQL SELECT on current metadata: 148 public tables; 0 with RLS disabled.
  Reviewed thread/message owner policies, org membership, knowledge and archive
  policies. Definitions alone are not an authenticated two-tenant isolation test.

## Browser observations

On localhost at 390×844, correct stored `theme` key, light/dark crossed with
reduce/no-preference: zero page errors and no horizontal overflow. Reduced-motion
hydration #418 not reproduced. Unthrottled reload LCP 500–612ms, portrait IMG;
not comparable to throttled production Lighthouse 7–9s history. Banner already
uses opacity-only entry; no speculative homepage fix.

Public error injection at 1280×1800 in both themes: permit 500 displays safe
unknown-validity error; retry receiving explicit 404 displays not-found.
Unsubscribe 500 displays Arabic retry and does not disclose injected raw error.
These tests use intercepted responses and do not claim a real unsubscribe write.

Representative guest routes `/`, `/auth`, `/sec`, `/sec/maintenance`,
`/sec/incidents`, `/files`, `/request-demo`: 200, no page errors or horizontal
overflow. Employee-number overlay prevents real signed-in maintenance workflow;
auth film retry appeared. No login, real lead submission, CRUD or model generation
success claimed. `/about`, `/os` are 404.

## Remaining / release decision

Independent QA confirmed backend fixes and vetoed release: production bundle
performance, RAG/Postgres and credential-backed E2E gates absent. No publish.
Exhaustive route correctness remains incomplete: mechanical inventory found
148 component-route files, 96 without inline `head` (includes layouts/redirects;
not 96 proven user pages). Existing centralized noindex must be preserved;
do not fabricate titles/descriptions or broadly redesign.

Prior OpenAI quota, conversation persistence and stream-stop reports were not
retested with real generation/authenticated storage here; no success claimed.
Existing migration/export/retention owner blockers remain unchanged in roadmap.