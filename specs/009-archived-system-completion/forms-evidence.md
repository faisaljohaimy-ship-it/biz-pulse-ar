# E02 constrained interactive review forms — 2026-11-24

The archived request identifies three interactive assistant forms without naming
their types. The explicit engineering assumption for this continuation is to use
three already registered preparation kinds: `summarize`, `prepare_report` and
`prepare_task`. These choices are a bounded current implementation, not recovered
historical form identities or authorization to execute the registry actions.

`constrained-draft-forms.ts` provides a strict Zod input contract: exactly the three
kinds, locale `ar`/`en`, topic3–160 characters and notes1–1200. Extra fields,
unknown kinds/locales and invalid lengths fail. The resulting editable review
prompt is limited to2048 characters, matching the existing singleton composer.
It labels notes as supplied and unverified and asks for proposed text only, with
no sending, publishing, task creation/assignment, approval or tool execution.

`SadeedDraftForms` contains three initially closed forms inside an initially closed
details group. It uses the existing Input/Textarea/Button components, localized
labels and44px input/button/summary targets. User text stays ordinary React form
values; no HTML renderer is introduced. Submission calls `onDraft` only after
validation and clears fields after handoff. There is no fetch, provider/SDK,
server-function call, persistence, execution, approval or automatic submit.

`HomeSadeedCard` mounts the group below its existing composer, outside that form.
Its key is the current user ID or guest, so account changes discard every form's
content. The sole new handoff is existing `open({focus:true,draft})`; it does not
call `ask`, create a second assistant or change the existing quick-action behavior.
The user still reviews/edits and explicitly submits in the canonical assistant.

Source scope: the new pure helper and component plus focused tests, and a small
import/render in `HomeSadeedCard.tsx`. Existing action registry, auth, provider,
permission/approval gates and server routes are unchanged. These forms do not
claim a saved workflow, approved report, created task or completed live operation.

## Observed checks

- New pure/UI regressions:2 files,23 tests passed. They cover invalid kinds,
  extra authority fields, locale/size limits, all three AR/EN output bounds,
  plain-text markup, initially closed forms, no autosend/fetch/ask, and actual
  HomeSadeedCard account-change reset and draft-only handoff.
- Existing homepage and Blueprint contracts:2 files,73 tests passed.
- Targeted ESLint exited0; `git diff --check` passed.
- Logs: `/tmp/sadeed-constrained-forms-tests.log`,
  `/tmp/sadeed-constrained-forms-home-regressions.log` and
  `/tmp/sadeed-constrained-forms-lint.log`. These local checks are not a production
  listening, provider-quality or operational-execution result. Root owns final
  integrated build, browser verification, release and archived-task reconciliation.
