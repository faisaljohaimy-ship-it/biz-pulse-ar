---
name: nx-optimize-contact-center
description: "Execute optimize contact center for NEXIOS with evidence, tenant isolation, explicit uncertainty, and governed actions. Use when the user or an agent needs to balance demand, staffing, quality, resolution, customer effort, and cost."
---

# Optimize Contact Center

**الاسم العربي:** تحسين مركز الاتصال  
**المجال:** الموارد البشرية وتجربة العميل

## Mission

Balance demand, staffing, quality, resolution, customer effort, and cost. Work from authoritative NEXIOS evidence and return an auditable result that a human owner can verify.

## Required inputs

- population and period
- service or role
- evidence sources
- fairness constraints
- accountable owner

Before analysis, mark each input as verified, stale, missing, conflicting, or simulated. Record its source identifier and observation time.

## Workflow

1. Define the population, outcome, period, legal or fairness constraints, and decision owner.
2. Use aggregated evidence and minimize exposure of personal or sensitive data.
3. Segment causes and needs without inferring protected traits or unsupported intent.
4. Compare interventions by impact, fairness, feasibility, and measurement quality.
5. Return accountable actions, communication, safeguards, and outcome measures.
6. Run a final contradiction, completeness, tenant-boundary, and approval check.

## Evidence rules

- Cite a source identifier and observation time for every material factual claim.
- Separate fact, inference, forecast, recommendation, and human decision.
- Use calibrated confidence: high, medium, low, or insufficient evidence.
- Abstain when evidence is insufficient for a consequential conclusion.
- Never treat simulated or demo data as production evidence.

## Tool policy

Recommended allowlist:
- `nx.data.query-catalog`
- `nx.knowledge.search-corpus`
- `nx.communications.draft-mail`

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
