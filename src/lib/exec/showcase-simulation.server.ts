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

/* ── Access management (/sec/access · visitors · vehicles · contractors) ── */

const ACCESS_SITES = [
  { id: "sim-s1", code: "WST-01", name_ar: "محطة التحويل الغربية", name_en: "Western Substation" },
  { id: "sim-s2", code: "CTR-01", name_ar: "مبنى القيادة المركزي", name_en: "Central Command" },
  { id: "sim-s3", code: "EST-02", name_ar: "محطة الضخ الشرقية", name_en: "Eastern Pump Station" },
  { id: "sim-s4", code: "STH-01", name_ar: "مستودع الجنوب اللوجستي", name_en: "South Logistics" },
];

export function buildAccessSimulation(now: number) {
  const visitors = [
    [
      "زياد الحربي",
      "شركة المراجعة الوطنية",
      "م. سلطان العتيبي",
      "اجتماع مراجعة ربع سنوية",
      "inside",
      2 * H,
      "V-1042",
    ],
    [
      "نورة الشمري",
      "هيئة التقييس الخليجية",
      "م. فهد القحطاني",
      "جولة تفتيش معايير",
      "inside",
      1.2 * H,
      "V-1043",
    ],
    [
      "محمد باوزير",
      "مقاولات الإنشاء المتحدة",
      "أ. عبدالله السبيعي",
      "تسليم مخططات المرحلة 3",
      "inside",
      45 * M,
      "V-1044",
    ],
    [
      "سارة الدوسري",
      "مكتب الاستشارات الهندسية",
      "م. سلطان العتيبي",
      "ورشة عمل السلامة",
      "expected",
      -1.5 * H,
      null,
    ],
    [
      "خالد الغامدي",
      "الخدمات الطبية المساندة",
      "د. ريم القحطاني",
      "فحص دوري للعيادة",
      "expected",
      -3 * H,
      null,
    ],
    [
      "إبراهيم العنزي",
      "النقل التخصصي",
      "أ. لمى الشهراني",
      "استلام معدات قياس",
      "left",
      6 * H,
      "V-1039",
    ],
  ] as const;
  const contractors = [
    ["الإنشاءات الصناعية المتقدمة", "C-2024-118", 340, 96, "active", 320],
    ["صيانة الشبكات الموحدة", "C-2025-031", 180, 92, "active", 150],
    ["الحلول الكهروميكانيكية", "C-2025-044", 95, 88, "active", 65],
    ["خدمات العزل والطلاء", "C-2024-201", 60, 74, "suspended", 25],
    ["النظافة والدعم اللوجستي", "C-2025-009", 220, 91, "active", 400],
  ] as const;
  const vehicles = [
    ["7842 ن ص أ", "truck", "الإنشاءات الصناعية المتقدمة", "ماجد الرشيدي", "inside", 3 * H],
    ["3311 د ط ع", "tanker", "صيانة الشبكات الموحدة", "بدر المطيري", "inside", 1.5 * H],
    ["9057 هـ و ب", "service", "الحلول الكهروميكانيكية", "عمر الزهراني", "inside", 40 * M],
    ["1204 أ ب ج", "car", null, "زياد الحربي", "inside", 2 * H],
    ["5566 ر س ن", "bus", "النظافة والدعم اللوجستي", "حسن عسيري", "expected", -2 * H],
    ["8790 ك ل م", "truck", "خدمات العزل والطلاء", "طارق جمال", "denied", 5 * H],
  ] as const;
  const gateNames = [
    "البوابة الرئيسية",
    "بوابة الشحن",
    "بوابة المقاولين",
    "بوابة الطوارئ",
    "البوابة الشرقية",
    "بوابة المستودعات",
    "البوابة الجنوبية",
    "بوابة كبار الزوار",
  ];
  const gates = gateNames.map((_, i) => ({
    id: `sim-gate-${i + 1}`,
    code: `GT-0${i + 1}`,
    kind: i === 3 ? "emergency" : i % 2 === 0 ? "vehicle" : "pedestrian",
    status: i === 5 ? "degraded" : i === 6 ? "maintenance" : "online",
    health: i === 5 ? 71 : i === 6 ? 55 : 97 - i,
    events_today: 180 - i * 17,
    last_event_at: iso(now - (i + 1) * 9 * M),
    site_id: ACCESS_SITES[i % ACCESS_SITES.length].id,
    building_id: null,
  }));
  const denied_events = [
    ["8790 ك ل م", "تصريح المركبة منتهي منذ 12 يومًا", 5 * H],
    ["V-0991", "بطاقة زائر منتهية الصلاحية", 9 * H],
    ["2471 ص ع ق", "لا يوجد تصريح دخول للموقع الحرج", 14 * H],
    ["C-2024-201", "مقاول موقوف — درجة امتثال منخفضة", 20 * H],
  ].map(([ref, reason, ago], i) => ({
    id: `sim-deny-${i + 1}`,
    event: "access_denied",
    payload: { reason, target: i % 2 ? "visitor" : "vehicle" },
    occurred_at: iso(now - (ago as number)),
    entity_type: "access_attempt",
    entity_ref: ref as string,
    actor_name: "نظام البوابات الآلي",
  }));
  return {
    visitors: visitors.map(([full_name, organization, host, purpose, status, ago, badge], i) => ({
      id: `sim-vis-${i + 1}`,
      ref: `VIS-SIM-${100 + i}`,
      full_name,
      organization,
      host,
      purpose,
      badge_no: badge,
      status,
      vehicle_plate: i === 0 ? "1204 أ ب ج" : null,
      expected_at: status === "expected" ? iso(now - ago) : null,
      check_in_at: status === "expected" ? null : iso(now - ago),
      check_out_at: status === "left" ? iso(now - ago + 4 * H) : null,
      phone: null,
      site_id: ACCESS_SITES[i % ACCESS_SITES.length].id,
      gate_id: gates[i % gates.length].id,
    })),
    contractors: contractors.map(
      ([name, contract_no, workers_count, compliance_score, status, expDays], i) => ({
        id: `sim-con-${i + 1}`,
        ref: `CON-SIM-${200 + i}`,
        name,
        contract_no,
        workers_count,
        compliance_score,
        status,
        expires_at: iso(now + (expDays as number) * 24 * H),
        phone: null,
        email: null,
        permit_types: ["hot_work", "confined_space"].slice(0, (i % 2) + 1),
        insurance_expiry: iso(now + ((expDays as number) - 10) * 24 * H),
      }),
    ),
    vehicles: vehicles.map(([plate, vehicle_type, company, driver_name, status, ago], i) => ({
      id: `sim-veh-${i + 1}`,
      ref: `VEH-SIM-${300 + i}`,
      plate,
      vehicle_type,
      company,
      driver_name,
      driver_phone: null,
      status,
      site_id: ACCESS_SITES[i % ACCESS_SITES.length].id,
      gate_id: gates[(i * 2) % gates.length].id,
      permit_no: status === "denied" ? null : `PRM-${4400 + i}`,
      permit_expires_at: iso(now + (status === "denied" ? -12 : 45) * 24 * H),
      check_in_at: status === "inside" ? iso(now - (ago as number)) : null,
      check_out_at: null,
      contractor_id: null,
    })),
    gates,
    denied_events,
    sites: ACCESS_SITES,
  };
}

/* ── Intelligence fabric (/boardroom · /intelligence) raw rows ─────────── */

export function buildFabricRowsSimulation(now: number) {
  const EV = [
    [
      "decision",
      "in_progress",
      "high",
      72,
      3,
      0.3,
      "اعتماد توسعة نظام المراقبة للمنطقة الغربية",
      "غرفة العمليات",
      "المدير التنفيذي للأمن",
    ],
    [
      "initiative",
      "in_progress",
      "critical",
      64,
      12,
      0.6,
      "برنامج التحول الرقمي للأمن الصناعي — المرحلة الثانية",
      "تقنية المعلومات",
      "لجنة التحول",
    ],
    [
      "decision",
      "open",
      "medium",
      35,
      6,
      1.2,
      "توحيد عقود المقاولين الأمنيين",
      "المشتريات",
      "إدارة العقود",
    ],
    [
      "initiative",
      "in_progress",
      "high",
      81,
      20,
      0.9,
      "رفع جاهزية الاستجابة للطوارئ إلى المستوى الذهبي",
      "السلامة",
      "مدير الطوارئ",
    ],
    [
      "board_action",
      "open",
      "high",
      40,
      8,
      2.1,
      "مراجعة مصفوفة الصلاحيات للأنظمة الحرجة",
      "الحوكمة",
      "أمن المعلومات",
    ],
    [
      "decision",
      "blocked",
      "medium",
      25,
      -2,
      7.4,
      "ترقية أنظمة التحكم بالدخول للمواقع الفرعية",
      "الأمن الصناعي",
      "إدارة المشاريع",
    ],
    [
      "initiative",
      "done",
      "medium",
      100,
      30,
      1.0,
      "أتمتة تقارير الوردية اليومية",
      "العمليات",
      "غرفة التحكم",
    ],
    [
      "risk",
      "forgotten",
      "high",
      15,
      9,
      9.2,
      "تحديث خطة استمرارية الأعمال للمواقع الساحلية",
      "إدارة المخاطر",
      "منسق الاستمرارية",
    ],
  ] as const;
  const AL = [
    [
      "critical",
      92,
      "انقطاع اتصال متكرر في كاميرات القطاع الغربي",
      "غرفة التحكم",
      "/sec/cctv",
      "cctv_monitor",
      2,
    ],
    [
      "high",
      78,
      "ازدحام متوقع عند بوابة المقاولين في وردية الصباح",
      "أمن البوابات",
      "/sec/access",
      "predictive",
      5,
    ],
    ["high", 71, "3 تصاريح عمل حرج تنتهي خلال 48 ساعة", "السلامة", "/ptw", "ptw_engine", 8],
    [
      "medium",
      54,
      "انخفاض درجة امتثال مقاول العزل عن الحد الأدنى",
      "إدارة العقود",
      "/sec/contractors",
      "compliance",
      11,
    ],
    [
      "medium",
      47,
      "مستشعر حرارة يتطلب معايرة في المحطة الشرقية",
      "الصيانة",
      "/sec/maintenance",
      "iot",
      16,
    ],
    [
      "low",
      30,
      "تحديث دوري لسياسة كلمات المرور مستحق",
      "أمن المعلومات",
      "/governance",
      "policy",
      30,
    ],
  ] as const;
  const eventRows = EV.map(
    ([kind, status, impact, progress, dueDays, silentDays, title, department, owner], i) => ({
      id: `sim-ev-${i + 1}`,
      kind,
      status,
      impact,
      progress,
      due_at: iso(now + (dueDays as number) * 24 * H),
      last_update: iso(now - (silentDays as number) * 24 * H),
      created_at: iso(now - ((silentDays as number) + 14) * 24 * H),
      title,
      title_en: null,
      owner,
      department,
      decision_route: kind === "decision" ? "/boardroom" : null,
    }),
  );
  const alertRows = AL.map(([severity, score, title, owner, route, source, hoursAgo], i) => ({
    id: `sim-al-${i + 1}`,
    severity,
    title,
    title_en: null,
    owner,
    route,
    source,
    business_impact_score: score,
    resolved_at: null,
    created_at: iso(now - (hoursAgo as number) * H),
  }));
  const taskRows = fill(14, (i) => ({
    status: i < 9 ? "done" : i < 12 ? "in_progress" : "open",
    created_at: iso(now - (i + 2) * 24 * H),
    updated_at: iso(now - i * 20 * H),
  }));
  return { eventRows, alertRows, taskRows };
}

/* ── Hajj operations (مشاعر) command center ────────────────────────────── */

export function buildHajjSimulation(now: number) {
  const SITES = [
    ["MNA", "مخيمات منى", "Mina Camps", 21.4133, 39.8933, "safe", 420],
    ["ARF", "صعيد عرفات", "Arafat", 21.3549, 39.9841, "safe", 310],
    ["MZD", "مزدلفة", "Muzdalifah", 21.4023, 39.9367, "alert", 180],
    ["JMR", "منشأة الجمرات", "Jamarat", 21.4225, 39.8722, "safe", 260],
    ["HRM", "ساحات الحرم", "Haram Plazas", 21.4225, 39.8262, "safe", 380],
  ] as const;
  const sites = SITES.map(([code, name_ar, name_en, lat, lng, status, staff_count], i) => ({
    id: `sim-hs-${i + 1}`,
    code,
    name_ar,
    name_en,
    lat,
    lng,
    status,
    staff_count,
    notes: null,
  }));
  const STATIONS = [
    [0, "MNA-OPS", "مركز عمليات منى", "ops", "online", 45, 128, 3],
    [0, "MNA-MED", "النقطة الطبية — منى 3", "medical", "online", 22, 64, 1],
    [1, "ARF-OPS", "مركز عمليات عرفات", "ops", "online", 38, 96, 2],
    [1, "ARF-GTE", "بوابات التفويج الجنوبية", "gate", "degraded", 18, 41, 4],
    [2, "MZD-OPS", "نقطة تنسيق مزدلفة", "ops", "online", 16, 33, 2],
    [3, "JMR-FLW", "تدفق الجمرات — الدور الثالث", "flow", "online", 28, 87, 1],
    [4, "HRM-PLZ", "ساحات الحرم الشمالية", "crowd", "online", 34, 110, 2],
    [4, "HRM-LST", "مفقودات وإرشاد الحجاج", "support", "offline", 9, 18, 0],
  ] as const;
  const stations = STATIONS.map(
    ([siteIdx, code, name_ar, kind, network, staff_count, reports_count, incidents_count], i) => ({
      id: `sim-hst-${i + 1}`,
      site_id: sites[siteIdx as number].id,
      code,
      name_ar,
      name_en: code,
      kind,
      network,
      staff_count,
      reports_count,
      incidents_count,
    }),
  );
  const TASKS = [
    ["ازدحام", "تخفيف كثافة الحشود عند بوابة عرفات الجنوبية", "P1", "in_progress", 35],
    ["طبي", "حالة إجهاد حراري — نقل إلى النقطة الطبية منى 3", "P1", "done", 95],
    ["نقل", "تعزيز حافلات التفويج من مزدلفة إلى الجمرات", "P2", "in_progress", 60],
    ["مرافق", "إصلاح تكييف مخيم 214 بمنى", "P3", "pending", 140],
    ["اتصالات", "استعادة شبكة نقطة المفقودات بالحرم", "P2", "in_progress", 80],
    ["إرشاد", "حاج تائه — إعادته إلى حملته بمخيم 118", "P2", "done", 200],
    ["سلامة", "إزالة عائق مسار المشاة أمام منشأة الجمرات", "P1", "done", 260],
    ["تموين", "تزويد محطة عرفات بمياه إضافية قبل الذروة", "P3", "pending", 320],
    ["ازدحام", "فتح مسار بديل للدور الثالث بالجمرات", "P2", "pending", 380],
    ["طبي", "تدقيق جاهزية سيارات الإسعاف بالمشاعر", "P4", "done", 500],
  ] as const;
  const tasks = TASKS.map(([category, title_ar, priority, status, minAgo], i) => ({
    id: `sim-ht-${i + 1}`,
    station_id: stations[i % stations.length].id,
    category,
    title_ar,
    title_en: null,
    priority,
    status,
    reported_at: iso(now - (minAgo as number) * M),
    started_at: status === "pending" ? null : iso(now - ((minAgo as number) - 10) * M),
    completed_at: status === "done" ? iso(now - ((minAgo as number) - 40) * M) : null,
  }));
  const kpi = {
    id: "sim-hk-1",
    snapshot_at: iso(now - 6 * M),
    open_incidents: 4,
    active_alerts: 7,
    tasks_done: 128,
    field_staff: 1550,
    stations_online: 6,
    stations_total: 8,
    compliance_pct: 94,
    risk_level: "medium",
  };
  return { sites, stations, tasks, kpi };
}

/* ── Integrations hub (/integrations) ──────────────────────────────────── */

export function buildIntegrationsSimulation(now: number) {
  const P = [
    [
      "microsoft_outlook",
      "Microsoft Outlook",
      "مايكروسوفت آوتلوك",
      "Email",
      true,
      true,
      "healthy",
      486,
      0,
    ],
    [
      "microsoft_onedrive",
      "Microsoft OneDrive",
      "ون درايف",
      "Storage",
      true,
      true,
      "healthy",
      122,
      0,
    ],
    ["microsoft_sharepoint", "SharePoint", "شير بوينت", "Docs", true, true, "healthy", 231, 0],
    ["microsoft_teams", "Microsoft Teams", "مايكروسوفت تيمز", "Comms", true, false, "error", 9, 3],
    ["sap", "SAP S/4HANA", "SAP S/4HANA", "ERP", true, true, "healthy", 407, 1],
    ["power_bi", "Power BI", "باور بي آي", "Analytics", true, false, "not_configured", 29, 0],
  ] as const;
  const providers = P.map(
    ([id, name, name_ar, category, configured, connected, health, events_24h, errors_24h], i) => ({
      id,
      name,
      name_ar,
      category,
      configured,
      connected,
      health,
      last_test_at: iso(now - (i + 1) * 40 * M),
      last_test_status: health === "error" ? "error" : health === "not_configured" ? null : "ok",
      last_test_error: health === "error" ? "يتطلب تجديد الربط" : null,
      last_sync_at: connected ? iso(now - (i + 1) * 12 * M) : null,
      last_sync_status: connected ? "ok" : null,
      events_24h,
      errors_24h,
      setup_hint_ar: "بيانات محاكاة مرجعية — اربط الموصل الفعلي من الإعدادات",
      setup_hint_en: "Reference simulation — link the live connector from settings",
      // Deterministic hourly working-day curve scaled to the provider's
      // 24h volume — fuel for the card sparkline.
      activity24h: fill(24, (h) => {
        const day = Math.max(0, Math.sin(((h - 5) / 18) * Math.PI));
        return Math.round((events_24h / 14) * day + ((h * (i + 3)) % 3));
      }),
    }),
  );
  return {
    providers,
    totals: {
      total: providers.length,
      connected: providers.filter((p) => p.connected).length,
      healthy: providers.filter((p) => p.health === "healthy").length,
      degraded: providers.filter(
        (p) => (p.health as string) === "degraded" || (p.health as string) === "error",
      ).length,
      errors_24h: providers.reduce((s, p) => s + p.errors_24h, 0),
      events_24h: providers.reduce((s, p) => s + p.events_24h, 0),
    },
    generated_at: iso(now),
  };
}

export function buildIntegrationEventsSimulation(now: number) {
  const E = [
    ["Microsoft outlook", "outlook", "ok", "مزامنة 34 رسالة تنفيذية", 18, 1840, 34],
    ["SAP", "work_orders", "ok", "GET /workorders → 200 (57)", 25, 940, 57],
    ["Microsoft sharepoint", "sharepoint", "ok", "رفع تقرير الوردية الصباحية", 47, 2210, 1],
    ["Microsoft teams", "teams", "error", "يتطلب تجديد الربط", 63, 450, null],
    ["SAP", "materials", "ok", "GET /materials → 200 (112)", 95, 1230, 112],
    ["Microsoft outlook", "outlook", "ok", "مزامنة 12 دعوة اجتماع", 140, 1620, 12],
    ["Microsoft onedrive", "onedrive", "ok", "مزامنة مجلد التقارير التنفيذية", 190, 1980, 8],
    ["SAP", "maintenance", "ok", "POST /notifications → 201", 260, 870, 3],
    ["Microsoft sharepoint", "sharepoint", "ok", "أرشفة تقارير الأسبوع الماضي", 330, 2540, 7],
    ["Microsoft teams", "teams", "skipped", "قناة العمليات غير مفعّلة", 400, 120, null],
    ["SAP", "work_orders", "ok", "GET /workorders?delta → 200 (9)", 470, 780, 9],
    ["Microsoft outlook", "outlook", "ok", "مزامنة صندوق القيادة", 540, 1450, 21],
  ] as const;
  return E.map(([provider, kind, status, message, minAgo, duration_ms, items_count], i) => ({
    id: `sim-ie-${i + 1}`,
    provider,
    kind,
    status,
    message,
    at: iso(now - (minAgo as number) * M),
    duration_ms,
    items_count,
  }));
}

/* ── Digital twin (/sec/twin) — hierarchical asset model ───────────────── */

export function buildTwinTreeSimulation(now: number) {
  const site = (
    circleIdx: number,
    i: number,
    code: string,
    name_ar: string,
    name_en: string,
    sensitivity: string,
    notes: string | null,
  ) => ({
    id: `sim-tw-site-${circleIdx}-${i}`,
    code,
    name_ar,
    name_en,
    lat: 21.4 + circleIdx * 0.11,
    lng: 39.2 + i * 0.09,
    sensitivity,
    status: "operational",
    guards_count: 8 + circleIdx * 3 + i,
    notes,
    updated_at: iso(now - (circleIdx + 1) * 40 * M),
    circle_id: `sim-tw-cir-${circleIdx}`,
  });
  const building = (siteId: string, i: number, code: string, name_ar: string, name_en: string) => ({
    id: `${siteId}-b${i}`,
    site_id: siteId,
    code,
    name_ar,
    name_en,
    floors: 1 + (i % 3),
    status: "operational",
  });
  const cam = (bId: string, i: number, alarm = false) => ({
    id: `${bId}-cam${i}`,
    building_id: bId,
    site_id: null,
    code: `CAM-${bId.slice(-4).toUpperCase()}${i}`,
    kind: i % 2 ? "ptz" : "fixed",
    status: alarm ? "degraded" : "online",
    health: alarm ? 64 : 95 - i * 3,
    resolution: "4K",
    last_seen_at: iso(now - (i + 1) * 6 * M),
  });
  const gate = (bId: string, i: number, maint = false) => ({
    id: `${bId}-gt${i}`,
    building_id: bId,
    site_id: null,
    code: `GT-${bId.slice(-4).toUpperCase()}${i}`,
    kind: i % 2 ? "vehicle" : "pedestrian",
    status: maint ? "maintenance" : "online",
    health: maint ? 55 : 96,
    events_today: 40 + i * 23,
    last_event_at: iso(now - (i + 2) * 11 * M),
  });
  const sensor = (bId: string, i: number, alarm = false) => ({
    id: `${bId}-sn${i}`,
    building_id: bId,
    site_id: null,
    code: `SNS-${bId.slice(-4).toUpperCase()}${i}`,
    sensor_type: ["pids", "thermal", "smoke", "vibration"][i % 4]!,
    status: alarm ? "alarm" : "online",
    reading: alarm ? 78 : 21 + i * 4,
    threshold: 60,
    unit: "°C",
    last_reading_at: iso(now - (i + 1) * 3 * M),
  });

  const CIRCLES = [
    ["CIR-01", "دائرة محطات التحويل", "Substations Circle", "م. سلطان العتيبي"],
    ["CIR-02", "دائرة المحيط والبوابات", "Perimeter & Gates Circle", "أ. عبدالله السبيعي"],
    ["CIR-03", "دائرة المراقبة البصرية", "CCTV Operations Circle", "م. فهد القحطاني"],
    ["CIR-04", "دائرة الاستشعار والإنذار", "Sensors & Alarms Circle", "م. ريان الزهراني"],
    ["CIR-05", "دائرة الإسناد اللوجستي", "Logistics Support Circle", "أ. لمى الشهراني"],
  ] as const;

  const SITES: Array<Array<ReturnType<typeof site>>> = [
    [
      site(
        0,
        0,
        "SUB-380-W",
        "محطة التحويل الغربية 380 ك.ف",
        "West 380kV Substation",
        "critical",
        "خاضعة للتوجيه SEC-18 — دورة اعتماد مكتملة حتى IFC",
      ),
      site(
        0,
        1,
        "SUB-132-JN",
        "محطة تحويل جدة الشمالية 132 ك.ف",
        "North Jeddah 132kV",
        "critical",
        "خاضعة للتوجيه SEC-18 — مرحلة 90%",
      ),
    ],
    [
      site(
        1,
        0,
        "PRM-WST",
        "المحيط الأمني الغربي",
        "Western Perimeter",
        "high",
        "أسوار SEC-02 وبوابات SEC-03",
      ),
    ],
    [
      site(
        2,
        0,
        "CCTV-HUB",
        "مركز المراقبة البصرية الموحد",
        "Unified CCTV Hub",
        "high",
        "أنظمة متكاملة SEC-05",
      ),
    ],
    [
      site(
        3,
        0,
        "SNS-FLD",
        "حقل الاستشعار المحيطي",
        "Perimeter Sensing Field",
        "high",
        "كشف تسلل PIDS — SEC-06",
      ),
    ],
    [site(4, 0, "LOG-STH", "مستودع الإسناد الجنوبي", "South Logistics Depot", "medium", null)],
  ];

  const circles = CIRCLES.map(([code, name_ar, name_en, manager], ci) => {
    const sites = SITES[ci]!.map((s) => {
      const b1 = building(
        s.id,
        1,
        `${s.code}-B1`,
        `مبنى التحكم — ${s.name_ar}`,
        `${s.name_en} Control Building`,
      );
      const b2 = building(
        s.id,
        2,
        `${s.code}-B2`,
        `مبنى المعدات — ${s.name_ar}`,
        `${s.name_en} Equipment Building`,
      );
      const alarmHere = ci === 3;
      return {
        ...s,
        buildings: [
          {
            ...b1,
            cameras: [cam(b1.id, 1), cam(b1.id, 2)],
            gates: [gate(b1.id, 1)],
            sensors: [sensor(b1.id, 1), sensor(b1.id, 2, alarmHere)],
          },
          {
            ...b2,
            cameras: [cam(b2.id, 1, ci === 2)],
            gates: [gate(b2.id, 1, ci === 1)],
            sensors: [sensor(b2.id, 1)],
          },
        ],
      };
    });
    return {
      id: `sim-tw-cir-${ci}`,
      code,
      name_ar,
      name_en,
      manager,
      lat: 21.5,
      lng: 39.2,
      staff_count: 24 + ci * 6,
      sites,
      control_rooms: [
        {
          id: `sim-tw-cr-${ci}`,
          circle_id: `sim-tw-cir-${ci}`,
          code: `CR-0${ci + 1}`,
          name_ar: `غرفة تحكم ${name_ar}`,
          name_en: `${name_en} Control Room`,
          operators_count: 4 + (ci % 3),
          screens_count: 8 + ci * 2,
          shift_lead: "قائد الوردية أ",
          status: "operational",
        },
      ],
      patrol_teams: [
        {
          id: `sim-tw-pt-${ci}`,
          circle_id: `sim-tw-cir-${ci}`,
          code: `PT-0${ci + 1}`,
          name_ar: ["فريق الصقر", "فريق النمر", "فريق العقاب", "فريق السهم", "فريق الدرع"][ci]!,
          leader: "رقيب أول",
          members_count: 4,
          vehicle_plate: `${7100 + ci * 37} هـ ن ب`,
          status: ci === 4 ? "available" : "on-route",
        },
      ],
    };
  });

  return {
    region: {
      name_ar: "إدارة الأمن الصناعي بالمنطقة الغربية",
      name_en: "Western Region Industrial Security",
    },
    sections: [
      {
        id: "sim-tw-sec-1",
        code: "SEC-OPS",
        name_ar: "قسم العمليات",
        name_en: "Operations",
        head: "م. سلطان العتيبي",
        staff_count: 42,
      },
      {
        id: "sim-tw-sec-2",
        code: "SEC-TEC",
        name_ar: "قسم الأنظمة التقنية",
        name_en: "Technical Systems",
        head: "م. فهد القحطاني",
        staff_count: 28,
      },
      {
        id: "sim-tw-sec-3",
        code: "SEC-CMP",
        name_ar: "قسم الامتثال HCIS",
        name_en: "HCIS Compliance",
        head: "أ. عبدالله السبيعي",
        staff_count: 15,
      },
      {
        id: "sim-tw-sec-4",
        code: "SEC-SUP",
        name_ar: "قسم الإسناد",
        name_en: "Support",
        head: "أ. لمى الشهراني",
        staff_count: 19,
      },
    ],
    circles,
  };
}

/* ── Knowledge repository (/sec/knowledge) ─────────────────────────────── */

const KB_CATEGORIES = [
  ["POL", "السياسات الأمنية", "Security Policies", "shield-check"],
  ["SOP", "الإجراءات التشغيلية", "Operating Procedures", "clipboard-list"],
  ["FRM", "النماذج المعتمدة", "Approved Forms", "file-text"],
  ["CHK", "قوائم التحقق", "Inspection Checklists", "check-square"],
  ["ERP", "استجابة الطوارئ", "Emergency Response", "flame"],
] as const;

const KB_ARTICLES: Array<
  [code: string, cat: string, ar: string, en: string, sum: string, risk: string, kw: string[]]
> = [
  [
    "POL-001",
    "POL",
    "سياسة الامتثال لتوجيهات HCIS",
    "HCIS Compliance Policy",
    "الإطار الحاكم لمطابقة المنشآت مع توجيهات الهيئة العليا للأمن الصناعي ودورة الاعتماد السبع.",
    "high",
    ["hcis", "امتثال", "اعتماد"],
  ],
  [
    "POL-002",
    "POL",
    "سياسة التحكم بالوصول والهوية",
    "Access & Identity Policy",
    "قواعد إصدار البطاقات والتحقق من الهوية للزوار والمقاولين وفق SEC-11 وSEC-12.",
    "high",
    ["وصول", "هوية", "بطاقات"],
  ],
  [
    "POL-003",
    "POL",
    "سياسة الاحتفاظ بتسجيلات المراقبة",
    "CCTV Retention Policy",
    "مدد الاحتفاظ بالتسجيلات وضوابط الاطلاع والتسليم للجهات المختصة.",
    "medium",
    ["cctv", "تسجيلات"],
  ],
  [
    "POL-004",
    "POL",
    "سياسة أمن المعلومات التشغيلية OT",
    "OT Cybersecurity Policy",
    "ضوابط عزل شبكات التحكم الصناعي ومتطلبات SEC-13.",
    "critical",
    ["سيبراني", "ot"],
  ],
  [
    "SOP-001",
    "SOP",
    "إجراء العزل والوسم LOTO",
    "Lockout/Tagout Procedure",
    "خطوات فصل مصادر الطاقة ووسمها قبل أعمال الصيانة على المعدات الحرجة.",
    "critical",
    ["loto", "عزل", "وسم", "صيانة"],
  ],
  [
    "SOP-002",
    "SOP",
    "إجراء تفويج المركبات الثقيلة",
    "Heavy Vehicle Escort SOP",
    "مسارات وتصاريح دخول الشاحنات والصهاريج عبر بوابة الشحن.",
    "medium",
    ["مركبات", "تفويج"],
  ],
  [
    "SOP-003",
    "SOP",
    "إجراء الاستجابة لإنذار كشف التسلل",
    "PIDS Alarm Response SOP",
    "تصنيف الإنذار، التحقق البصري، وإرسال الدورية خلال 4 دقائق.",
    "high",
    ["pids", "إنذار", "تسلل"],
  ],
  [
    "SOP-004",
    "SOP",
    "إجراء تسليم واستلام الوردية",
    "Shift Handover SOP",
    "قائمة التسليم الإلزامية بين قادة الورديات في غرفة التحكم.",
    "medium",
    ["وردية", "تسليم"],
  ],
  [
    "SOP-005",
    "SOP",
    "إجراء إدارة المفاتيح الحرجة",
    "Critical Keys Management",
    "سجل المفاتيح، الصرف المزدوج، والجرد اليومي.",
    "high",
    ["مفاتيح"],
  ],
  [
    "FRM-001",
    "FRM",
    "نموذج تصريح عمل ساخن",
    "Hot Work Permit Form",
    "النموذج المعتمد لأعمال اللحام والقطع داخل المناطق المصنفة.",
    "critical",
    ["تصريح", "عمل ساخن", "لحام"],
  ],
  [
    "FRM-002",
    "FRM",
    "نموذج تسجيل زائر مسبق",
    "Visitor Pre-registration Form",
    "بيانات الزائر والمضيف والغرض ومدة الزيارة.",
    "low",
    ["زائر", "تسجيل"],
  ],
  [
    "FRM-003",
    "FRM",
    "نموذج بلاغ حادث أمني",
    "Security Incident Report Form",
    "الحقول الإلزامية لتوثيق البلاغ خلال الساعة الأولى.",
    "high",
    ["بلاغ", "حادث"],
  ],
  [
    "CHK-132",
    "CHK",
    "قائمة تفتيش محطة تحويل 132 ك.ف",
    "132kV Substation Checklist",
    "48 بند تحقق دوري وفق SEC-18: الأسوار، الإنارة، الكاميرات، أجهزة الاستشعار.",
    "critical",
    ["sec-18", "محطة", "تفتيش", "132"],
  ],
  [
    "CHK-002",
    "CHK",
    "قائمة فحص جاهزية البوابات",
    "Gates Readiness Checklist",
    "فحص أسبوعي للحواجز والقارئات وأنظمة التعرف على اللوحات.",
    "medium",
    ["بوابات", "فحص"],
  ],
  [
    "CHK-003",
    "CHK",
    "قائمة تدقيق غرفة التحكم",
    "Control Room Audit Checklist",
    "جاهزية الشاشات والاتصالات وسجلات التشغيل.",
    "medium",
    ["غرفة التحكم", "تدقيق"],
  ],
  [
    "ERP-001",
    "ERP",
    "خطة الاستجابة لتسرب غاز",
    "Gas Leak Response Plan",
    "الإخلاء، العزل، الإبلاغ، ونقاط التجمع — تمرين نصف سنوي إلزامي.",
    "critical",
    ["تسرب", "غاز", "إخلاء"],
  ],
  [
    "ERP-002",
    "ERP",
    "خطة مواجهة الاقتحام المسلح",
    "Armed Intrusion Response",
    "بروتوكول الإغلاق والتحصين والتنسيق مع الجهات الأمنية.",
    "critical",
    ["اقتحام", "طوارئ"],
  ],
  [
    "ERP-003",
    "ERP",
    "خطة إخلاء المجمع السكني",
    "Compound Evacuation Plan",
    "مسارات الإخلاء وتعداد القاطنين وفق SEC-RC.",
    "high",
    ["إخلاء", "سكني", "sec-rc"],
  ],
];

export function buildKbSimulation(now: number) {
  const categories = KB_CATEGORIES.map(([code, name_ar, name_en, icon], i) => ({
    id: `sim-kbc-${code}`,
    code,
    name_ar,
    name_en,
    description_ar: null,
    description_en: null,
    sort_order: i + 1,
    icon,
  }));
  const articles = KB_ARTICLES.map(
    ([doc_code, cat, title_ar, title_en, summary_ar, risk, kw], i) => ({
      id: `sim-kba-${doc_code}`,
      doc_code,
      category_code: cat,
      title_ar,
      title_en,
      summary_ar,
      summary_en: title_en,
      description_ar: summary_ar,
      description_en: null,
      purpose_ar: `ضمان تنفيذ «${title_ar}» بصورة موحدة وقابلة للتدقيق عبر جميع مواقع المنطقة الغربية.`,
      purpose_en: null,
      scope_ar: "جميع مواقع إدارة الأمن الصناعي بالمنطقة الغربية والعاملين والمقاولين المصرح لهم.",
      scope_en: null,
      responsibilities_ar:
        "مدير الدائرة: الاعتماد · قائد الوردية: التنفيذ · ضابط الامتثال: التدقيق الدوري.",
      responsibilities_en: null,
      procedure_ar:
        "١. التحقق من الاشتراطات المسبقة.\n٢. تنفيذ الخطوات وفق التسلسل المعتمد.\n٣. التوثيق في سجل التشغيل.\n٤. الإبلاغ عن أي انحراف فورًا لغرفة التحكم.",
      procedure_en: null,
      requirements_ar: "معدات الوقاية الشخصية · تصريح ساري · تدريب معتمد خلال آخر 12 شهرًا.",
      requirements_en: null,
      risk_level: risk,
      priority: risk === "critical" ? "immediate" : risk === "high" ? "urgent" : "elevated",
      escalation_level: risk === "critical" ? "مدير المنطقة" : "مدير الدائرة",
      related_forms: cat === "SOP" ? ["FRM-001"] : [],
      related_policies: ["POL-001"],
      related_workflows: [],
      related_agents: [],
      keywords_ar: kw,
      keywords_en: kw,
      body_ar: `${summary_ar}\n\nيُطبق هذا المستند ضمن منظومة الامتثال لتوجيهات الهيئة العليا للأمن الصناعي، ويُراجع سنويًا أو عند صدور تحديث تنظيمي. جميع البيانات المعروضة محاكاة مرجعية موسومة is_simulation = true.`,
      body_en: null,
      version: "2.0",
      owner: "قسم الامتثال HCIS",
      review_date: iso(now + 180 * 24 * H),
      status: "published",
      updated_at: iso(now - (i + 3) * 26 * H),
    }),
  );
  return { categories, articles };
}

/* ── Integration connectors (/sec/integrations) ────────────────────────── */

export function buildConnectorsSimulation(now: number) {
  const C = [
    [
      "sap_pm",
      "SAP PM — الصيانة والأصول",
      "erp",
      "configured",
      "جاهز — أوامر العمل والإشعارات تتدفق تلقائيًا.",
      ["workorders.read", "notifications.write"],
      "OAuth2 + OData v4",
      22,
    ],
    [
      "m365",
      "Microsoft 365",
      "productivity",
      "error",
      "يتطلب تجديد الربط — انتهت صلاحية التفويض.",
      ["mail.read", "files.readwrite"],
      "Graph API via connector",
      190,
    ],
    [
      "power_bi",
      "Power BI",
      "bi",
      "configured",
      "جاهز — لوحات المؤشرات التنفيذية مضمنة.",
      ["reports.read"],
      "Service Principal",
      45,
    ],
    [
      "zatca",
      "هيئة الزكاة والضريبة — ZATCA",
      "api",
      "not_configured",
      "قيد التهيئة — بانتظار شهادة الختم الرقمي.",
      ["einvoice.submit"],
      "Fatoora API v2",
      null,
    ],
    [
      "nafath",
      "نفاذ الوطني الموحد",
      "identity",
      "configured",
      "جاهز — التحقق من هوية الزوار والمقاولين.",
      ["identity.verify"],
      "OpenID Connect",
      8,
    ],
    [
      "twilio",
      "Twilio SMS",
      "automation",
      "configured",
      "جاهز — رسائل التصعيد للقيادات.",
      ["sms.send"],
      "REST + HMAC",
      65,
    ],
    [
      "elevenlabs",
      "ElevenLabs — صوت آريا",
      "ai",
      "configured",
      "نشط — صوت ليان الحصري عبر الخادم.",
      ["tts.stream"],
      "Server-side API key",
      3,
    ],
    [
      "resend",
      "Resend — البريد التشغيلي",
      "automation",
      "configured",
      "نشط — تقارير الوردية اليومية.",
      ["email.send"],
      "REST API",
      140,
    ],
  ] as const;
  return C.map(([id, label, category, status, note, scopes, doc, syncMin]) => ({
    id,
    label,
    category,
    status,
    note,
    scopes: [...scopes],
    doc,
    last_sync_at: syncMin === null ? null : iso(now - (syncMin as number) * M),
  }));
}

/* ── Daily operations dataset (report engine fuel) ─────────────────────── */

/** Deterministic per-date PRNG so a report regenerates identically. */
function dateSeeded(dateKey: string) {
  let h = 2166136261;
  for (const ch of dateKey) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const OPS_INCIDENTS = [
  ["دخول غير مصرح عند السور الشمالي", "perimeter", "high"],
  ["إنذار حراري في غرفة المحولات", "fire", "critical"],
  ["تعطل كاميرا البوابة الرئيسية", "cctv", "medium"],
  ["مركبة متوقفة في منطقة محظورة", "access", "medium"],
  ["محاولة دخول ببطاقة منتهية", "access", "low"],
  ["انقطاع اتصال مستشعر اهتزاز", "sensors", "medium"],
  ["تجمهر عند بوابة المقاولين", "crowd", "high"],
  ["بلاغ فقدان بطاقة تعريف", "identity", "low"],
  ["رصد طائرة مسيّرة قرب المحيط", "airspace", "critical"],
] as const;
const OPS_WORKORDERS = [
  ["صيانة وقائية لكاميرات القطاع الغربي", "preventive"],
  ["استبدال وحدة تغذية بوابة الشحن", "corrective"],
  ["معايرة مستشعرات الحرارة — مبنى المحولات", "preventive"],
  ["إصلاح إنارة السور الجنوبي", "corrective"],
  ["فحص دوري لنظام كشف التسلل", "preventive"],
  ["تحديث برمجيات قارئات البطاقات", "preventive"],
  ["إصلاح حاجز مروري متعطل", "corrective"],
] as const;
const OPS_PERMITS = [
  ["أعمال ساخنة — لحام سياج", "hot_work", "high"],
  ["دخول مساحة مغلقة — خزان", "confined_space", "critical"],
  ["حفر بالقرب من كابلات", "excavation", "high"],
  ["أعمال على ارتفاع — برج إنارة", "work_at_height", "medium"],
  ["فصل تيار مجدول — صيانة", "electrical", "critical"],
] as const;

export type DailyOpsData = {
  date: string;
  source: "database" | "reference";
  incidents: Array<{
    ref: string;
    title_ar: string;
    category: string;
    severity: string;
    status: string;
    reported_at: string;
  }>;
  work_orders: Array<{
    ref: string;
    title_ar: string;
    kind: string;
    status: string;
    priority: string;
    opened_at: string;
  }>;
  permits: Array<{
    ref: string;
    work_type: string;
    contractor: string;
    risk_level: string;
    status: string;
    starts_at: string;
  }>;
  activity: Array<{ entity_ref: string; event: string; actor_name: string; occurred_at: string }>;
  trend7: Array<{ date: string; incidents: number; work_orders: number; permits: number }>;
};

export function buildDailyOpsSimulation(dateKey: string): DailyOpsData {
  const rnd = dateSeeded(dateKey);
  const base = new Date(`${dateKey}T05:00:00.000Z`).getTime();
  const pick = <T>(arr: readonly T[], n: number): T[] => {
    const copy = [...arr];
    const out: T[] = [];
    for (let i = 0; i < n && copy.length; i++)
      out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]!);
    return out;
  };
  const nInc = 3 + Math.floor(rnd() * 5);
  const nWo = 4 + Math.floor(rnd() * 4);
  const nPr = 3 + Math.floor(rnd() * 3);
  const incidents = pick(OPS_INCIDENTS, nInc).map(([title_ar, category, severity], i) => ({
    ref: `INC-${dateKey.replace(/-/g, "").slice(2)}-${101 + i}`,
    title_ar,
    category,
    severity,
    status: rnd() > 0.3 ? "resolved" : "open",
    reported_at: iso(base + Math.floor(rnd() * 16) * H),
  }));
  const work_orders = pick(OPS_WORKORDERS, nWo).map(([title_ar, kind], i) => ({
    ref: `WO-${dateKey.replace(/-/g, "").slice(2)}-${201 + i}`,
    title_ar,
    kind,
    status: rnd() > 0.4 ? "closed" : "in_progress",
    priority: rnd() > 0.6 ? "high" : "normal",
    opened_at: iso(base + Math.floor(rnd() * 14) * H),
  }));
  const CONTRACTORS = [
    "الإنشاءات الصناعية المتقدمة",
    "صيانة الشبكات الموحدة",
    "الحلول الكهروميكانيكية",
  ];
  const permits = pick(OPS_PERMITS, nPr).map(([work_type_ar, work_type, risk_level], i) => ({
    ref: `PTW-${dateKey.replace(/-/g, "").slice(2)}-${301 + i}`,
    work_type: `${work_type_ar}`,
    contractor: CONTRACTORS[Math.floor(rnd() * CONTRACTORS.length)]!,
    risk_level,
    status: rnd() > 0.25 ? "active" : "closed",
    starts_at: iso(base + Math.floor(rnd() * 10) * H),
    _kind: work_type,
  }));
  const EVENTS = [
    ["visitor_checked_in", "تسجيل دخول زائر"],
    ["patrol_completed", "اكتمال جولة أمنية"],
    ["gate_status_changed", "تغير حالة بوابة"],
    ["permit_verified", "التحقق من تصريح"],
    ["cctv_alert_ack", "معالجة تنبيه كاميرا"],
    ["hcis_audit_step", "خطوة تدقيق HCIS"],
  ] as const;
  const activity = fill(8 + Math.floor(rnd() * 8), (i) => {
    const [event] = EVENTS[Math.floor(rnd() * EVENTS.length)]!;
    return {
      entity_ref: `EVT-${400 + i}`,
      event,
      actor_name: ["نظام البوابات الآلي", "غرفة التحكم", "قائد الوردية", "دورية الصقر"][i % 4]!,
      occurred_at: iso(base + Math.floor(rnd() * 18) * H),
    };
  });
  const trend7 = fill(7, (i) => {
    const d = new Date(base - (6 - i) * 24 * H).toISOString().slice(0, 10);
    const r = dateSeeded(d);
    return {
      date: d,
      incidents: 3 + Math.floor(r() * 5),
      work_orders: 4 + Math.floor(r() * 4),
      permits: 3 + Math.floor(r() * 3),
    };
  });
  return {
    date: dateKey,
    source: "reference",
    incidents,
    work_orders,
    permits: permits.map(({ _kind, ...p }) => p),
    activity,
    trend7,
  };
}

/* ── Reports registry (/sec/reports) seeded rows ───────────────────────── */

export function buildReportsRegistrySimulation(now: number) {
  return fill(5, (i) => {
    const d = new Date(now - (i + 1) * 24 * H).toISOString().slice(0, 10);
    const pdf = i % 2 === 0;
    return {
      id: `sim-rep-${d}-${pdf ? "pdf" : "xlsx"}`,
      org_id: "00000000-0000-0000-0000-00000000d360",
      kind: "daily",
      format: pdf ? "pdf" : "xlsx",
      title: `تقرير العمليات اليومي — ${d}`,
      related_entity_type: null,
      related_entity_id: null,
      related_entity_ref: null,
      storage_path: null,
      size_bytes: pdf ? 88_000 - i * 3_500 : 34_000 + i * 1_200,
      range_from: `${d}T00:00:00.000Z`,
      range_to: null,
      generated_by: null,
      generated_by_name: "محرك المحاكاة المرجعية",
      created_at: iso(now - (i + 1) * 24 * H + 18 * H),
      meta: { simulated: true, date: d },
    };
  });
}

/* ── Smart command center (/command-center) ────────────────────────────── */

export type CommandSeverity = "critical" | "high" | "medium" | "healthy" | "idle";

export type CommandCenterState = {
  source: "database" | "reference";
  /** True whenever the DISPLAYED rows are simulation (reference build OR
      seeded rows flagged is_simulation) — the badge follows this, not
      source, so seeded data never masquerades as live (const. art. 6). */
  simulation: boolean;
  agents: Array<{
    id: string;
    name_ar: string;
    role: string;
    status: "active" | "processing" | "idle";
    task_ar: string | null;
    done_today: number;
    severity: CommandSeverity;
  }>;
  pipeline: Array<{
    id: string;
    title_ar: string;
    stage: "proposed" | "prepared" | "approved";
    severity: CommandSeverity;
    agent_ar: string;
    created_at: string;
  }>;
  urgent: Array<{
    id: string;
    title_ar: string;
    department: string;
    due_at: string;
    sla_hours: number;
    status: string;
  }>;
  regions: Array<{
    region_id: "central" | "western" | "eastern" | "southern";
    assets_active: number;
    incidents_open: number;
    compliance_pct: number;
    severity: CommandSeverity;
    last_pulse_at: string;
  }>;
  counters: {
    agents_active: number;
    proposals_pending: number;
    urgent_open: number;
    support_processing: number;
    done_today: number;
    compliance_avg: number;
  };
};

export function buildCommandCenterSimulation(now: number): CommandCenterState {
  const AGENTS: Array<
    [string, string, "active" | "processing" | "idle", string | null, number, CommandSeverity]
  > = [
    ["آريا التنفيذية", "التنسيق العام", "active", "توليد موجز القيادة الصباحي", 14, "healthy"],
    ["وكيل الامتثال HCIS", "الامتثال", "processing", "تدقيق SEC-18 لمحطات التحويل", 9, "medium"],
    ["وكيل الصيانة", "الصيانة", "active", "جدولة أوامر العمل الوقائية", 11, "healthy"],
    ["وكيل التقارير", "التقارير", "processing", "إعداد تقرير العمليات اليومي", 6, "medium"],
    ["وكيل الرصد", "المراقبة", "active", "تتبع 142 كاميرا عبر الإدارات", 22, "healthy"],
    ["وكيل التصاريح", "PTW", "active", "مطابقة تصاريح العمل السارية", 8, "healthy"],
    ["وكيل الطوارئ", "الاستجابة", "idle", null, 3, "idle"],
    ["وكيل المخاطر", "التنبؤ", "processing", "تحليل نمط إنذارات المحيط", 5, "high"],
  ];
  const agents = AGENTS.map(([name_ar, role, status, task_ar, done_today, severity], i) => ({
    id: `sim-ca-${i + 1}`,
    name_ar,
    role,
    status,
    task_ar,
    done_today,
    severity,
  }));

  const PIPELINE: Array<
    [string, "proposed" | "prepared" | "approved", CommandSeverity, string, number]
  > = [
    ["جدولة صيانة وقائية لمحطة 132 ك.ف", "proposed", "medium", "وكيل الصيانة", 26],
    ["تعليق تصريح عمل ساخن — رياح نشطة", "prepared", "high", "وكيل التصاريح", 48],
    ["إصدار التقرير الأسبوعي للقيادة", "prepared", "medium", "وكيل التقارير", 70],
    ["رفع تصنيف إنذار المحيط الشرقي", "proposed", "critical", "وكيل المخاطر", 15],
    ["تحديث قائمة تفتيش SEC-18", "approved", "medium", "وكيل الامتثال HCIS", 200],
    ["تعزيز دورية القطاع الجنوبي", "proposed", "high", "وكيل الرصد", 95],
    ["أرشفة بلاغات الأسبوع المغلقة", "approved", "healthy", "آريا التنفيذية", 260],
  ];
  const pipeline = PIPELINE.map(([title_ar, stage, severity, agent_ar, minAgo], i) => ({
    id: `sim-cp-${i + 1}`,
    title_ar,
    stage,
    severity,
    agent_ar,
    created_at: iso(now - minAgo * M),
  }));

  // Nine SLA items: mostly healthy, two approaching (high), ONE overdue
  // (critical) — the full scale shown with honest drama.
  const URGENT: Array<[string, string, number, number, string]> = [
    ["استعادة كاميرات القطاع الشرقي", "غرفة التحكم", -2.4, 24, "قيد المعالجة"],
    ["تجديد تصريح عمل حرج ينتهي اليوم", "الأمن الصناعي", 2.5, 24, "قيد المعالجة"],
    ["اعتماد خطة وردية الغد", "العمليات", 3.4, 12, "جديد"],
    ["فحص مستشعر اهتزاز متقطع", "الصيانة", 9, 48, "قيد المعالجة"],
    ["تحديث بيانات مقاول العزل", "العقود", 16, 72, "جديد"],
    ["مراجعة تقرير مناورة الإخلاء", "السلامة", 30, 96, "جديد"],
    ["تدقيق سجل زوار الأسبوع", "أمن البوابات", 41, 96, "جديد"],
    ["معايرة بوابة الشحن الذكية", "الصيانة", 55, 120, "جديد"],
    ["تحضير عرض الجاهزية الشهري", "مكتب القيادة", 88, 168, "جديد"],
  ];
  const urgent = URGENT.map(([title_ar, department, dueH, sla_hours, status], i) => ({
    id: `sim-cu-${i + 1}`,
    title_ar,
    department,
    due_at: iso(now + dueH * H),
    sla_hours,
    status,
  }));

  const REGIONS: Array<
    [
      "central" | "western" | "eastern" | "southern",
      number,
      number,
      number,
      CommandSeverity,
      number,
    ]
  > = [
    ["western", 96, 2, 97, "healthy", 4],
    ["central", 84, 1, 96, "healthy", 7],
    ["eastern", 71, 4, 92, "critical", 2],
    ["southern", 58, 1, 95, "medium", 11],
  ];
  const regions = REGIONS.map(
    ([region_id, assets_active, incidents_open, compliance_pct, severity, minAgo]) => ({
      region_id,
      assets_active,
      incidents_open,
      compliance_pct,
      severity,
      last_pulse_at: iso(now - minAgo * M),
    }),
  );

  return {
    source: "reference",
    agents,
    pipeline,
    simulation: true,
    urgent,
    regions,
    counters: {
      agents_active: agents.filter((a) => a.status !== "idle").length,
      proposals_pending: pipeline.filter((p) => p.stage !== "approved").length,
      urgent_open: urgent.filter((u) => u.status !== "مغلق").length,
      support_processing: 4,
      done_today: agents.reduce((s, a) => s + a.done_today, 0),
      compliance_avg: Math.round(
        regions.reduce((s, r) => s + r.compliance_pct, 0) / regions.length,
      ),
    },
  };
}
