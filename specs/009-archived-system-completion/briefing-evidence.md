# E05 — Bilingual read-only briefing and PDF, 2026-11-24

## Implemented candidate

`src/lib/executive/live-dashboard-briefing.ts` derives one Arabic/English briefing
from the already-loaded executive KPI/time-series responses. It preserves true
zero versus missing/nonfinite/out-of-range values, current KPIs versus period
totals, full-period totals versus filtered daily detail, and the existing last40
daily-row export bound. It does not infer a complete organization total from the
displayed daily subset.

The model identifies its existing source pages and distinguishes screen-fetch time
from report preparation time. The current response does not return per-value
live/fallback provenance or source-update time, and its series reader does not
prove complete organization coverage. Both the preview and PDF explicitly retain
those limitations. This is a deterministic summary of displayed readings, not an
AI-generated recommendation or operational approval.

`/live-dashboard` connects the localized preview to the existing PDF export.
The selected snapshot, language, source read times, scope and limitations are
shared with the PDF. Query errors do not export stale data; pending period reads
produce an honest bounded four-second unavailable-read state and leave PDF
disabled. The existing Refresh action is retained. Generation has a busy state,
retryable error and object-URL cleanup; filenames identify the selected language.

The four existing dashboard query keys are now account-scoped and wait for auth
discovery while retaining guest read access. Every account transition/unmount
invalidates an opaque export identity, including an A→B→A transition: a pending
old PDF cannot download or update the new account's error/busy state. This is a
client lifetime/cache repair using existing reads, not a change to server auth or
data permissions. The final targeted lint/format checks passed with no warnings;
real-account switching still belongs to G-AUTH acceptance.

`buildLiveDashboardPdf` reuses the existing `pdf-rich`/`pdf-lib`/fontkit Arabic
shaping and local font assets when a locale is supplied. The original default
English API/layout remains compatible. No new PDF engine, dependency, endpoint,
provider call, persisted briefing, business write or source-data read was added.
Existing `generateExecutiveBriefing` was deliberately not called: that separate
POST can invoke a model and persist a briefing, neither of which is needed for
this read-only export.

## Observed local evidence

- Two focused files /16 tests passed, including the eight existing English PDF
  regressions, pure bilingual/source/coverage cases, and independently reading
  actual AR/EN PDF bytes with pdfjs. Embedded Arabic fonts, timestamps, exact
  source paths and localized output were verified; files remain below400KiB.
- Real-PDF tests found an unsupported arrow glyph and reordered URI punctuation
  in mixed Arabic text. The adapter now uses supported punctuation and an
  explicit Latin source-path line; the shared report engine was not changed.
- Targeted ESLint, Prettier and diff whitespace checks passed. Interim full
  TypeScript runs contained no briefing/PDF diagnostics; other workstreams were
  concurrently writing files. Final combined types/build/performance checks are
  root-owned and remain separate evidence.
- Actual local-browser checks on AR390 and EN1280 showed zero page errors and no
  horizontal overflow. The existing period read did not arrive, so the PDF button
  correctly remained disabled and the final check observed the bounded localized
  refresh state. This is not a successful browser download or live-data acceptance.
  The primary PDF target uses an explicit44px minimum height rather than a rem
  minimum that the existing page styles rendered smaller.

Temporary observed logs: `/tmp/sadeed-briefing-tests.log`,
`/tmp/sadeed-briefing-lint.log`, `/tmp/sadeed-briefing-typecheck.log`,
`/tmp/sadeed-briefing-browser.log` and `/tmp/sadeed-briefing-browser-final.log`.
They do not certify later changes or replace a production receipt.

## Remaining acceptance

T012's bounded model/UI integration is implemented. T013's real browser download
against available period readings and the final candidate's build/performance and
production verification remain open. A missing backend response is not replaced
with fabricated customer values or labelled live. Source freshness/live-mode and
complete-scope acceptance require those facts to be provided by the underlying
source contract; this presentation layer does not create them.

Application source was finally frozen after that account-scope repair. The hashes
recorded in `/tmp/sadeed-briefing-frozen-sha256.txt` are:

- `live-dashboard.tsx`: `c2a879388961bde763b5fd7e7d7414f0a727cfcd8f3fc0a3cd0f30c4130c2214`
- `live-dashboard-briefing.ts`: `f01d2c4c4ae93d81220ef020e63cb726daeb173a1e9aab7cbc9aa6b9f4b17a92`
- `live-dashboard-pdf.ts`: `54302a520559aedff2979039cc6c39a4c8c4219b541d9ff4be6dbe22666d39cd`

Earlier browser observations and16 PDF/model tests do not claim to exercise an
actual account switch through that final client guard. Root owns the final
integrated revision's checks; no app cleanup is included after this freeze.
