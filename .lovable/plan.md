## Wave: Production Executive Reports (PDF + Excel + Outlook + Schedule)

Builds on the existing SharePoint+Teams publisher. Adds real binary report generation, Outlook delivery, and recurring schedules — no placeholders.

### 1. Real binary report generation
File: `src/lib/reports/builder.server.ts` (server-only).
- `buildExecPdf(kpis, incidents, workOrders, permits, opts)` → `Uint8Array` using `pdf-lib` (already installed). Bilingual EN cover + KPI grid + tables. Embed Noto/built-in fonts.
- `buildExecXlsx(snapshot)` → `Uint8Array` using `xlsx` (already installed). Sheets: `Summary`, `KPIs`, `Incidents`, `Work Orders`, `Permits`, `Patrols`.

### 2. Snapshot aggregator
File: `src/lib/reports/snapshot.server.ts`.
- `buildExecutiveSnapshot(supabaseAdmin, { range: '24h' | '7d' | '30d' })` → pulls live counts/aggregates from `sec_incidents`, `sec_work_orders`, `sec_permits`, `sec_patrols`, `sec_cctv_alerts`, `sec_assets`. Returns typed snapshot used by both PDF and Excel.

### 3. New publisher: PDF + Excel + SharePoint + Outlook
Extend `src/lib/exec-reports.functions.ts`:
- New server fn `publishExecutiveReportBinary` (admin-gated, RLS):
  1. Build snapshot.
  2. Build PDF + XLSX bytes.
  3. Upload BOTH to SharePoint under `NEXIOS Reports/YYYY-MM/`.
  4. Create org share links (fallback to webUrl).
  5. Send Outlook mail (Graph `/me/sendMail`) to recipients with both files as base64 attachments and HTML body containing KPI highlights + links.
  6. Audit log.
- Reuses existing `failFromResponse` + error envelope so the Error Card works unchanged.

### 4. Recurring schedules
Migration: `report_schedules` table — `id`, `org_id`, `name`, `frequency` (`daily`|`weekly`), `hour_utc`, `weekday`, `site_id`, `team_id`, `channel_id`, `recipients text[]`, `range` (`24h`|`7d`), `enabled`, `last_run_at`, `last_status`, `last_error`, `created_by`. RLS: admin read/write within org; service_role full.
Cron route: `src/routes/api/public/hooks/executive-reports-run.ts` (apikey-protected). Iterates due enabled schedules, calls publisher with service-role context, updates `last_run_at`/status.
pg_cron schedule: every 15 min hitting the route.

### 5. UI extensions in `/executive-reports`
- New tab/section: **"Send PDF + Excel by Email"** — recipient chips, range selector, Generate & Send button → `publishExecutiveReportBinary`.
- New tab: **"Schedules"** — list/create/edit/delete `report_schedules`, with toggle + last-run badge.
- Keep existing HTML+Teams publisher untouched.

### 6. Validation
- `tsgo` typecheck.
- Invoke server fn end-to-end against a test Outlook/SharePoint connection (skipped if not configured — surfaces structured config error).
- Manual UI smoke via Playwright on `/executive-reports`.

### Non-goals
- No DOCX/PowerPoint output (PDF+Excel only).
- No per-user templating editor (this wave); template is the existing branded layout extended.
- No marketing email — Outlook only, internal recipients.

Proceed?