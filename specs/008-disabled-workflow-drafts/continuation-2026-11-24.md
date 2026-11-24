# Archived workflow draft continuation — 2026-11-24

The owner reopened archived work and then explicitly approved **«اعتماد المسودات
المعطلة فقط»** after reviewing the bounded SQL proposal. Application code and the
approved permission change are implemented. No production workflow row was created
or used for verification; live authenticated save/isolation acceptance remains open.

## Delivered application boundary

`workflow-draft-template.ts` recognizes only the complete Arabic or English offline
asset diagnostic request. It fixes one `sql.read` step, offline status, column list,
oldest-last-seen order and an integer limit1–50. Composite requests, permit expiry,
critical-asset task creation, arbitrary tools and JSON instructions are rejected.
Previewing invokes no model/provider, asset query or executor.

`WorkflowDraftComposer` is on `/workflows`. It reads existing caller memberships
through `listMyOrgs`, with a four-second timeout and error/retry/empty states.
Organization selection starts empty even for a single membership. Preview creation
is local and explicit; edits or account changes clear previews, request IDs, reviews
and receipts. No draft is placed in browser storage.

After preview, a separate review checkbox enables **Save disabled draft**. There is
no Run, Activate, scheduling or event-publication action. Save generates one request
UUID per reviewed parameter set and retains it across ambiguous outcomes. Retrying
requires a user action, uses the same ID and checks for an existing matching row
before attempting a single INSERT. Editing creates a new request identity.

`workflow-drafts.functions.ts` exposes only a private, authenticated POST accepting
`{draftId, orgId, request, limit}`. Strict validation rejects supplied definitions,
owner IDs, flags, topics and tool IDs. `workflow-drafts.server.ts` rechecks current
platform admin status and exact selected-organization operator-or-higher membership
using only the caller-scoped client. It rebuilds the definition and validates it
against the existing workflow schema. It explicitly fixes owner/org, disabled state,
null trigger topic, version1 and draft metadata; no unsafe database default is used.

The handler never upserts or updates. It acknowledges only an exact owner/org/ID/
metadata/definition match read from the stored row, including after transport
ambiguity or UUID conflict. JSONB object key order is normalized, but extra fields,
array differences or enabled/changed records are rejected. A missing/unreadable
post-insert row is unconfirmed, not falsely unsaved or successful. The established
audit helper attempts a bounded event after confirmed insertion, with a1.5-second
deadline and abort signal. Audit failure or a stalled transport cannot withhold the
already verified save receipt; no audit-success claim is made. A genuine receipt refreshes the existing workflow list.

## Permission evidence and actual application

The live site's OAuth metadata identified `cnaevysaoimzusnvpazr`, which reported
`ACTIVE_HEALTHY`. Before approval, catalog-only evidence at
`2026-11-24T16:07:40.097214Z` showed RLS enabled and no authenticated INSERT on the
table or any of twelve columns; UPDATE/DELETE were also absent.

Immediately before application at `2026-11-24T16:20:55.45135Z`, a second catalog read
confirmed the same ACL and the exact existing admin/tenant predicates. The approved
payload SHA-256 is
`0e37817f04f29f3e62ba30f8db415235251d1c38a9f3f71d2465cbd1fd2ddd7f`.
It was applied once through Supabase `apply_migration`, returning `success:true`,
and migration history records version`20261124162112`, name
`owner_approved_disabled_workflow_draft_insert`. The exact applied payload is mirrored
in `supabase/migrations/20261124162112_owner_approved_disabled_workflow_draft_insert.sql`.
Its original proposal header is retained as part of the immutable approved payload;
this receipt supersedes that historical header's not-applied status.

Post-application catalog evidence at `2026-11-24T16:21:34.153071Z` confirmed:

- INSERT granted on exactly ten explicit columns.
- No INSERT on `created_at` or `updated_at`, and no table-wide INSERT.
- UPDATE/DELETE still denied; anonymous INSERT still denied; RLS still enabled.
- All three existing policies retained, plus restrictive INSERT policy
  `workflows_disabled_draft_insert_only`.
- The new rule requires current-user ownership, `enabled=false`, null trigger topic,
  version1 and exact equality with the single bounded diagnostic definition.

No business rows, user records or credentials were read for these catalog checks.
No workflow insertion, role impersonation, activation or production row test occurred.
The applied change grants neither service-role access nor execution rights.

## Reversal and verification limits

The original reviewed forward/rollback artifacts remain under `proposals/`; they
are not commands for repeated execution. The forward preflight deliberately fails
once the reviewed grants exist. Rollback revokes the ten INSERT columns and drops
only the new restrictive rule, retaining all rows. Later grants require re-review
before rollback. No rollback was applied.

Five focused fixture suites passed65tests: exact AR/EN template/refusal/limit cases,
strict API input, current-authority and exact-receipt save boundaries, ambiguity/
same-ID retry, account-switch UI isolation/cancellation and hung-audit coverage.
The existing audit-coverage suite also passed with its prior callers unchanged. Targeted ESLint and diff checks
passed. These fixtures make no network or production writes and do not prove live
RLS behavior. A post-DDL security advisor scan reported no finding on `workflows`;
other unchanged project objects retain separate advisory findings.

US2 source/permission work is implemented, but T011 stays open until a separately
authorized real save/receipt and tenant-isolation exercise is observed in the
appropriate environment. Source tests and catalog metadata are not that acceptance.
