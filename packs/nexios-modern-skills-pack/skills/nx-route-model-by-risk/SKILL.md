---
name: nx-route-model-by-risk
description: "Execute route model by risk for NEXIOS with evidence, tenant isolation, explicit uncertainty, and governed actions. Use when the user or an agent needs to select an approved model by task complexity, sensitivity, latency, cost, and assurance."
---

# Route Model By Risk

**الاسم العربي:** توجيه النموذج حسب المخاطر  
**المجال:** الذكاء الاصطناعي والوكلاء

## Mission

Select an approved model by task complexity, sensitivity, latency, cost, and assurance. Work from authoritative NEXIOS evidence and return an auditable result that a human owner can verify.

## Required inputs

- task and risk tier
- model and prompt version
- tool policy
- evaluation set
- trace evidence

Before analysis, mark each input as verified, stale, missing, conflicting, or simulated. Record its source identifier and observation time.

## Workflow

1. Classify the use case, impact, autonomy, data sensitivity, and required human authority.
2. Fix model, prompt, tools, retrieval corpus, policy, and evaluation versions.
3. Run normal, edge, adversarial, and tool-misuse tests with trace capture.
4. Measure task quality, grounding, safety, latency, cost, and approval compliance.
5. Gate deployment on thresholds; document residual risk, monitoring, rollback, and owner.
6. Run a final contradiction, completeness, tenant-boundary, and approval check.

## Evidence rules

- Cite a source identifier and observation time for every material factual claim.
- Separate fact, inference, forecast, recommendation, and human decision.
- Use calibrated confidence: high, medium, low, or insufficient evidence.
- Abstain when evidence is insufficient for a consequential conclusion.
- Never treat simulated or demo data as production evidence.

## Tool policy

Recommended allowlist:
- `nx.ai.evaluate-response`
- `nx.ai.detect-prompt-injection`
- `nx.agents.evaluate-run`

Discover and call only tools approved for the active organization and agent. Validate input and output schemas. A tool descriptor does not prove that a connector is configured.

## Approval and safety

- Keep all access inside the active organization; never infer or combine cross-tenant data.
- Request human approval before any write, notification, dispatch, account, financial, safety, or other material external action.
- For life safety, security, legal, regulatory, medical, or financial consequences, provide decision support and route authority to the accountable human.
- Do not bypass RLS, connector scopes, approval ledgers, rate limits, or audit logging.
- Prefer reversible or compensating actions and state rollback criteria before execution.

## Output contract

Return:

1. `status`: complete, partial, blocked, or insufficient_evidence.
2. `summary_ar`: concise Arabic-first result.
3. `summary_en`: aligned English summary.
4. `evidence`: source, source ID, observation time, supported claim, and confidence.
5. `analysis`: method, comparisons, assumptions, and contradictions.
6. `recommendations`: ranked options with benefits, risks, and dependencies.
7. `actions`: owner, due date, approval requirement, and success measure.
8. `confidence`: calibrated overall confidence and why.
9. `limitations`: missing evidence, scope exclusions, and required expert review.

## Completion gate

Complete only when the result is reproducible from cited evidence, material uncertainty is visible, every consequential action has an owner and approval path, and no unresolved tenant or safety violation remains.
