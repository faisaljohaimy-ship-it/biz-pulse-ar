# RAG Evaluation Harness — NOT EXECUTED

40 Arabic gold questions covering SEC-01..SEC-19 + PTW families in
`gold_set_ar.jsonl`. Evaluator is intentionally **not written** yet —
running any evaluation requires the DB migrations (001–006) applied
and ingestion completed, both of which need explicit approval.

## Planned metrics
| Metric | Threshold to unblock flag rollout |
|---|---|
| Recall@10 (doc_code hit) | ≥ 0.80 |
| MRR@10 | ≥ 0.55 |
| nDCG@10 | ≥ 0.60 |
| `insufficient_evidence` rate on out-of-domain probes | ≥ 0.90 |
| Cross-org leakage on isolation probe | 0 rows (any leak = automatic revert) |

## Planned runner outline (Deno, would live in `.rag-staging/eval/run.ts`)
```
for each row in gold_set_ar.jsonl:
  1. hit Edge fn /rag_query with { query }
  2. record status, top citation doc_code, per-channel ranks
  3. mark hit if any citation.doc_code == row.doc_code
compute Recall@10, MRR@10, nDCG@10
run 20 out-of-domain probes; assert status == "insufficient_evidence"
```

## Not run
None of the above has been executed. To run any of it we need:
1. Approval to apply migrations 001–006.
2. Approval to deploy `rag_query`.
3. A seed corpus (SEC/PTW ingestion) — planned as a separate approved step.

## Extension template
40 questions is enough to gate a first flag flip on one test org, but
production sign-off wants ≥ 200. Each new entry follows the same shape:
```
{"id":"gNNN","q":"سؤال عربي","doc_code":"SEC-XX|PTW-YYY","expected_sections":["…"]}
```
