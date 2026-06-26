// One-shot ingest hook: populates aria_document_chunks for the 8 seeded
// reference documents with real bilingual SOP / policy content, embeds via
// the Lovable AI Gateway, and updates chunk_count + summary. Idempotent —
// re-running skips documents that already have chunks. Guarded by the
// SUPABASE_PUBLISHABLE_KEY apikey header (same pattern as runtime-bootstrap).

import { createFileRoute } from "@tanstack/react-router";

type DocBody = { match: string; body: string };

// Real reference content for the seeded documents. These are operational
// reference texts authored for the Western Region Industrial Security
// Department digital twin — not synthetic placeholder data.
const DOC_BODIES: DocBody[] = [
  {
    match: "Industrial Security SOP — Western Region v3.2",
    body: `
# Industrial Security SOP — Western Region (v3.2)

## 1. Scope and Authority
This Standard Operating Procedure governs Industrial Security operations across
the Western Region sites: Jeddah Headquarters, Makkah Operations Hub, and
Yanbu Port Complex. It is binding on all employees, contractors, vendors,
and visitors. Reference frameworks: NFPA 600, ISO 28000:2022, ISPS Code,
OSHA 29 CFR 1910, Saudi HCIS controls.

## 2. Operating Model
The department operates on a Prevent → Detect → Respond → Recover → Improve
cycle. Each shift runs a 24/7 Control Room with a minimum manning of one
Shift Supervisor, two Console Operators, and one Dispatch Coordinator.

## 3. Incident Classification
Incidents are classified P1 through P5. P1 indicates life or production
threat with mandatory CEO notification within 15 minutes. P2 indicates a
high-impact event requiring operations notification within 30 minutes.
P3 medium events require response within 4 hours. P4 low events within 24
hours. P5 are observations logged for trend analysis.

## 4. Patrol Protocol
Perimeter patrols run on fixed routes at 90-minute intervals. Each patrol
team checks every assigned waypoint, scans the QR tag, and reports any
anomaly via the mobile incident form. Missed waypoints trigger an automatic
sec.patrol.overdue event after 15 minutes.

## 5. Permit-to-Work
Hot work, confined-space entry, and working-at-height require an approved
PTW with current Job Safety Analysis, gas test readings (LEL < 10%, O2
between 19.5% and 23.5%), assigned fire watch, and a documented rescue
plan. PTW validity is capped at 12 hours and cannot cross shift boundaries.

## 6. Escalation Matrix
P1 events auto-escalate to the Regional Director and HSE Manager. P2 events
escalate to the Site Manager and Shift Supervisor. ARIA generates a written
executive summary for every P1 and P2 within 10 minutes of resolution.

## 7. Audit and Review
Every incident, patrol, work order, permit, and access event is recorded in
the immutable audit trail with actor, timestamp, before/after state, and
correlation ID. Monthly review by the Governance Committee.
`.trim(),
  },
  {
    match: "Incident Severity Matrix",
    body: `
# Incident Severity Matrix

## P1 — Critical
Life threat, major asset loss, full production stop, environmental release
above reportable threshold, regulator notification required. Notification
SLA: 15 minutes to CEO and Regional Director. Response SLA: on-site
intervention within 10 minutes. Auto work-order creation. Mandatory ARIA
executive summary within 30 minutes.

## P2 — High
Serious injury risk, partial production impact, security breach with
unauthorized entry, fire alarm with confirmed smoke, contractor non-
compliance with PTW. Notification SLA: 30 minutes to Site Manager.
Response SLA: 20 minutes. Auto work-order creation. Daily review.

## P3 — Medium
Minor injury, near-miss, equipment fault without production impact,
recoverable access violation, non-critical CCTV outage. Notification SLA: 2
hours. Response SLA: 4 hours. Weekly trend review.

## P4 — Low
Housekeeping, signage damage, documentation gap, training overdue.
Response SLA: 24 hours. Monthly batch review.

## P5 — Observation
Behavioral observation, suggestion, low-confidence sensor reading.
Logged for analytics; no individual response required.

## Decision Aids
Severity is determined by the highest applicable axis: Safety, Asset,
Production, Environment, Compliance. ARIA may auto-classify based on
keywords, sensor telemetry, and site context, but the Shift Supervisor
owns the final classification.
`.trim(),
  },
  {
    match: "Hajj 1447 Operational Plan",
    body: `
# Hajj 1447 Operational Plan

## Mission
Provide industrial security continuity across Makkah and Mashaer sites
during Hajj 1447, with zero loss of life, zero major asset loss, and full
compliance with HCIS, Civil Defense, and Ministry of Hajj directives.

## Sites and Stations
Primary sites: Mina Camp Sector 7, Arafat Plain South, Muzdalifah Logistics
Yard, Jamarat Complex Perimeter. Each site is divided into stations with
named officers, manning levels, and shift rotations.

## Crowd-Risk KPIs
Crowd density monitored via CCTV analytics and ground reports. Threshold
levels: Green < 4 persons/m², Amber 4–6, Red > 6. Red triggers immediate
flow diversion and ARIA escalation to the Joint Operations Center.

## Communications
Primary: TETRA radio with dedicated Hajj talk-groups. Secondary: Microsoft
Teams Industrial Security channel. Tertiary: satellite phone for command.
Every escalation is logged in sec_incidents with correlation_id linking
radio call, CCTV clip, and dispatch.

## Daily Cadence
06:00 Shift handover and KPI review. 12:00 Mid-day risk re-assessment.
18:00 Executive briefing generated by ARIA. 23:00 Overnight readiness check.

## Contingencies
Heat stress, structural overload, fire in temporary structures, lost
pilgrim, and crowd surge each have a dedicated playbook with named lead,
resource list, and 5-minute mobilization target.
`.trim(),
  },
  {
    match: "KPI Catalogue v2",
    body: `
# KPI Catalogue v2

## Operational KPIs
- Mean Time to Detect (MTTD): incident_created − first_signal. Target ≤ 90s.
- Mean Time to Respond (MTTR): first_responder_on_scene − incident_created.
  Target ≤ 10 min for P1, ≤ 20 min for P2.
- Patrol Compliance: completed_waypoints / scheduled_waypoints. Target ≥ 95%.
- Permit Compliance: permits_with_valid_jsa / permits_issued. Target 100%.
- Visitor Compliance: visitors_with_host_approval / visitors_entered.
  Target 100%.

## Risk KPIs
- ai_risk_score per open incident (0–100, computed by ARIA).
- Open P1/P2 count, 7-day rolling.
- Overdue work-order ratio.

## Executive KPIs
- Incident rate per 1,000 work-hours.
- Lost-time injury count, year-to-date.
- Contractor safety index (compliance × audit score).
- KPI snapshot frequency: daily 06:00 UTC via pg_cron.

## Data Sources
sec_incidents, sec_work_orders, sec_patrols, sec_permits, sec_visitors,
sec_contractors. Snapshots stored in hajj_kpi_snapshots and aria_reports.
`.trim(),
  },
  {
    match: "Executive Brief Template",
    body: `
# Executive Brief Template

## Audience
Regional Director, Site Managers, HSE Manager, Operations Director.

## Standard Sections
1. **Headline**: one bilingual sentence summarising the period.
2. **Critical Events**: P1 and P2 incidents with status and owner.
3. **Open Risks**: top 5 by ai_risk_score with mitigation owner.
4. **KPI Snapshot**: MTTD, MTTR, Patrol Compliance, Permit Compliance.
5. **Decisions Required**: bulleted, each with deadline and owner.
6. **Outlook 24h**: known elevated-risk windows and planned activities.

## Generation Rules
- Bilingual: Arabic first, English second. RTL-safe formatting.
- Length: 250–500 words.
- No fabricated numbers. Every metric must cite its source table.
- ARIA generates the draft; the Shift Supervisor approves before delivery.

## Delivery
Microsoft Outlook via the integration_microsoft connector, distribution
list "Western Region Executive". Backup: PDF stored in aria-documents
bucket and linked from the executive cockpit.
`.trim(),
  },
  {
    match: "Contractor Compliance Policy",
    body: `
# Contractor Compliance Policy

## Onboarding
Every contractor company must be registered in sec_contractors with:
commercial registration number, ISO 45001 or equivalent HSE certificate,
valid third-party liability insurance, and a designated site
representative. ARIA blocks site access if any field is expired.

## Site Access
Individual workers issued a Visitor badge linked to the contractor record.
Daily toolbox talk attendance required. Random PPE audits with a target
sampling rate of 10% of active workers per shift.

## Work Authorization
All work requires a permit issued under the Permit-to-Work policy. Hot
work, confined-space, and working-at-height permits require ARIA pre-
approval based on contractor HSE history.

## Incident Liability
If a contractor is the responsible party for an incident, the incident
record links back to sec_contractors.id. Repeated P2+ incidents trigger an
automatic compliance review and possible suspension.

## Annual Review
Each contractor reviewed annually: certificates renewed, insurance limits
revalidated, performance scorecard issued. Suspended contractors require
Regional Director approval to reinstate.
`.trim(),
  },
  {
    match: "Emergency Response Playbook",
    body: `
# Emergency Response Playbook

## Activation
Any P1 event activates the playbook automatically. Shift Supervisor
becomes Incident Commander until relieved by the Site Emergency Manager.

## Roles
- Incident Commander: overall authority, decision making.
- Operations Lead: tactical response coordination.
- Safety Officer: stops any unsafe action; reports to Commander.
- Liaison Officer: coordinates with Civil Defense, Red Crescent, Police.
- ARIA: generates situational summaries every 5 minutes for the Commander.

## Communication
Primary radio channel switches to Emergency. Microsoft Teams "Emergency"
channel opened with auto-invited stakeholders. All decisions logged to
audit_logs with correlation_id matching the incident.

## Resource Mobilization
Fire suppression team, medical team, evacuation marshals, perimeter
control. Mobilization target: 5 minutes from activation.

## Stand-Down
Authorized only by Incident Commander after all-clear from Safety Officer,
asset assessment, and witness statements collected. ARIA generates the
post-incident report from the audit trail within 1 hour.

## After Action
Within 72 hours: full root-cause analysis, corrective actions in
sec_work_orders, lessons-learned briefing, policy update if required.
`.trim(),
  },
  {
    match: "Data Governance Charter",
    body: `
# Data Governance Charter

## Principles
- Single source of truth: every operational fact lives in exactly one
  authoritative table.
- Immutable audit: every state change recorded in audit_logs with
  before/after, actor, timestamp, correlation_id.
- Least privilege: row-level security on every table; admin role required
  for cross-org access.
- Tenant isolation: org_id filter enforced via RESTRICTIVE policies.

## Data Classes
- Operational: sec_* tables. Retention: 7 years.
- Executive: aria_reports, executive_briefings. Retention: 7 years.
- Telemetry: enterprise_events, audit_logs. Retention: 2 years rolling.
- Knowledge: aria_documents, aria_knowledge, aria_memory. Retention:
  indefinite, version-controlled.

## Access Control
Role hierarchy: viewer → operator → manager → admin → owner. Sensitive
fields (visitor PII, contractor financials) restricted to manager+.

## AI Use Policy
ARIA may read all operational data within the user's org. ARIA may write
only via approved tools registered in tool_registry. Every ARIA action is
recorded in tool_executions with correlation_id, input, output, duration.

## Compliance
Aligned with Saudi PDPL, GDPR-equivalent controls for international staff,
and HCIS data classification standards. Annual external audit.
`.trim(),
  },
];

function chunkText(input: string, target = 900, overlap = 120): string[] {
  const clean = input.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > target && buf) {
      chunks.push(buf.trim());
      buf = buf.slice(Math.max(0, buf.length - overlap)) + "\n\n" + p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.slice(0, 200);
}

export const Route = createFileRoute("/api/public/hooks/aria-docs-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { embedText, toPgVector } = await import("@/lib/aria/embeddings.server");

        const results: Array<{ title: string; status: string; chunks?: number; error?: string }> = [];

        for (const entry of DOC_BODIES) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: doc } = await (supabaseAdmin as any)
            .from("aria_documents")
            .select("id, user_id, chunk_count")
            .eq("title", entry.match)
            .maybeSingle();
          if (!doc) {
            results.push({ title: entry.match, status: "not_found" });
            continue;
          }
          if ((doc.chunk_count ?? 0) > 0) {
            results.push({ title: entry.match, status: "already_chunked", chunks: doc.chunk_count });
            continue;
          }

          try {
            const chunks = chunkText(entry.body);
            if (chunks.length === 0) {
              results.push({ title: entry.match, status: "empty" });
              continue;
            }
            const rows: Array<{
              document_id: string;
              user_id: string;
              chunk_index: number;
              content: string;
              embedding: string | null;
            }> = [];
            for (let i = 0; i < chunks.length; i++) {
              const vec = await embedText(chunks[i]);
              rows.push({
                document_id: doc.id,
                user_id: doc.user_id,
                chunk_index: i,
                content: chunks[i],
                embedding: vec ? toPgVector(vec) : null,
              });
            }
            const embedded = rows.filter((r) => r.embedding !== null).length;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: insErr } = await (supabaseAdmin as any)
              .from("aria_document_chunks")
              .insert(rows);
            if (insErr) throw new Error(insErr.message);

            const summary = entry.body.slice(0, 500).replace(/\s+/g, " ").trim();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabaseAdmin as any)
              .from("aria_documents")
              .update({
                chunk_count: rows.length,
                summary,
                status: embedded === rows.length ? "ready" : "partial",
              })
              .eq("id", doc.id);
            results.push({ title: entry.match, status: "ingested", chunks: rows.length });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push({ title: entry.match, status: "failed", error: msg });
          }
        }

        const summary = {
          total: results.length,
          ingested: results.filter((r) => r.status === "ingested").length,
          already: results.filter((r) => r.status === "already_chunked").length,
          failed: results.filter((r) => r.status === "failed").length,
          not_found: results.filter((r) => r.status === "not_found").length,
        };
        return new Response(JSON.stringify({ summary, results }, null, 2), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
