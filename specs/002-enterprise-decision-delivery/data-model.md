# Decision and delivery data model

- **Scenario**: Stable synthetic ID, bilingual event/location/evidence/rationale, severity, responsible role, fictional due window, display status, and at least two option records. Preserve the existing unauthorized-access fixture contract where consumed.
- **Option**: Stable ID, bilingual recommendation and tradeoff. The preferred option is a proposal, not an operational instruction already accepted or executed.
- **Presentation state**: Selected scenario plus existing guarded progression, acknowledgement, local review outcome, and local audit. Selecting another scenario resets scenario-specific progress/acknowledgement/audit; locale changes preserve current scenario/progress.
- **Executive brief**: UI download requires completed local review; pure serialization also labels draft state honestly. Versioned/self-identifying export containing locale, selected scenario/metadata/options/evidence, current stage/review/audit, `simulated`/source disclosure, and explicit no-execution/approval limitation. No credentials, real staff/customer data, or live-performance claims.
- **Delivery record**: Feature head, PR, required checks and checked SHA, merged SHA, Vercel project/environment/deployment identity, known-good recovery identity, verification time/results, and recovery outcome if invoked.
- **Finding**: Capability/claim, repository or measured evidence, status (`reviewed`, `locally_verified`, `live_verified`, or `unverified`), risk/impact, and next action. Absence of evidence never maps to a healthy or compliant state.

All scenario records remain `simulated: true`; approval required remains true, operational approval false, and executed-actions empty across every user journey.
