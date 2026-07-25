---
name: nx-enforce-release-gate
description: "Execute enforce release gate for NEXIOS with evidence, tenant isolation, explicit uncertainty, and governed actions. Use when the user or an agent needs to evaluate mandatory quality, security, compliance, performance, and operational checks."
---

# Enforce Release Gate

**الاسم العربي:** فرض بوابة الإصدار  
**المجال:** هندسة البرمجيات والمنصة

## Mission

Evaluate mandatory quality, security, compliance, performance, and operational checks. Work from authoritative NEXIOS evidence and return an auditable result that a human owner can verify.

## Required inputs

- change scope
- architecture and code diff
- test evidence
- risk classification
- rollback plan

Before analysis, mark each input as verified, stale, missing, conflicting, or simulated. Record its source identifier and observation time.

## Workflow

1. Define the change boundary, affected users, data, dependencies, and failure modes.
2. Review design and implementation against explicit security and reliability invariants.
3. Verify automated tests, migration safety, observability, performance, and rollback.
4. Test high-risk paths and negative cases using reproducible evidence.
5. Issue a release decision with blockers, owners, conditions, and post-deploy checks.
6. Run a final contradiction, completeness, tenant-boundary, and approval check.

## Evidence rules

- Cite a source identifier and observation time for every material factual claim.
- Separate fact, inference, forecast, recommendation, and human decision.
- Use calibrated confidence: high, medium, low, or insufficient evidence.
- Abstain when evidence is insufficient for a consequential conclusion.
- Never treat simulated or demo data as production evidence.

## Tool policy

Recommended allowlist:
- `nx.devsecops.inspect-ci-run`
- `nx.devsecops.scan-dependencies`
- `nx.observability.query-traces`

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
