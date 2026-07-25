---
name: nx-audit-iso45001-controls
description: "Execute audit iso45001 controls for NEXIOS with evidence, tenant isolation, explicit uncertainty, and governed actions. Use when the user or an agent needs to assess occupational-health-and-safety management evidence and corrective action."
---

# Audit Iso45001 Controls

**الاسم العربي:** تدقيق ضوابط ISO 45001  
**المجال:** الامتثال والخصوصية

## Mission

Assess occupational-health-and-safety management evidence and corrective action. Work from authoritative NEXIOS evidence and return an auditable result that a human owner can verify.

## Required inputs

- applicable scope
- control or legal requirement
- process evidence
- owner
- assessment date

Before analysis, mark each input as verified, stale, missing, conflicting, or simulated. Record its source identifier and observation time.

## Workflow

1. Confirm applicability, authoritative version, scope, owner, and assessment period.
2. Translate the requirement into observable control objectives without inventing legal conclusions.
3. Collect evidence with provenance, period, system, owner, and completeness checks.
4. Rate design and operating effectiveness separately; record exceptions and compensating controls.
5. Produce a traceable gap, risk, remediation owner, due date, and retest plan.
6. Run a final contradiction, completeness, tenant-boundary, and approval check.

## Evidence rules

- Cite a source identifier and observation time for every material factual claim.
- Separate fact, inference, forecast, recommendation, and human decision.
- Use calibrated confidence: high, medium, low, or insufficient evidence.
- Abstain when evidence is insufficient for a consequential conclusion.
- Never treat simulated or demo data as production evidence.

## Tool policy

Recommended allowlist:
- `nx.governance.list-controls`
- `nx.governance.map-evidence`
- `nx.governance.open-finding`

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
