# Demonstration data and state

- **Scenario**: Existing ID/Arabic fields with English counterparts, `simulated: true`, `source: "demo_fixture"`, preset critical severity/rationale, `approvalRequired: true`, and operational status `awaiting_human_approval`.
- **Evidence**: Nonempty bilingual synthetic observations with uncertainty; no real sensor identifiers, people, or confidence measurements.
- **Presentation**: Idle → assessment → recommendation → human-review presentation. Local review can indicate reviewed or needing verification. Reset restores initial state.
- **Invariants**: Advancing/reviewing never changes approval requirements, creates operational approval, or creates an executed state. Invalid/repeated transitions cannot bypass stages.

Implementation owns exact TypeScript export names; these are observable behavior contracts, not a parallel schema.
