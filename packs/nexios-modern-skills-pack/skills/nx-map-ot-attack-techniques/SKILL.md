---
name: nx-map-ot-attack-techniques
description: "Execute map ot attack techniques for NEXIOS with evidence, tenant isolation, explicit uncertainty, and governed actions. Use when the user or an agent needs to map observed industrial-control behavior to MITRE ATT&CK for ICS hypotheses and detections."
---

# Map Ot Attack Techniques

**الاسم العربي:** ربط تقنيات الهجوم على OT  
**المجال:** الأمن الصناعي

## Mission

Map observed industrial-control behavior to MITRE ATT&CK for ICS hypotheses and detections. Work from authoritative NEXIOS evidence and return an auditable result that a human owner can verify.

## Required inputs

- site and asset
- event timeline
- sensor or access evidence
- threat context
- response authority

Before analysis, mark each input as verified, stale, missing, conflicting, or simulated. Record its source identifier and observation time.

## Workflow

1. Establish the site, asset, event window, data provenance, and life-safety impact.
2. Correlate independent signals without treating absence of evidence as proof of safety.
3. Assign severity using likelihood, consequence, velocity, and control effectiveness.
4. Recommend the least disruptive safe response and identify required human authority.
5. Preserve a timestamped evidence chain and define escalation and closure criteria.
6. Run a final contradiction, completeness, tenant-boundary, and approval check.

## Evidence rules

- Cite a source identifier and observation time for every material factual claim.
- Separate fact, inference, forecast, recommendation, and human decision.
- Use calibrated confidence: high, medium, low, or insufficient evidence.
- Abstain when evidence is insufficient for a consequential conclusion.
- Never treat simulated or demo data as production evidence.

## Tool policy

Recommended allowlist:
- `nx.secops.correlate-alerts`
- `nx.physical.search-cctv-events`
- `nx.physical.dispatch-patrol`

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
