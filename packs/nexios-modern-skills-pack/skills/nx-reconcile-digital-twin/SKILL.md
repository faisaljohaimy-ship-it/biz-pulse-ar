---
name: nx-reconcile-digital-twin
description: "Execute reconcile digital twin for NEXIOS with evidence, tenant isolation, explicit uncertainty, and governed actions. Use when the user or an agent needs to reconcile the digital representation with authoritative asset and field evidence."
---

# Reconcile Digital Twin

**الاسم العربي:** مطابقة التوأم الرقمي  
**المجال:** الأصول والعمليات

## Mission

Reconcile the digital representation with authoritative asset and field evidence. Work from authoritative NEXIOS evidence and return an auditable result that a human owner can verify.

## Required inputs

- asset hierarchy
- condition and history
- work backlog
- service criticality
- resource constraints

Before analysis, mark each input as verified, stale, missing, conflicting, or simulated. Record its source identifier and observation time.

## Workflow

1. Confirm asset identity, hierarchy, duty, criticality, and authoritative data sources.
2. Establish current condition, failure history, work status, and operating context.
3. Rank intervention options by safety, production, compliance, cost, and failure consequence.
4. Check spares, skills, access, dependencies, and outage-window feasibility.
5. Issue an evidence-backed plan with owners, thresholds, and post-work verification.
6. Run a final contradiction, completeness, tenant-boundary, and approval check.

## Evidence rules

- Cite a source identifier and observation time for every material factual claim.
- Separate fact, inference, forecast, recommendation, and human decision.
- Use calibrated confidence: high, medium, low, or insufficient evidence.
- Abstain when evidence is insufficient for a consequential conclusion.
- Never treat simulated or demo data as production evidence.

## Tool policy

Recommended allowlist:
- `nx.asset.get-asset-health`
- `nx.asset.query-work-orders`
- `nx.asset.create-work-order`

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
