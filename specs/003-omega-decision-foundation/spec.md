# Feature Specification: SADEED OMEGA — Evidence, Risk Hypotheses and What-if

**Feature Branch**: `feature/sadeed-omega-foundation-20261122`, from verified `c55b65304d7299cd359cfb27a1df980a1c0bde45`
**Created**: 2026-11-22
**Status**: All required local checks passed; new cycle captured at 0/4 before first push. Final guardian clearance and post-commit remote delivery remain pending.
**Input**: Deliver a bounded first OMEGA iteration connecting owner capabilities **01 SECURITY WORLD MODEL**, **04 CAUSAL RISK REASONING**, and **06 WHAT-IF SECURITY SIMULATION**, plus an honest 15-capability roadmap, eight-competitor Innovation Gap Matrix, ten quality-target evidence axes, and repeatable 3–5 minute demonstration. Preserve working units and the permanent delivery policy; do not imply that all fifteen capabilities are built.

## User Scenarios & Testing

### User Story 1 — Inspect the evidence-linked scenario world (Priority: P1)

A security reviewer opens an existing synthetic access, camera, or patrol case and inspects relevant assets, event, controls and dependencies as a coherent transient view.

**Why this priority**: Risk and comparison need a shared context with traceable identities and source limitations.
**Independent Test**: Inspect every scenario's graph and bounded dependency trace, following visible claims to synthetic evidence without a live integration.

**Acceptance Scenarios**:

1. **Given** a selected scenario, **When** the context projection opens, **Then** every entity/relationship has stable local identity, relevant context and explicit fixture provenance; missing facts remain missing.
2. **Given** a dependency selection, **When** its trace is requested, **Then** the result is bounded, references valid nodes and does not silently establish a causal fact.
3. **Given** a fresh projection, **When** its time/source is read, **Then** projection time cannot be mistaken for a measured incident/sensor timestamp, a live twin, or a durable knowledge-graph update.

### User Story 2 — Review explainable risk hypotheses (Priority: P1)

A reviewer sees which disclosed rules connect scenario evidence and assumed control gaps to a review priority, and which missing facts would be needed to investigate further.

**Why this priority**: An explanation must disclose its support and uncertainty rather than present a guessed cause as fact.
**Independent Test**: Inspect rule IDs, evidence links, missing facts and proposed verification for every fixture and relevant assumption change.

**Acceptance Scenarios**:

1. **Given** synthetic evidence and bounded assumptions, **When** risk hypotheses are shown, **Then** each explanation distinguishes supplied evidence, assumed facts, missing facts and a proposed verification step.
2. **Given** a categorical review priority, **When** it changes, **Then** the interface explains the changed rule/control gap without claiming a calibrated probability, proven root cause, predictive accuracy, or changed historical-event severity.
3. **Given** incomplete or conflicting context, **When** a hypothesis is displayed, **Then** uncertainty remains explicit; lack of evidence is not silently converted into safety, certainty, or a measured zero.

### User Story 3 — Compare an isolated what-if and review its report (Priority: P1)

A reviewer changes a small set of hypothetical controls, compares the immutable baseline with the variant, then records a local human-review result and exports the exact assumptions and reasoning.

**Why this priority**: This connects world context and rule explanations to an actionable review artifact while retaining operational boundaries.
**Independent Test**: Change each supported input, compare baseline/variant, review/export, alter an assumption after review, reset, change scenario, and switch language.

**Acceptance Scenarios**:

1. **Given** a baseline, **When** camera availability, patrol count, response time, route availability or connectivity changes within supported bounds, **Then** a deterministic labelled hypothetical comparison explains any priority/control difference; the baseline is unchanged.
2. **Given** invalid/nonfinite/unsupported input, **When** evaluation is attempted, **Then** it is refused rather than producing a plausible fabricated result.
3. **Given** completed local review in the controlled demo UI, **When** any assumption changes, **Then** the UI invalidates prior acknowledgement/review/export eligibility; the old local review cannot keep export enabled for the new variant.
4. **Given** a scenario switch or reset, **When** the new run begins, **Then** its defaults and context replace the prior assumptions, trace, review and export state. Locale changes retain the current semantic state.
5. **Given** an eligible export, **When** a report is downloaded, **Then** it includes the exact scenario/assumptions, baseline and variant interpretation, rule/evidence/missing-fact disclosure, and simulation/no-approval limitations. The serializer rebuilds the canonical fixture/rules from validated inputs, rejecting modified event/severity/evidence text, a foreign scenario, extra result fields or malformed assumptions. Caller-supplied review state is not authenticated history or proof of a real actor.
6. **Given** any interaction, **When** it completes, **Then** no sensor/camera/provider/database/tool/dispatch is called and operational approval remains false.

### User Story 4 — Understand OMEGA maturity and differentiation (Priority: P2)

An owner reviews a 15-capability roadmap and eight-vendor primary-source comparison, then watches a repeatable 3–5 minute demonstration of the selected three capabilities.

**Why this priority**: The program must distinguish what works in its actual mode from partial, synthetic and unavailable capabilities.
**Independent Test**: Trace all roadmap/matrix claims to source, test or observed-release evidence and follow the demonstration without additional authority or setup writes.

**Acceptance Scenarios**:

1. **Given** fifteen owner-labelled capabilities, **When** their roadmap is read, **Then** each has an honest current status, evidence, gap, dependencies, priority and next acceptance check; only this iteration's three are selected for implementation.
2. **Given** eight competitors, **When** the Innovation Gap Matrix is read, **Then** official sources, dates, availability/plan limits and documented versus announced versus inferred claims are visible; unreviewed capability is not declared absent.
3. **Given** the ten OMEGA quality targets, **When** evidence is reported, **Then** target scores are not presented as achieved results and unknown metrics remain unmeasured.
4. **Given** the demo guide, **When** it is followed, **Then** the selected three capabilities connect through one scenario, a what-if, human review and export within a planned 3–5 minute presentation, with no operational side effects.

### Edge Cases

- Assumed controls can change review priority while the original fixture's critical/high event classification remains unchanged.
- A dependency relation or a field named `caused_by` is not proof of causation; no counterfactual/physical/causal-validity claim follows from deterministic rules.
- The baseline/variant are both synthetic. Do not mix them with real rows, model confidence or live sensor state.
- Malformed locale, scenario, assumptions, report payload and graph references fail safely; bounded traversal cannot hang on cycles or exceed its configured limit.
- Hidden `/theater`, `/mission-control` and `/nx-cockpit` routes stay retired; the accepted `/sec/decision-center` is reused.

## Requirements

### Functional Requirements

- **FR-001**: Reuse the existing decision-center route, scenario catalog, review flow and HTML report for a transient evidence-linked world projection.
- **FR-002**: Every graph/rule/comparison claim MUST carry synthetic provenance and distinguish evidence, assumption, missing fact and hypothesis.
- **FR-003**: The five what-if controls MUST accept only valid bounded values and produce deterministic baseline/variant results without altering the baseline or existing event severity.
- **FR-004**: In the controlled local demo UI, any assumption change MUST invalidate earlier acknowledgement/review/export eligibility; scenario/reset and locale behavior MUST match the acceptance cases above.
- **FR-005**: The serializer MUST rebuild the canonical fixture/rule projection from validated scenario/assumptions, reject altered fixture/event/severity/evidence, foreign scenario, extra result fields and malformed inputs, and preserve existing HTML escaping/no-authority invariants. It MUST NOT be represented as authenticating caller review history, actor identity or a tamperproof/durable audit.
- **FR-006**: Arabic/English, RTL/LTR, both themes, keyboard access, 44px primary targets and 360/390/430/768/1280px layouts MUST remain usable.
- **FR-007**: No new route, provider invocation, operational tool, server store, DB seeder, production write, 3D activation or operational authority is introduced.
- **FR-008**: The fifteen-row roadmap, eight-vendor source-backed matrix, ten-target evidence checklist and 3–5 minute demo MUST distinguish working / partial / demo / unavailable status from the strength of their evidence.
- **FR-009**: Existing protected assets, budgets, security gates and permanent feature/CI/PR/staged-release policy MUST remain intact; release evidence is recorded only when observed.

### Key Entities

- **World projection**: Bounded local entities/relationships derived from one existing synthetic scenario, with fixture evidence and explicit uncertainty.
- **Risk hypothesis**: Rule-based interpretation, supporting references, missing facts and recommended verification; no calibrated probability or established root cause.
- **Assumption set**: Five validated hypothetical controls, separate from supplied evidence.
- **Comparison**: Immutable baseline and variant with explained categorical review-priority/control differences.
- **Decision artifact**: Reviewed local scenario/assumptions and canonical report interpretation, without real approval or executed actions.
- **Capability/vendor evidence record**: Status/claim, source/date/version, operating mode, limits, gaps and next validation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All three existing scenarios complete projection → hypothesis → what-if → local review/export/reset in both languages without state leakage or network/operational side effects.
- **SC-002**: Nonempty graph/rule records have valid evidence references; invalid assumptions and report mismatches are rejected; changing any of the five controls invalidates stale review/export in the controlled UI.
- **SC-003**: Supported viewport/theme/language combinations retain 44px primary controls and no page overflow; actual report downloads preserve the exact variant.
- **SC-004**: All fifteen roadmap rows and eight competitor rows carry scoped evidence and limits. No target score, predictive accuracy, novelty or patentability is invented.
- **SC-005**: The new exact revision passes the applicable quality gates and permanent delivery process; PR/merge/deployment/verification or concrete blockers are reported honestly.

## Assumptions

- Review binding is enforced by local UI state. The serializer receives caller-supplied simulation state; it does not sign or authenticate history, prove a real reviewer, or provide cryptographic integrity/durable audit.
- This is the first bounded version of #01/#04/#06, not a complete live world model, causal-inference engine, physical simulator, security swarm or enterprise program.
- Published vendor features do not establish our tenant's integration or comparative performance; no uniqueness, IP/patentability or freedom-to-operate claim is made.
- Production database/auth/RLS changes, paid provider activation, biometrics, sensitive autonomous actions and model training remain outside this iteration's authority.
- A new finite release cycle is established for this new task before its first push; the prior closed task's emergency reserve is not reused or evaded.
