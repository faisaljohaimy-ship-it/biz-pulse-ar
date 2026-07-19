/**
 * Showcase simulation builders — the platform's windows are NEVER empty.
 *
 * Doctrine (CLAUDE.md «بيانات لا تفرغ»): when a read function finds no
 * anon-visible rows (unreachable or unseeded database), it serves a rich,
 * deterministic simulation with timestamps RELATIVE TO NOW. Every dataset
 * here is presentation-grade demo content for the public showcase — the
 * global «بيئة محاكاة مرجعية» banner and per-window badges keep it honest,
 * and live database rows always take precedence the moment they exist.
 */
import type { BridgeState, MissionTimelineEntry } from "./bridge.functions";
import type { PredictedRisk } from "./predictive.functions";

const H = 3_600_000;
const M = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

/* ── Agents fleet (mirrors the digital-humans registry personas) ────────── */

const FLEET = [
  {
    id: "sim-a1",
    name: "قائد الاستجابة للحوادث",
    goal: "مراقبة البلاغات الحرجة وتوجيه فرق الاستجابة فورًا",
    status: "monitoring",
    confidence: 0.94,
    task: "مراقبة 3 بلاغات مفتوحة في المنطقة الغربية",
  },
  {
    id: "sim-a2",
    name: "محلل استخبارات المخاطر",
    goal: "استشعار الشذوذ التشغيلي والتنبؤ بالمخاطر قبل وقوعها",
    status: "analyzing",
    confidence: 0.91,
    task: "تحليل نمط إنذارات المحيط لآخر 24 ساعة",
  },
  {
    id: "sim-a3",
    name: "مدقّق الامتثال HCIS",
    goal: "مطابقة الإجراءات مع توجيهات الهيئة العليا للأمن الصناعي",
    status: "executing",
    confidence: 0.97,
    task: "تدقيق SEC-18 لمحطات التحويل — الدفعة الأسبوعية",
  },
  {
    id: "sim-a4",
    name: "ذكاء كاميرات المراقبة",
    goal: "رصد الأحداث البصرية وتصنيفها عبر شبكة CCTV",
    status: "monitoring",
    confidence: 0.89,
    task: "تتبع 142 كاميرا نشطة عبر الإدارات الأربع",
  },
  {
    id: "sim-a5",
    name: "قائد الدوريات الميدانية",
    goal: "جدولة الدوريات وتغطية النقاط الحرجة",
    status: "idle",
    confidence: 0.92,
    task: null,
  },
  {
    id: "sim-a6",
    name: "منسّق الطوارئ",
    goal: "تفعيل خطط الطوارئ والتصعيد للجهات المختصة",
    status: "waiting",
    confidence: 0.95,
    task: null,
  },
  {
    id: "sim-a7",
    name: "ذكاء الزوار والتصاريح",
    goal: "التحقق من الزوار والمقاولين وتصاريح العمل لحظيًا",
    status: "executing",
    confidence: 0.9,
    task: "مطابقة 34 زائرًا داخل المواقع مع سجلات التصاريح",
  },
  {
    id: "sim-a8",
    name: "المراسل التنفيذي",
    goal: "توليد الملخصات التنفيذية والتقارير الدورية",
    status: "thinking",
    confidence: 0.93,
    task: "إعداد ملخص نهاية المناوبة للمنطقة الوسطى",
  },
] as const;

export function buildBridgeSimulation(now: number): BridgeState {
  const agents: BridgeState["agents"] = FLEET.map((a, i) => ({
    id: a.id,
    name: a.name,
    goal: a.goal,
    enabled: true,
    status: a.status as BridgeState["agents"][number]["status"],
    confidence: a.confidence,
    current_task: a.task,
    last_run_at: iso(now - (i + 1) * 7 * M),
    last_run_status: i === 4 ? "queued" : "succeeded",
  }));
  return {
    health: {
      score: 92,
      open_incidents: 3,
      critical_incidents: 1,
      active_patrols: 6,
      visitors_onsite: 34,
      active_permits: 4,
      open_work_orders: 12,
      compliance_score: 97,
      ai_confidence: 0.93,
      agents_online: 7,
      agents_total: 8,
    },
    agents,
    generated_at: iso(now),
  };
}

/* ── Mission timeline (سجل التشغيل) ─────────────────────────────────────── */

type TL = Omit<MissionTimelineEntry, "id" | "ts">;
const TIMELINE: Array<[minAgo: number, TL]> = [
  [
    2,
    {
      tone: "success",
      agent_name_ar: "مدقّق الامتثال HCIS",
      agent_name_en: "Compliance Auditor",
      action_ar: "اكتمال تدقيق",
      action_en: "Audit completed",
      text_ar: "اكتمل تدقيق SEC-18 لمحطات التحويل في المنطقة الغربية — 97٪ مطابقة",
      text_en: "SEC-18 substation audit completed — 97% conformity",
      result_ar: "لا ملاحظات حرجة",
      result_en: "No critical findings",
      topic: "hcis.audit",
      status: "succeeded",
      severity: "info",
      correlation_id: "sim-c1",
      duration_ms: 42_000,
    },
  ],
  [
    9,
    {
      tone: "critical",
      agent_name_ar: "قائد الاستجابة للحوادث",
      agent_name_en: "Incident Commander",
      action_ar: "تصعيد بلاغ",
      action_en: "Incident escalated",
      text_ar: "تصعيد بلاغ تسرّب غاز محتمل في محطة عرفات 2 إلى فريق الطوارئ",
      text_en: "Possible gas leak at Arafat-2 escalated to emergency team",
      result_ar: "فريق الاستجابة في الطريق",
      result_en: "Response team dispatched",
      topic: "incident.escalation",
      status: "in_progress",
      severity: "critical",
      correlation_id: "sim-c2",
      duration_ms: null,
    },
  ],
  [
    16,
    {
      tone: "info",
      agent_name_ar: "ذكاء كاميرات المراقبة",
      agent_name_en: "CCTV Intelligence",
      action_ar: "رصد حركة",
      action_en: "Motion classified",
      text_ar: "تصنيف حركة غير معتادة عند البوابة الشرقية — مقاول بتصريح ساري",
      text_en: "Unusual motion at east gate — contractor with valid permit",
      result_ar: "لا إجراء مطلوب",
      result_en: "No action needed",
      topic: "cctv.event",
      status: "succeeded",
      severity: "info",
      correlation_id: null,
      duration_ms: 3_100,
    },
  ],
  [
    24,
    {
      tone: "success",
      agent_name_ar: "ذكاء الزوار والتصاريح",
      agent_name_en: "Visitor Intelligence",
      action_ar: "تحقق تصريح",
      action_en: "Permit verified",
      text_ar: "التحقق من تصريح أعمال ساخنة PTW-SIM-001 عبر رمز QR عند خزان الوقود 3",
      text_en: "Hot-work permit PTW-SIM-001 verified via QR at fuel tank 3",
      result_ar: "التصريح ساري و4 عمال مسجلون",
      result_en: "Valid — 4 workers registered",
      topic: "ptw.verify",
      status: "succeeded",
      severity: "info",
      correlation_id: "sim-c3",
      duration_ms: 1_800,
    },
  ],
  [
    37,
    {
      tone: "warn",
      agent_name_ar: "محلل استخبارات المخاطر",
      agent_name_en: "Risk Intelligence",
      action_ar: "إنذار نمط",
      action_en: "Pattern alert",
      text_ar: "ارتفاع إنذارات كشف التسلل المحيطي 22٪ خلال المناوبة — يُوصى بدورية إضافية",
      text_en: "PIDS alerts up 22% this shift — extra patrol recommended",
      result_ar: "أُرسلت توصية لقائد الدوريات",
      result_en: "Recommendation sent to patrol commander",
      topic: "risk.pattern",
      status: "succeeded",
      severity: "warning",
      correlation_id: "sim-c4",
      duration_ms: 12_400,
    },
  ],
  [
    51,
    {
      tone: "success",
      agent_name_ar: "قائد الدوريات الميدانية",
      agent_name_en: "Patrol Commander",
      action_ar: "إغلاق جولة",
      action_en: "Patrol closed",
      text_ar: "اكتملت الجولة التفتيشية للمحيط الشمالي — 14 نقطة تحقق بلا ملاحظات",
      text_en: "North perimeter patrol completed — 14 checkpoints clear",
      result_ar: "الجولة القادمة 22:00",
      result_en: "Next patrol 22:00",
      topic: "patrol.run",
      status: "succeeded",
      severity: "info",
      correlation_id: null,
      duration_ms: 3_540_000,
    },
  ],
  [
    68,
    {
      tone: "info",
      agent_name_ar: "المراسل التنفيذي",
      agent_name_en: "Executive Reporter",
      action_ar: "ملخص دوري",
      action_en: "Digest published",
      text_ar: "نُشر ملخص منتصف المناوبة للإدارات الأربع — مؤشر الجاهزية 92٪",
      text_en: "Mid-shift digest published — readiness 92%",
      result_ar: "أُرسل للوحة التنفيذية",
      result_en: "Delivered to the executive board",
      topic: "report.digest",
      status: "succeeded",
      severity: "info",
      correlation_id: null,
      duration_ms: 8_900,
    },
  ],
  [
    83,
    {
      tone: "warn",
      agent_name_ar: "منسّق الطوارئ",
      agent_name_en: "Emergency Coordinator",
      action_ar: "تمرين جاهزية",
      action_en: "Readiness drill",
      text_ar: "تمرين إخلاء جزئي مجدول لمبنى القيادة — زمن الاستجابة 4:12 دقيقة",
      text_en: "Scheduled partial evacuation drill — response 4:12",
      result_ar: "ضمن الهدف (< 5 دقائق)",
      result_en: "Within target (<5 min)",
      topic: "emergency.drill",
      status: "succeeded",
      severity: "warning",
      correlation_id: null,
      duration_ms: 252_000,
    },
  ],
  [
    97,
    {
      tone: "success",
      agent_name_ar: "مدقّق الامتثال HCIS",
      agent_name_en: "Compliance Auditor",
      action_ar: "مزامنة لوائح",
      action_en: "Framework sync",
      text_ar: "مزامنة لائحة التوجيهات الأمنية (21 توجيهًا) مع مصفوفة الامتثال",
      text_en: "Directive series (21) synced with the compliance matrix",
      result_ar: "لا تغييرات تنظيمية جديدة",
      result_en: "No new regulatory changes",
      topic: "hcis.sync",
      status: "succeeded",
      severity: "info",
      correlation_id: "sim-c1",
      duration_ms: 15_600,
    },
  ],
  [
    112,
    {
      tone: "info",
      agent_name_ar: "ذكاء كاميرات المراقبة",
      agent_name_en: "CCTV Intelligence",
      action_ar: "فحص ذاتي",
      action_en: "Self-check",
      text_ar: "فحص ذاتي لشبكة الكاميرات: 139/142 متصلة — 3 قيد الصيانة المجدولة",
      text_en: "CCTV self-check: 139/142 online — 3 in scheduled maintenance",
      result_ar: "أمر عمل قائم",
      result_en: "Work order open",
      topic: "cctv.health",
      status: "succeeded",
      severity: "info",
      correlation_id: null,
      duration_ms: 5_200,
    },
  ],
  [
    128,
    {
      tone: "critical",
      agent_name_ar: "محلل استخبارات المخاطر",
      agent_name_en: "Risk Intelligence",
      action_ar: "توقّع خطر",
      action_en: "Risk predicted",
      text_ar: "توقّع ضغط حراري مرتفع غدًا 14:00–17:00 — يُوصى بتقييد الأعمال الساخنة",
      text_en: "Heat stress predicted 14:00–17:00 tomorrow — restrict hot work",
      result_ar: "قيد اعتماد مدير المنطقة",
      result_en: "Awaiting region manager approval",
      topic: "risk.forecast",
      status: "pending",
      severity: "critical",
      correlation_id: "sim-c4",
      duration_ms: null,
    },
  ],
  [
    141,
    {
      tone: "success",
      agent_name_ar: "ذكاء الزوار والتصاريح",
      agent_name_en: "Visitor Intelligence",
      action_ar: "إغلاق يوم",
      action_en: "Day closed",
      text_ar: "إقفال سجل زوار الأمس: 118 زائرًا، صفر تجاوزات",
      text_en: "Yesterday's visitor log closed: 118 visitors, zero violations",
      result_ar: "الأرشيف محدّث",
      result_en: "Archive updated",
      topic: "visitors.close",
      status: "succeeded",
      severity: "info",
      correlation_id: null,
      duration_ms: 22_000,
    },
  ],
];

export function buildTimelineSimulation(now: number): MissionTimelineEntry[] {
  return TIMELINE.map(([minAgo, e], i) => ({
    id: `sim-tl-${i + 1}`,
    ts: iso(now - minAgo * M),
    ...e,
  }));
}

/* ── Predicted risks ────────────────────────────────────────────────────── */

export function buildRiskSimulation(): PredictedRisk[] {
  return [
    {
      id: "sim-r1",
      title_ar: "إجهاد حراري في نوافذ الأعمال الساخنة",
      title_en: "Heat stress during hot-work windows",
      why_ar: "توقعات الحرارة غدًا تتجاوز 43° بين 14:00 و17:00 مع 3 تصاريح أعمال ساخنة مجدولة.",
      why_en:
        "Tomorrow's forecast exceeds 43°C between 14:00–17:00 with 3 hot-work permits scheduled.",
      recommendation_ar: "إزاحة التصاريح للفترة الصباحية وتفعيل دورات ترطيب إلزامية.",
      recommendation_en: "Shift permits to the morning window and enforce hydration cycles.",
      confidence: 0.87,
      horizon_hours: 24,
      severity: "high",
    },
    {
      id: "sim-r2",
      title_ar: "ازدحام بوابة المقاولين صباح الغد",
      title_en: "Contractor gate congestion tomorrow morning",
      why_ar: "تزامن 4 أوامر عمل و34 مقاولًا متوقعًا عند البوابة الشرقية بين 06:30 و08:00.",
      why_en: "4 work orders and ~34 contractors converge on the east gate 06:30–08:00.",
      recommendation_ar: "فتح مسار تفتيش إضافي وتقديم تسجيل مسبق عبر رموز QR.",
      recommendation_en: "Open an extra screening lane and enable QR pre-registration.",
      confidence: 0.78,
      horizon_hours: 18,
      severity: "medium",
    },
    {
      id: "sim-r3",
      title_ar: "نافذة صيانة كاميرات المحيط الشمالي",
      title_en: "North perimeter CCTV maintenance window",
      why_ar: "3 كاميرات قيد الصيانة تُخفض التغطية الشمالية 9٪ حتى مساء الغد.",
      why_en: "3 cameras in maintenance reduce north coverage 9% until tomorrow evening.",
      recommendation_ar: "دورية إضافية مؤقتة وتوجيه كاميرا PTZ-7 لتعويض الزاوية المكشوفة.",
      recommendation_en: "Temporary extra patrol and re-aim PTZ-7 to cover the gap.",
      confidence: 0.92,
      horizon_hours: 30,
      severity: "medium",
    },
  ];
}

/* ── Executive KPI sources (اللوحة التنفيذية) ───────────────────────────── */

import type { ExecKpiSources } from "@/lib/sec-exec-kpis.functions";
import type { SecOverview } from "@/lib/sec.functions";

const fill = <T>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i));

export function buildExecKpiSourcesSimulation(): ExecKpiSources {
  return {
    incidents: [
      ...fill(1, () => ({ severity: "critical", status: "investigating", response_minutes: 22 })),
      ...fill(2, () => ({ severity: "high", status: "open", response_minutes: 41 })),
      ...fill(9, () => ({ severity: "medium", status: "resolved", response_minutes: 38 })),
      ...fill(30, () => ({ severity: "low", status: "closed", response_minutes: 34 })),
    ],
    patrols: [
      ...fill(2, () => ({ status: "active", checkpoints_done: 9, checkpoints_total: 14 })),
      ...fill(10, () => ({ status: "completed", checkpoints_done: 14, checkpoints_total: 14 })),
    ],
    visitors: [
      ...fill(34, () => ({ status: "inside" })),
      ...fill(84, () => ({ status: "checked_out" })),
    ],
    permits: [...fill(4, () => ({ status: "active" })), ...fill(9, () => ({ status: "closed" }))],
    contractors: [
      ...fill(6, () => ({ status: "active", compliance_score: 95 })),
      ...fill(2, () => ({ status: "active", compliance_score: 88 })),
    ],
    sites: fill(4, () => ({ status: "operational" })),
    cameras: [
      ...fill(139, () => ({ status: "online", health: 97 })),
      ...fill(3, () => ({ status: "maintenance", health: 45 })),
    ],
    gates: fill(12, () => ({ status: "online", health: 98 })),
    sensors: [...fill(257, () => ({ status: "ok" })), ...fill(3, () => ({ status: "alarm" }))],
    workOrders: [
      ...fill(18, () => ({ kind: "preventive", status: "open" })),
      ...fill(9, () => ({ kind: "corrective", status: "in_progress" })),
      ...fill(15, () => ({ kind: "preventive", status: "closed" })),
    ],
    projects: [
      {
        status: "in-progress",
        progress: 62,
        budget_sar: 4_800_000,
        spent_sar: 2_700_000,
        health: "on_track",
      },
      {
        status: "in-progress",
        progress: 35,
        budget_sar: 2_100_000,
        spent_sar: 640_000,
        health: "on_track",
      },
      {
        status: "in-progress",
        progress: 88,
        budget_sar: 1_250_000,
        spent_sar: 1_090_000,
        health: "watch",
      },
      {
        status: "completed",
        progress: 100,
        budget_sar: 900_000,
        spent_sar: 870_000,
        health: "done",
      },
      {
        status: "completed",
        progress: 100,
        budget_sar: 3_400_000,
        spent_sar: 3_310_000,
        health: "done",
      },
    ],
  };
}

/* ── Sec overview (مؤشرات الأداء) ───────────────────────────────────────── */

export function buildSecOverviewSimulation(now: number): SecOverview {
  const SITES: SecOverview["sites"] = [
    {
      id: "sim-s1",
      code: "WST-01",
      name_ar: "محطة التحويل الغربية",
      name_en: "Western Substation",
      lat: 21.54,
      lng: 39.19,
      sensitivity: "critical",
      status: "operational",
      guards_count: 12,
      notes: null,
      updated_at: iso(now - 2 * H),
      circle_id: null,
    },
    {
      id: "sim-s2",
      code: "CTR-01",
      name_ar: "مبنى القيادة المركزي",
      name_en: "Central Command",
      lat: 24.71,
      lng: 46.68,
      sensitivity: "high",
      status: "operational",
      guards_count: 18,
      notes: null,
      updated_at: iso(now - 5 * H),
      circle_id: null,
    },
    {
      id: "sim-s3",
      code: "EST-02",
      name_ar: "برج الاتصالات الشرقي",
      name_en: "Eastern Comms Tower",
      lat: 26.43,
      lng: 50.1,
      sensitivity: "high",
      status: "operational",
      guards_count: 8,
      notes: null,
      updated_at: iso(now - H),
      circle_id: null,
    },
    {
      id: "sim-s4",
      code: "STH-01",
      name_ar: "خزان المياه الجنوبي",
      name_en: "Southern Reservoir",
      lat: 18.3,
      lng: 42.73,
      sensitivity: "medium",
      status: "operational",
      guards_count: 6,
      notes: null,
      updated_at: iso(now - 8 * H),
      circle_id: null,
    },
  ];
  const INC: SecOverview["incidents"] = [
    {
      id: "sim-i1",
      ref: "INC-2417",
      site_id: "sim-s1",
      category: "gas_leak",
      title_ar: "تسرّب غاز محتمل — منطقة الخزانات",
      title_en: "Possible gas leak — tank area",
      severity: "critical",
      status: "investigating",
      owner: "قائد الاستجابة",
      reported_at: iso(now - 35 * M),
      resolved_at: null,
      response_minutes: 22,
      root_cause: null,
      ai_summary: "قراءة مرتفعة من حساسين متجاورين؛ فريق الاستجابة في الموقع.",
    },
    {
      id: "sim-i2",
      ref: "INC-2416",
      site_id: "sim-s3",
      category: "perimeter",
      title_ar: "إنذار تسلق سياج — الجهة الشمالية",
      title_en: "Fence-climb alert — north side",
      severity: "high",
      status: "open",
      owner: null,
      reported_at: iso(now - 2 * H),
      resolved_at: null,
      response_minutes: 41,
      root_cause: null,
      ai_summary: null,
    },
    {
      id: "sim-i3",
      ref: "INC-2415",
      site_id: "sim-s2",
      category: "access",
      title_ar: "محاولة دخول ببطاقة منتهية",
      title_en: "Expired-badge entry attempt",
      severity: "high",
      status: "open",
      owner: "ذكاء الزوار",
      reported_at: iso(now - 4 * H),
      resolved_at: null,
      response_minutes: 12,
      root_cause: null,
      ai_summary: null,
    },
    {
      id: "sim-i4",
      ref: "INC-2414",
      site_id: "sim-s4",
      category: "safety",
      title_ar: "عدم ارتداء معدات الوقاية",
      title_en: "PPE violation",
      severity: "medium",
      status: "resolved",
      owner: "السلامة",
      reported_at: iso(now - 9 * H),
      resolved_at: iso(now - 8 * H),
      response_minutes: 28,
      root_cause: "توعية المقاول",
      ai_summary: null,
    },
    {
      id: "sim-i5",
      ref: "INC-2413",
      site_id: "sim-s1",
      category: "cctv",
      title_ar: "انقطاع بث كاميرا PTZ-4",
      title_en: "PTZ-4 feed loss",
      severity: "low",
      status: "closed",
      owner: "الصيانة",
      reported_at: iso(now - 22 * H),
      resolved_at: iso(now - 20 * H),
      response_minutes: 55,
      root_cause: "كابل تالف",
      ai_summary: null,
    },
  ];
  const PAT: SecOverview["patrols"] = [
    {
      id: "sim-pt1",
      ref: "PTR-88",
      site_id: "sim-s1",
      team: "فريق الصقر",
      route: "المحيط الغربي",
      status: "active",
      checkpoints_total: 14,
      checkpoints_done: 9,
      started_at: iso(now - 50 * M),
      ended_at: null,
    },
    {
      id: "sim-pt2",
      ref: "PTR-87",
      site_id: "sim-s2",
      team: "فريق النمر",
      route: "الحلقة الداخلية",
      status: "active",
      checkpoints_total: 10,
      checkpoints_done: 4,
      started_at: iso(now - 25 * M),
      ended_at: null,
    },
    {
      id: "sim-pt3",
      ref: "PTR-86",
      site_id: "sim-s3",
      team: "فريق العقاب",
      route: "المحيط الشمالي",
      status: "completed",
      checkpoints_total: 14,
      checkpoints_done: 14,
      started_at: iso(now - 4 * H),
      ended_at: iso(now - 3 * H),
    },
    {
      id: "sim-pt4",
      ref: "PTR-85",
      site_id: "sim-s4",
      team: "فريق الصقر",
      route: "بوابات الجنوب",
      status: "completed",
      checkpoints_total: 8,
      checkpoints_done: 8,
      started_at: iso(now - 7 * H),
      ended_at: iso(now - 6 * H),
    },
  ];
  const VIS: SecOverview["visitors"] = [
    {
      id: "sim-v1",
      ref: "VIS-501",
      site_id: "sim-s2",
      full_name: "م. خالد العتيبي",
      organization: "شركة الإنشاءات المتقدمة",
      host: "إدارة المشاريع",
      purpose: "اجتماع تنسيقي",
      badge_no: "B-114",
      check_in_at: iso(now - 90 * M),
      check_out_at: null,
      status: "inside",
    },
    {
      id: "sim-v2",
      ref: "VIS-502",
      site_id: "sim-s1",
      full_name: "أ. سارة الحربي",
      organization: "المقاول الوطني للطاقة",
      host: "الصيانة",
      purpose: "معاينة لوحة التوزيع",
      badge_no: "B-115",
      check_in_at: iso(now - 70 * M),
      check_out_at: null,
      status: "inside",
    },
    {
      id: "sim-v3",
      ref: "VIS-503",
      site_id: "sim-s2",
      full_name: "م. فهد القحطاني",
      organization: "هيئة التفتيش",
      host: "الامتثال",
      purpose: "جولة تدقيق",
      badge_no: "B-116",
      check_in_at: iso(now - 3 * H),
      check_out_at: null,
      status: "inside",
    },
    {
      id: "sim-v4",
      ref: "VIS-504",
      site_id: "sim-s3",
      full_name: "فني عبدالله الشهري",
      organization: "أعمال الارتفاعات",
      host: "العمليات",
      purpose: "صيانة برج",
      badge_no: "B-117",
      check_in_at: iso(now - 5 * H),
      check_out_at: null,
      status: "overdue",
    },
    {
      id: "sim-v5",
      ref: "VIS-505",
      site_id: "sim-s4",
      full_name: "أ. نورة الدوسري",
      organization: "الاستشارات الأمنية",
      host: "الأمن الصناعي",
      purpose: "تقييم SVA",
      badge_no: "B-118",
      check_in_at: iso(now - 8 * H),
      check_out_at: iso(now - 6 * H),
      status: "checked_out",
    },
  ];
  const CON: SecOverview["contractors"] = [
    {
      id: "sim-c1",
      ref: "CTR-11",
      name: "شركة الإنشاءات المتقدمة",
      contract_no: "C-2024-11",
      workers_count: 42,
      compliance_score: 96,
      status: "active",
      expires_at: iso(now + 90 * 24 * H),
    },
    {
      id: "sim-c2",
      ref: "CTR-12",
      name: "المقاول الوطني للطاقة",
      contract_no: "C-2024-18",
      workers_count: 28,
      compliance_score: 93,
      status: "active",
      expires_at: iso(now + 200 * 24 * H),
    },
    {
      id: "sim-c3",
      ref: "CTR-13",
      name: "أعمال الارتفاعات المحدودة",
      contract_no: "C-2025-02",
      workers_count: 15,
      compliance_score: 91,
      status: "active",
      expires_at: iso(now + 45 * 24 * H),
    },
    {
      id: "sim-c4",
      ref: "CTR-14",
      name: "شركة الصيانة الصناعية",
      contract_no: "C-2023-31",
      workers_count: 33,
      compliance_score: 89,
      status: "expiring",
      expires_at: iso(now + 12 * 24 * H),
    },
  ];
  const PER: SecOverview["permits"] = [
    {
      id: "sim-pm1",
      ref: "PTW-SIM-001",
      site_id: "sim-s1",
      work_type: "أعمال ساخنة",
      contractor: "شركة الإنشاءات المتقدمة",
      risk_level: "high",
      status: "active",
      starts_at: iso(now - 2 * H),
      ends_at: iso(now + 6 * H),
      approver: "مدير المنطقة",
      notes: null,
    },
    {
      id: "sim-pm2",
      ref: "PTW-SIM-002",
      site_id: "sim-s2",
      work_type: "أعمال كهربائية",
      contractor: "المقاول الوطني للطاقة",
      risk_level: "high",
      status: "active",
      starts_at: iso(now - H),
      ends_at: iso(now + 7 * H),
      approver: "السلامة",
      notes: null,
    },
    {
      id: "sim-pm3",
      ref: "PTW-SIM-003",
      site_id: "sim-s3",
      work_type: "عمل على ارتفاع",
      contractor: "أعمال الارتفاعات",
      risk_level: "medium",
      status: "approved",
      starts_at: iso(now + 2 * H),
      ends_at: iso(now + 10 * H),
      approver: "مشرف الموقع",
      notes: null,
    },
    {
      id: "sim-pm4",
      ref: "PTW-SIM-006",
      site_id: "sim-s1",
      work_type: "أعمال كهربائية",
      contractor: "المقاول الوطني للطاقة",
      risk_level: "low",
      status: "closed",
      starts_at: iso(now - 9 * H),
      ends_at: iso(now - 2 * H),
      approver: "مشرف الموقع",
      notes: null,
    },
  ];
  const AST: SecOverview["assets"] = [
    {
      id: "sim-as1",
      code: "CAM-PTZ-7",
      name_ar: "كاميرا متحركة 7",
      name_en: "PTZ Camera 7",
      kind: "camera",
      site_id: "sim-s1",
      health: 97,
      status: "online",
      last_seen_at: iso(now - 2 * M),
    },
    {
      id: "sim-as2",
      code: "GATE-E1",
      name_ar: "البوابة الشرقية",
      name_en: "East Gate",
      kind: "gate",
      site_id: "sim-s2",
      health: 98,
      status: "online",
      last_seen_at: iso(now - M),
    },
    {
      id: "sim-as3",
      code: "SNS-PID-22",
      name_ar: "حساس محيطي 22",
      name_en: "PIDS Sensor 22",
      kind: "sensor",
      site_id: "sim-s3",
      health: 91,
      status: "online",
      last_seen_at: iso(now - 4 * M),
    },
    {
      id: "sim-as4",
      code: "CAM-FX-31",
      name_ar: "كاميرا ثابتة 31",
      name_en: "Fixed Camera 31",
      kind: "camera",
      site_id: "sim-s4",
      health: 38,
      status: "offline",
      last_seen_at: iso(now - 3 * H),
    },
    {
      id: "sim-as5",
      code: "UPS-CR-2",
      name_ar: "مزود طاقة غرفة التحكم",
      name_en: "Control-room UPS",
      kind: "power",
      site_id: "sim-s2",
      health: 95,
      status: "online",
      last_seen_at: iso(now - 6 * M),
    },
  ];
  const CCTV: SecOverview["cctv"] = [
    {
      id: "sim-cv1",
      ref: "CV-901",
      site_id: "sim-s2",
      camera_code: "CAM-E-12",
      alert_type: "motion",
      confidence: 0.92,
      status: "new",
      detected_at: iso(now - 12 * M),
      acknowledged_by: null,
    },
    {
      id: "sim-cv2",
      ref: "CV-900",
      site_id: "sim-s1",
      camera_code: "CAM-PTZ-7",
      alert_type: "loitering",
      confidence: 0.81,
      status: "new",
      detected_at: iso(now - 28 * M),
      acknowledged_by: null,
    },
    {
      id: "sim-cv3",
      ref: "CV-899",
      site_id: "sim-s3",
      camera_code: "CAM-N-4",
      alert_type: "intrusion",
      confidence: 0.77,
      status: "acknowledged",
      detected_at: iso(now - 2 * H),
      acknowledged_by: "غرفة التحكم",
    },
    {
      id: "sim-cv4",
      ref: "CV-898",
      site_id: "sim-s4",
      camera_code: "CAM-S-2",
      alert_type: "camera_offline",
      confidence: 1,
      status: "resolved",
      detected_at: iso(now - 5 * H),
      acknowledged_by: "الصيانة",
    },
  ];
  return {
    sites: SITES,
    incidents: INC,
    patrols: PAT,
    visitors: VIS,
    contractors: CON,
    permits: PER,
    assets: AST,
    cctv: CCTV,
    counts: {
      sites: SITES.length,
      incidents_open: INC.filter((i) => i.status !== "resolved" && i.status !== "closed").length,
      incidents_critical: INC.filter((i) => i.severity === "critical" && i.status !== "closed")
        .length,
      patrols_active: PAT.filter((p) => p.status === "active").length,
      visitors_inside: VIS.filter((v) => v.status === "inside" || v.status === "overdue").length,
      permits_active: PER.filter((p) => p.status === "active" || p.status === "approved").length,
      cctv_new: CCTV.filter((c) => c.status === "new").length,
      assets_offline: AST.filter((a) => a.status === "offline" || a.status === "degraded").length,
      contractors_active: CON.filter((c) => c.status === "active").length,
    },
  };
}

/* ── Agent operations (نافذة الوكلاء + سجل التشغيل) ─────────────────────── */

import type { AgentOpsOverview } from "@/lib/exec.functions";

const AGENT_MODEL = "aria-router";
const AGENT_STATES: Array<AgentOpsOverview["agents"][number]["state"]> = [
  "running",
  "running",
  "ready",
  "queued",
  "ready",
  "idle",
  "ready",
  "running",
];

export function buildAgentOpsSimulation(now: number): AgentOpsOverview {
  const agents: AgentOpsOverview["agents"] = FLEET.map((a, i) => {
    const total = 26 + i * 7;
    const failed = i % 3 === 0 ? 1 : 0;
    const cancelled = i % 4 === 0 ? 1 : 0;
    const succeeded = total - failed - cancelled - 1;
    return {
      id: a.id,
      name: a.name,
      goal: a.goal,
      model: AGENT_MODEL,
      enabled: true,
      tool_allowlist: ["read_ops", "notify", "report"],
      permissions: ["ops.read"],
      metadata: {},
      updated_at: iso(now - (i + 2) * H),
      state: AGENT_STATES[i]!,
      total_runs: total,
      succeeded,
      failed,
      cancelled,
      running: AGENT_STATES[i] === "running" ? 1 : 0,
      success_rate: Math.round((succeeded / Math.max(1, succeeded + failed + cancelled)) * 100),
      avg_duration_ms: 18_000 + i * 4_500,
      last_status: AGENT_STATES[i] === "queued" ? "queued" : "succeeded",
      last_run_at: iso(now - (i + 1) * 11 * M),
      last_finished_at: iso(now - (i + 1) * 11 * M + 21_000),
    };
  });
  return {
    agents,
    system: {
      agents_total: agents.length,
      agents_enabled: agents.length,
      agents_running: agents.filter((a) => a.state === "running").length,
      agents_failed: 0,
      agents_idle: agents.filter((a) => a.state === "idle").length,
      agents_ready: agents.filter((a) => a.state === "ready").length,
      agents_disabled: 0,
      runs_window_total: agents.reduce((s, a) => s + a.total_runs, 0),
      runs_today: 23,
      avg_duration_ms: 26_500,
      queue_length: agents.filter((a) => a.state === "queued").length,
      window_days: 30,
    },
  };
}

export type SimAgentRun = {
  id: string;
  agent_id: string;
  status: string;
  summary: string | null;
  steps: unknown[];
  error: string | null;
  started_at: string;
  finished_at: string | null;
  triggered_by: string;
  goal_override: string | null;
  audit_json: Record<string, unknown>;
};

const RUN_SUMMARIES: Array<[agentIdx: number, minAgo: number, status: string, summary: string]> = [
  [2, 6, "succeeded", "اكتمل تدقيق SEC-18 الأسبوعي — 97٪ مطابقة، صفر ملاحظات حرجة"],
  [0, 14, "running", "متابعة بلاغ التسرب المحتمل INC-2417 مع فريق الاستجابة"],
  [3, 22, "succeeded", "تصنيف 41 حدثًا بصريًا — حدثان يستحقان المراجعة"],
  [6, 31, "succeeded", "مطابقة سجل الزوار مع التصاريح — صفر تجاوزات"],
  [1, 45, "succeeded", "تحليل نمط إنذارات المحيط — توصية بدورية إضافية"],
  [4, 58, "queued", "جولة تفتيش مجدولة للمحيط الجنوبي 22:00"],
  [7, 73, "succeeded", "نشر ملخص منتصف المناوبة للوحة التنفيذية"],
  [5, 88, "succeeded", "تمرين جاهزية إخلاء جزئي — زمن الاستجابة 4:12"],
  [2, 101, "succeeded", "مزامنة لائحة التوجيهات مع مصفوفة الامتثال"],
  [0, 126, "failed", "تعذر الوصول لمستشعر بوابة قديم — أُنشئ أمر عمل"],
  [3, 142, "succeeded", "فحص ذاتي لشبكة الكاميرات 139/142 متصلة"],
  [1, 165, "succeeded", "توقع إجهاد حراري لنافذة الغد — بانتظار الاعتماد"],
];

export function buildAgentRunsSimulation(now: number): SimAgentRun[] {
  return RUN_SUMMARIES.map(([ai, minAgo, status, summary], i) => ({
    id: `sim-run-${i + 1}`,
    agent_id: FLEET[ai]!.id,
    status,
    summary,
    steps: [],
    error: status === "failed" ? "sensor_timeout: GATE-S-4 لم يستجب خلال 30 ثانية" : null,
    started_at: iso(now - minAgo * M),
    finished_at:
      status === "running" || status === "queued" ? null : iso(now - minAgo * M + 24_000),
    triggered_by: "scheduler",
    goal_override: null,
    audit_json: { simulated: true },
  }));
}

export function buildAgentDefsSimulation(now: number) {
  return FLEET.map((a, i) => ({
    id: a.id,
    name: a.name,
    goal: a.goal,
    model: AGENT_MODEL,
    tool_allowlist: ["read_ops", "notify", "report"],
    permissions: ["ops.read"],
    enabled: true,
    updated_at: iso(now - (i + 2) * H),
  }));
}

/* ── Resilience guard ───────────────────────────────────────────────────
   Showcase read functions must NEVER hang or surface an error: the work
   races a hard timeout, and timeout/rejection/empty all resolve to the
   built-in simulation. Live rows always win when they arrive in time. */

export async function resilient<T>(
  label: string,
  work: () => Promise<T>,
  isEmpty: (value: T) => boolean,
  fallback: () => T | Promise<T>,
  timeoutMs = 4_000,
): Promise<T> {
  try {
    const value = await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("showcase-timeout")), timeoutMs);
      }),
    ]);
    if (isEmpty(value)) return await fallback();
    return value;
  } catch (error) {
    console.error(
      `[showcase] ${label} unavailable — serving simulation:`,
      error instanceof Error ? error.message : error,
    );
    return await fallback();
  }
}
