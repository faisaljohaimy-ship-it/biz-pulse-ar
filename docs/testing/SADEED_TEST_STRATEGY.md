# SADEED — Test strategy (2026-10-17)

How SADEED proves a change is safe, what each layer catches, and what is still outside automated proof. Counts are from the release candidate's gate chain at `29f56e364`: 184 files, 2,427 tests — 2,399 passed, 28 skipped (two live-only suites), 0 failed.

## 1. Layers

| Layer                                                                                                        | What it catches                                                                                                                                   | Examples                                                                                                                                      | Runs where                                                      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Unit tests (vitest, jsdom by default; `// @vitest-environment node` for server routes that parse `FormData`) | logic errors in pure modules                                                                                                                      | `rate-limit-breaker`, `request-guards`, `ai-quota-degraded`, `self-call-origin`                                                               | local chain, CI `test` job                                      |
| Behavioural route tests (handlers invoked directly with mocked providers and stores)                         | order of gates, status codes, headers, zero provider calls on denial                                                                              | `chat-gate-resilience` (12), `chat-request-guards` (5), `chat-auth-deadline` (5), `-model-route-gates` (12), `public/health` (4)              | same                                                            |
| Contract / source-scan guards (read the source, derive lists from code)                                      | a new spender or route silently bypassing a control; literal gate order; env-tunable caps                                                         | `ai-quota.contract.test.ts`, `ai-gate-internal.contract.test.ts` (per-function), `product-brand.contract.test.ts`, `top-bar.contract.test.ts` | same                                                            |
| Mutation checks (manual, recorded by the guardian)                                                           | tests that stay green when the protection is removed                                                                                              | M1–M8 on this candidate, all red; M5 fixed by the per-function contract                                                                       | guardian session before push                                    |
| Live-only suites (skipped without env)                                                                       | real RLS isolation (27 tests), RAG live eval                                                                                                      | `rls-isolation.test.ts`, `rag-live-eval.test.ts`                                                                                              | **nowhere yet** — need `RLS_TEST_*` against an isolated project |
| RAG preflight on a real Postgres                                                                             | isolation and privilege of the RAG schema                                                                                                         | `scripts/rag-preflight.sh`, `supabase/preflight/*.sql`                                                                                        | CI `rag-preflight` job                                          |
| Static gates                                                                                                 | types, lint, formatting, secrets, dependency advisories, bundle budget, contrast floor                                                            | `tsc`, `eslint`, `prettier`, `check-secrets`, `check:audit`, `check-performance-budget`, `check-background-contrast`                          | local chain + CI                                                |
| Production checks                                                                                            | served HTML contract, UI floors at real viewports, build SHA attestation, health, auth, a real Arabic chat, dedup, optional rate-limit exhaustion | `production-check.yml` (+`expected_sha`), `production-smoke.yml`                                                                              | GitHub runners only (sandbox cannot reach production)           |
| Backend alert                                                                                                | database / rate-limit store down                                                                                                                  | `backend-health.yml` (6-hourly)                                                                                                               | GitHub runners                                                  |

## 2. Rules for a fix

1. Reproduce with a failing test first when the defect is testable in isolation (the chat gate, quota and header fixes in this release all started from red tests or from a mutation that stayed green).
2. Fix the root cause in the smallest scope; never make a test pass by weakening its assertion.
3. Add the regression test next to the behaviour (route test for HTTP behaviour, contract test for "every X must have Y").
4. Run the targeted tests, then the full chain: `npm run check` (lint, typecheck, test, build, budget, contrast, secrets, audit).
5. Ask the guardian (`nexios-qa-guardian`) for a mutation pass before pushing; record the mutations it ran.
6. Push the branch, dispatch `ci.yml` on it, and only compare green runs on the exact SHA.

## 3. Skipped and blocked tests (never counted as passed)

| Test                                                          | Why                                                           | Unblock                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `rls-isolation.test.ts` (27)                                  | needs `RLS_TEST_URL/KEY` and two test users on a live project | create an isolated test project; add secrets to CI; backend must be awake |
| `rag-live-eval.test.ts` (1)                                   | needs live RAG                                                | same                                                                      |
| Article-19 Playwright E2E (CI job `security-gap-closure-e2e`) | needs `E2E_TEST_*` + `VITE_SUPABASE_*` secrets                | add repository secrets                                                    |
| `production-smoke.yml`                                        | needs Publish + a live backend; spends ≤2 model calls         | run after publish                                                         |

## 4. Gaps acknowledged

No load test of the degraded in-memory caps across isolates; no automated check of prompt-injection resistance beyond text framing; no coverage number is reported (the project does not run coverage in CI).
