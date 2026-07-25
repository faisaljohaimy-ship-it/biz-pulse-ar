---
name: nx-investigate-near-miss
description: "Execute investigate near miss for NEXIOS with evidence, tenant isolation, explicit uncertainty, and governed actions. Use when the user or an agent needs to reconstruct a near miss, identify system causes, and prevent recurrence without blame."
---

# Investigate Near Miss

**الاسم العربي:** التحقيق في شبه الحوادث  
**المجال:** السلامة والطوارئ

## Mission

Reconstruct a near miss, identify system causes, and prevent recurrence without blame. Work from authoritative NEXIOS evidence and return an auditable result that a human owner can verify.

## Required inputs

- hazard and task
- people exposed
- controls and barriers
- site conditions
- emergency authority

Before analysis, mark each input as verified, stale, missing, conflicting, or simulated. Record its source identifier and observation time.

## Workflow

1. Define the task, hazard, exposed people, location, timing, and credible worst case.
2. Verify prerequisite permits, isolations, competency, equipment, and emergency arrangements.
3. Evaluate preventive and mitigative barriers for independence and current health.
4. Stop or suspend work when a critical control is absent, failed, or unverifiable.
5. Record accountable actions, revalidation triggers, and evidence required for safe closure.
6. Run a final contradiction, completeness, tenant-boundary, and approval check.

## Evidence rules

- Cite a source identifier and observation time for every material factual claim.
- Separate fact, inference, forecast, recommendation, and human decision.
- Use calibrated confidence: high, medium, low, or insufficient evidence.
- Abstain when evidence is insufficient for a consequential conclusion.
- Never treat simulated or demo data as production evidence.

## Tool policy

Recommended allowlist:
- `nx.safety.validate-controls`
- `nx.safety.inspect-permit`
- `nx.safety.dispatch-emergency`

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
