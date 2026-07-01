// Executive Demonstration Scenario — one complete operational day (06:00–18:00 Riyadh).
// Builds a single coherent story across sites/employees/inspections/risks/incidents/
// work-orders/notifications/meetings/daily-ops/KPIs so ARIA can trace cause → effect.
//
// Idempotent: every row tagged metadata.scenario_tag; re-running purges & rebuilds.
// Requires base simulation seed (departments/employees/sites) — auto-runs if missing.

import type { SupabaseClient } from "@supabase/supabase-js";
import { runSimulationSeed } from "./sim.seeder.server";

// biome-ignore lint/suspicious/noExplicitAny: admin client
type Admin = SupabaseClient<any, any, any>;

const RIYADH_OFFSET_H = 3; // UTC+3, no DST
// Riyadh local YYYY-MM-DD HH:MM → UTC ISO string
function riyadhAt(dayISO: string, hh: number, mm = 0): string {
  const [y, m, d] = dayISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - RIYADH_OFFSET_H, mm, 0)).toISOString();
}
function todayRiyadhISO(): string {
  const now = new Date();
  const shifted = new Date(now.getTime() + RIYADH_OFFSET_H * 3600_000);
  return shifted.toISOString().slice(0, 10);
}

export type ScenarioResult = {
  org_id: string;
  scenario_tag: string;
  day: string;
  site: { id: string; code: string };
  counts: Record<string, number>;
  narrative: Array<{ time: string; event: string; ref?: string }>;
  duration_ms: number;
};

export async function runExecutiveScenario(
  admin: Admin,
  opts: { orgId: string; userId?: string; day?: string },
): Promise<ScenarioResult> {
  const started = Date.now();
  const org_id = opts.orgId;
  const day = opts.day ?? todayRiyadhISO();
  const scenario_tag = `EXEC-DAY-${day.replace(/-/g, "")}`;

  // ---- Ensure base data ------------------------------------------------------
  const { count: empCount } = await admin
    .from("sim_employees").select("id", { count: "exact", head: true }).eq("org_id", org_id);
  if ((empCount ?? 0) < 20) {
    await runSimulationSeed(admin, { orgId: org_id, seed: 20260701 });
  }

  // ---- Purge previous run of the same scenario ------------------------------
  const purge = async (table: string) => {
    await admin.from(table).delete().eq("org_id", org_id).contains("metadata", { scenario_tag });
  };
  for (const t of [
    "sim_notifications", "sim_daily_ops", "sim_meetings", "sim_corrective_actions",
    "sim_risks", "sim_near_misses", "sim_inspections",
  ]) await purge(t);
  await admin.from("sec_incidents").delete().eq("org_id", org_id).contains("corrective_actions", []).contains("attachments", []).eq("owner", scenario_tag);
  await admin.from("sec_work_orders").delete().eq("org_id", org_id).eq("assigned_to", scenario_tag);
  await admin.from("sec_patrols").delete().eq("org_id", org_id).eq("team", scenario_tag);
  await admin.from("aria_reports").delete().eq("org_id", org_id).contains("payload", { scenario_tag });

  // ---- Pick the stage: Jeddah Industrial Site, dept, employees --------------
  const { data: siteRow } = await admin.from("sec_sites").select("id, code, name_en")
    .eq("org_id", org_id).eq("code", "JED-P1").maybeSingle();
  if (!siteRow) throw new Error("Base site JED-P1 missing — run base simulation first.");
  const site = { id: siteRow.id as string, code: siteRow.code as string, name: siteRow.name_en as string };

  const { data: hseDept } = await admin.from("sim_departments").select("id, head_employee_id, name_en")
    .eq("org_id", org_id).eq("code", "HSE").maybeSingle();
  const { data: opsDept } = await admin.from("sim_departments").select("id, head_employee_id, name_en")
    .eq("org_id", org_id).eq("code", "OPS").maybeSingle();

  const { data: siteEmps } = await admin.from("sim_employees")
    .select("id, full_name_en, full_name_ar, role").eq("org_id", org_id).eq("site_id", site.id).limit(15);
  const emps = (siteEmps ?? []) as Array<{ id: string; full_name_en: string; full_name_ar: string; role: string }>;
  if (emps.length < 4) throw new Error("Not enough employees at JED-P1 — reseed base data.");

  const patrolOfficer = emps[0];
  const inspector = emps[1];
  const shiftSupervisor = emps[2];
  const hseManager = hseDept?.head_employee_id
    ? { id: hseDept.head_employee_id as string, full_name_en: "HSE Manager", full_name_ar: "مدير الصحة والسلامة", role: "manager" }
    : emps[3];
  const opsDirector = opsDept?.head_employee_id
    ? { id: opsDept.head_employee_id as string, full_name_en: "Operations Director", full_name_ar: "مدير العمليات", role: "director" }
    : emps[4] ?? emps[3];

  const narrative: ScenarioResult["narrative"] = [];
  const meta = (extra: Record<string, unknown> = {}) => ({ scenario_tag, day, site: site.code, ...extra });

  // ---- 06:15 — Morning patrol at Gate 2 detects hot-work violation ----------
  const patrolRef = `PTL-${scenario_tag}-01`;
  await admin.from("sec_patrols").insert({
    org_id, ref: patrolRef, site_id: site.id, team: scenario_tag, route: "Perimeter › Gate 2 › Tank Farm A",
    status: "completed", checkpoints_total: 12, checkpoints_done: 12,
    started_at: riyadhAt(day, 6, 0), ended_at: riyadhAt(day, 6, 45),
  });
  narrative.push({ time: "06:15", event: "Patrol Alpha discovers unpermitted hot-work near Tank Farm A", ref: patrolRef });

  // ---- 06:30 — Near-miss report ---------------------------------------------
  const nmRef = `NM-${scenario_tag}-01`;
  const { data: nm } = await admin.from("sim_near_misses").insert({
    org_id, ref: nmRef, title: "Hot-work without valid PTW near flammable storage",
    site_id: site.id, reported_by_employee: patrolOfficer.id,
    severity_potential: "high", root_cause: "procedure_gap",
    status: "under_review", priority: "high", reported_at: riyadhAt(day, 6, 30),
    metadata: meta({ title_ar: "أعمال ساخنة بدون تصريح قرب مخزون قابل للاشتعال" }),
  }).select("id").single();
  narrative.push({ time: "06:30", event: "Near-miss NM filed by patrol officer", ref: nmRef });

  // ---- 06:45 — Inspection created & completed same day ----------------------
  const inspRef = `INS-${scenario_tag}-01`;
  const { data: insp } = await admin.from("sim_inspections").insert({
    org_id, ref: inspRef, kind: "hot_work_audit", site_id: site.id, inspector_employee: inspector.id,
    scheduled_at: riyadhAt(day, 6, 45), completed_at: riyadhAt(day, 7, 40),
    score: 62, findings_count: 4, status: "completed", priority: "high",
    metadata: meta({ triggered_by_near_miss: nmRef,
      findings: ["Missing PTW", "No fire watch", "Extinguisher expired", "Gas test not recorded"] }),
  }).select("id").single();
  narrative.push({ time: "07:40", event: "Hot-work audit inspection completed — score 62/100, 4 findings", ref: inspRef });

  // ---- 07:45 — Risk elevated ------------------------------------------------
  const riskRef = `RSK-${scenario_tag}-01`;
  const { data: risk } = await admin.from("sim_risks").insert({
    org_id, ref: riskRef, title: "Elevated fire risk — Tank Farm A hot-work non-compliance",
    category: "fire_safety", likelihood: 4, impact: 5, owner_employee: hseManager.id,
    inspection_id: insp?.id ?? null,
    mitigation: "Suspend hot-work permits; mandatory refresher; add on-site fire watch until re-audit.",
    status: "mitigating", priority: "critical",
    metadata: meta({ title_ar: "خطر حريق مرتفع — مخالفة الأعمال الساخنة في حوض التخزين أ" }),
  }).select("id").single();
  narrative.push({ time: "07:45", event: "Risk RSK elevated (likelihood 4 × impact 5 = 20)", ref: riskRef });

  // ---- 07:50 — Notifications to HSE Manager & Ops Director ------------------
  await admin.from("sim_notifications").insert([
    {
      org_id, target_employee: hseManager.id, topic: "risk.elevated", severity: "critical",
      title: `Critical risk elevated at ${site.code}`,
      body: `Risk ${riskRef} score=20 — from inspection ${inspRef}. Immediate mitigation required.`,
      priority: "critical", status: "unread", metadata: meta({ risk_ref: riskRef }),
    },
    {
      org_id, target_employee: opsDirector.id, topic: "risk.elevated", severity: "warning",
      title: `HSE escalation at ${site.code}`,
      body: `Hot-work non-compliance detected. HSE mitigating; standby for suspension of hot-work permits.`,
      priority: "high", status: "unread", metadata: meta({ risk_ref: riskRef }),
    },
  ]);
  narrative.push({ time: "07:50", event: "Notifications dispatched to HSE Manager & Ops Director" });

  // ---- 08:00 — Corrective action assigned -----------------------------------
  const carRef = `CAR-${scenario_tag}-01`;
  await admin.from("sim_corrective_actions").insert({
    org_id, ref: carRef, source_type: "risk", source_id: risk!.id,
    action: "1) Suspend all hot-work at Tank Farm A. 2) Retrain 100% of hot-work permit issuers within 72h. 3) Replace expired extinguishers site-wide. 4) Re-audit within 14 days.",
    owner_employee: hseManager.id, due_at: riyadhAt(day, 18, 0),
    status: "in_progress", priority: "critical", metadata: meta({ risk_ref: riskRef, inspection_ref: inspRef }),
  });
  narrative.push({ time: "08:00", event: "Corrective Action CAR assigned to HSE Manager (due EOD)", ref: carRef });

  // ---- 08:10 — Small fire incident (spark ignites cleaning cloth) -----------
  const incRef = `INC-${scenario_tag}-01`;
  const { data: inc } = await admin.from("sec_incidents").insert({
    org_id, ref: incRef, site_id: site.id, category: "Fire Alarm",
    title_ar: "حريق محدود في حوض التخزين أ — شرارة من أعمال ساخنة",
    title_en: "Contained fire — Tank Farm A hot-work spark",
    severity: "high", status: "contained", priority: "critical",
    owner: scenario_tag, reported_at: riyadhAt(day, 8, 10),
    resolved_at: riyadhAt(day, 8, 42), response_minutes: 6,
    root_cause: "Hot-work performed without permit; no fire watch — see inspection " + inspRef,
    ai_summary: "Low-consequence fire event traced directly to the morning near-miss. Rapid response (6 min) prevented escalation. Confirms elevated risk profile flagged at 07:45.",
    ai_risk_score: 78, escalated: true, aria_auto_analyzed: true, attachments_count: 3,
    executive_review: "Confirms preventive value of morning patrol. Enforce hot-work suspension.",
  }).select("id").single();
  narrative.push({ time: "08:10", event: "Fire incident INC — CONTAINED in 6 min (predicted at 07:45)", ref: incRef });

  // ---- 08:15 — Work order to restore extinguisher stock ---------------------
  const woRef = `WO-${scenario_tag}-01`;
  await admin.from("sec_work_orders").insert({
    org_id, ref: woRef, site_id: site.id, asset_kind: "fire_extinguisher",
    kind: "corrective", title_ar: "استبدال طفايات منتهية في حوض التخزين أ",
    title_en: "Replace expired extinguishers — Tank Farm A",
    priority: "critical", status: "in-progress", assigned_to: scenario_tag,
    opened_at: riyadhAt(day, 8, 15), due_at: riyadhAt(day, 14, 0),
    source_incident_id: inc?.id ?? null,
    notes: `Auto-created from incident ${incRef} / risk ${riskRef} / inspection ${inspRef}.`,
  });
  narrative.push({ time: "08:15", event: "Work Order WO opened, linked to incident + risk chain", ref: woRef });

  // ---- 09:30 — Second corrective action for procedure gap -------------------
  const carRef2 = `CAR-${scenario_tag}-02`;
  await admin.from("sim_corrective_actions").insert({
    org_id, ref: carRef2, source_type: "incident", source_id: inc!.id,
    action: "Update SOP-012 (Hot-Work Permit): mandatory dual-signoff + gas-test evidence photo before ignition.",
    owner_employee: opsDirector.id, due_at: riyadhAt(day, 18, 0),
    status: "open", priority: "high", metadata: meta({ incident_ref: incRef }),
  });
  narrative.push({ time: "09:30", event: "Second CAR: SOP-012 update assigned to Ops Director", ref: carRef2 });

  // ---- 14:00 — Executive review meeting -------------------------------------
  const mtgRef = `MTG-${scenario_tag}-01`;
  await admin.from("sim_meetings").insert({
    org_id, ref: mtgRef, title: `Executive Incident Review — ${site.code} Hot-Work Chain`,
    dept_id: hseDept?.id ?? null, organizer_employee: opsDirector.id,
    scheduled_at: riyadhAt(day, 14, 0), duration_min: 60, location: "HQ Boardroom + Teams",
    kind: "executive_review", status: "completed", priority: "critical",
    attendees: [opsDirector.id, hseManager.id, inspector.id, shiftSupervisor.id],
    metadata: meta({
      agenda: ["Timeline review (06:15 → 08:42)", "Root cause validation", "CAR progress", "Policy update SOP-012"],
      decisions: [
        "Hot-work suspended site-wide for 48h",
        "SOP-012 revision to be published by tomorrow 12:00",
        "Site-wide extinguisher audit inside 7 days",
      ],
      linked: { incRef, riskRef, inspRef, carRef, carRef2 },
    }),
  });
  narrative.push({ time: "14:00", event: "Executive Review Meeting held — 3 decisions recorded", ref: mtgRef });

  // ---- 18:00 — Daily Ops closed with real KPI counts ------------------------
  await admin.from("sim_daily_ops").insert({
    org_id, day, site_id: site.id, shift: "day",
    patrols_planned: 12, patrols_done: 12,
    incidents_open: 0, permits_active: 0, headcount: emps.length + 8,
    kpi_json: {
      compliance_pct: 74,           // dropped from baseline due to hot-work findings
      response_avg_min: 6,          // strong response time
      near_miss_reports: 1,
      incidents_contained: 1,
      corrective_actions_open: 2,
      risk_score_peak: 20,
    },
    status: "closed",
    metadata: meta({ headline: "Prevented fire escalation; SOP-012 revision triggered" }),
  });
  narrative.push({ time: "18:00", event: "Day shift closed — compliance 74% (↓), response 6 min (↑), 1 contained incident" });

  // ---- ARIA executive briefing (report) -------------------------------------
  if (opts.userId) {
    await admin.from("aria_reports").insert({
      user_id: opts.userId, org_id, kind: "executive_briefing",
      title: `Executive Briefing — ${site.code} Hot-Work Chain (${day})`,
      period_start: riyadhAt(day, 6, 0), period_end: riyadhAt(day, 18, 0),
      confidence: 0.92,
      payload: {
        scenario_tag, site: site.code,
        chain: [nmRef, inspRef, riskRef, carRef, incRef, woRef, carRef2, mtgRef],
        kpis: { compliance_pct: 74, response_avg_min: 6, risk_score_peak: 20 },
      },
      markdown: [
        `# Executive Briefing — ${site.name} (${day})`,
        ``,
        `## What happened`,
        `At 06:15 a routine patrol at Tank Farm A detected hot-work being performed **without a valid Permit-to-Work** and **without a fire watch**. A near-miss was filed at 06:30 (**${nmRef}**), followed by a full hot-work audit inspection at 06:45 (**${inspRef}**, score 62/100, 4 findings).`,
        ``,
        `## Why`,
        `Root cause: procedure gap in SOP-012 (single-signoff on hot-work permits) combined with expired extinguisher stock. The 07:45 risk elevation (**${riskRef}**, score 20) predicted the 08:10 fire event that followed — which was **contained in 6 minutes** by the standby response team.`,
        ``,
        `## Impact`,
        `- **Compliance:** 74% at day close (baseline ~92%).`,
        `- **Financial exposure avoided:** high — potential Tank Farm A loss ≥ SAR 40M.`,
        `- **Regulatory:** near-miss and incident both logged; no reportable injury.`,
        ``,
        `## Who is responsible`,
        `- HSE Manager: owns risk & primary corrective action (**${carRef}**).`,
        `- Ops Director: owns SOP-012 revision (**${carRef2}**).`,
        `- Shift Supervisor: enforcing hot-work suspension.`,
        ``,
        `## Recommendation`,
        `1. Ratify site-wide hot-work suspension for 48h (already in effect).`,
        `2. Publish revised SOP-012 with **dual-signoff + gas-test photo evidence** by tomorrow 12:00.`,
        `3. Full extinguisher audit across all sites within 7 days.`,
        `4. Re-audit Tank Farm A within 14 days.`,
        ``,
        `## What if we do nothing`,
        `Repeat-event probability rises above 65% within 30 days based on the risk profile — with escalation potential to Tank Farm loss and Category-2 regulatory action.`,
        ``,
        `## Evidence`,
        `Patrol ${patrolRef} · Near-miss ${nmRef} · Inspection ${inspRef} · Risk ${riskRef} · Incident ${incRef} · Work Order ${woRef} · Corrective Actions ${carRef}, ${carRef2} · Meeting ${mtgRef}.`,
        ``,
        `_Confidence: 0.92 — grounded in system data; no fabrication._`,
      ].join("\n"),
    });
    narrative.push({ time: "18:15", event: "ARIA executive briefing generated (confidence 0.92)" });
  }

  return {
    org_id, scenario_tag, day, site,
    duration_ms: Date.now() - started,
    counts: {
      patrols: 1, near_misses: 1, inspections: 1, risks: 1,
      corrective_actions: 2, incidents: 1, work_orders: 1,
      notifications: 2, meetings: 1, daily_ops: 1,
      aria_reports: opts.userId ? 1 : 0,
    },
    narrative,
  };
}
