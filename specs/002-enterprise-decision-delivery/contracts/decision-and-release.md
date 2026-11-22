# Decision and release contracts

## Decision interface

- The existing `/sec/decision-center` route offers at least three synthetic scenarios with accountable metadata and recommendation alternatives in both languages.
- Scenario switching/reset clears prior scenario review data; language switching retains the selected scenario and appropriate current progress.
- Review is explicitly local simulation. The exact synthetic staff-attribution exception/noindex remain; operational route gates do not broaden.
- The UI enables export after completed local review only; the pure serializer also labels draft reports honestly. Executive export is a local download of the selected scenario/state, safely encoded and independently labelled synthetic; it issues no operational/API/provider action.

## Delivery eligibility

- Required checks belong to the exact current PR head; absent, skipped, stale, cancelled, running, or failed required results cannot authorize merge.
- No merge with unresolved conflicts or an unaccounted concurrent update. Native auto-merge capability/permissions must be observed, not assumed.
- Deployment is tied to the resulting merged revision, intended project, and authorized Production environment. Existing protection and secret controls are not weakened for convenience.
- Record a last verified recovery target before release. Verify build identity, health, and essential routes within the required window; missing samples remain inconclusive.
- Failure/inconclusive verification follows the authorized known-good recovery procedure, records its outcome, and never rewrites main history or silently reports successful delivery.

## Resource boundaries

- FINN request-body reading enforces configured received-byte and upload-deadline limits before any model execution while retaining existing auth/rate/spend restrictions.
- Task Bus preabort never starts the agent. Deadline/abort settles the caller even if the agent ignores the signal, with listener/timer cleanup and safe late success/failure handling.
- Logical timeout is not a guarantee that noncooperative underlying work was terminated. Existing tool authorization is independent and unchanged.
