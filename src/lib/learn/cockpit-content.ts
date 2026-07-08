/**
 * Golden-Reference Executive Cockpit content.
 *
 * The cockpit strip (decision timeline, incident replay, predictive
 * analytics, risk heat map, command-center links) is rendered for any
 * lesson that has content registered here. Every future Golden-Reference
 * lesson adds a bilingual entry to this map — no new components required.
 *
 * All strings are ready for RTL. Numeric series stay locale-neutral.
 */

export interface CockpitDecisionEvent {
  t: string;
  actor_ar: string;
  actor_en: string;
  decision_ar: string;
  decision_en: string;
  tone: "info" | "ok" | "warn" | "critical";
}

export interface CockpitReplayFrame {
  t_s: number;
  label_ar: string;
  label_en: string;
  detail_ar: string;
  detail_en: string;
  status: "ok" | "warn" | "critical";
}

export interface CockpitForecastPoint {
  label: string;
  actual?: number;
  forecast: number;
  lower?: number;
  upper?: number;
}

export interface CockpitRiskCell {
  x: number;
  y: number;
  value: number; // 0..1
  label_ar: string;
  label_en: string;
}

export interface CockpitLink {
  to: string;
  label_ar: string;
  label_en: string;
  hint_ar: string;
  hint_en: string;
}

export interface CockpitContent {
  timeline: CockpitDecisionEvent[];
  replay: {
    title_ar: string;
    title_en: string;
    frames: CockpitReplayFrame[];
  };
  forecast: {
    title_ar: string;
    title_en: string;
    unit_ar: string;
    unit_en: string;
    series: CockpitForecastPoint[];
    aria_insight_ar: string;
    aria_insight_en: string;
  };
  risk: {
    title_ar: string;
    title_en: string;
    cols: number;
    rows: number;
    cells: CockpitRiskCell[];
  };
  links: CockpitLink[];
}

export const COCKPIT_CONTENT: Record<string, CockpitContent> = {
  "digital-twin": {
    timeline: [
      {
        t: "06:14",
        actor_ar: "التوأم الرقمي",
        actor_en: "Digital twin",
        decision_ar: "رُصد اهتزاز غير طبيعي على المضخة V-207 — انحراف 12% عن الخط الأساس.",
        decision_en: "Abnormal vibration on pump V-207 detected — 12% deviation from baseline.",
        tone: "warn",
      },
      {
        t: "06:14",
        actor_ar: "آريا",
        actor_en: "ARIA",
        decision_ar: "طابقت النمط مع 71% من حالات فشل مضخات مماثلة خلال 24 ساعة.",
        decision_en: "Pattern matched to 71% of similar pump failures within 24h horizon.",
        tone: "info",
      },
      {
        t: "06:16",
        actor_ar: "قائد العمليات",
        actor_en: "Ops lead",
        decision_ar: "وافق على جدولة صيانة استباقية الليلة، وتحويل الحمل إلى الخط B.",
        decision_en: "Approved proactive maintenance tonight, load-shift to line B.",
        tone: "ok",
      },
      {
        t: "06:22",
        actor_ar: "التوأم الرقمي",
        actor_en: "Digital twin",
        decision_ar: "محاكاة الحمل الجديد: مخاطر التوقف تنخفض من 0.28 إلى 0.04.",
        decision_en: "Simulated new load: downtime risk drops from 0.28 to 0.04.",
        tone: "ok",
      },
      {
        t: "06:34",
        actor_ar: "الرئيس التنفيذي",
        actor_en: "CEO",
        decision_ar: "اعتُمد القرار — أُبلغ مجلس الإدارة عبر ARIA بموجز من ثلاث نقاط.",
        decision_en: "Decision approved — board briefed by ARIA with a 3-point summary.",
        tone: "ok",
      },
    ],
    replay: {
      title_ar: "إعادة تشغيل الحادث · تسرّب طفيف — الخط A",
      title_en: "Incident replay · minor leak — line A",
      frames: [
        {
          t_s: 0,
          label_ar: "T+0 ث",
          label_en: "T+0 s",
          detail_ar: "ضغط طبيعي 4.2 بار",
          detail_en: "Nominal pressure 4.2 bar",
          status: "ok",
        },
        {
          t_s: 12,
          label_ar: "T+12 ث",
          label_en: "T+12 s",
          detail_ar: "انحدار ضغط طفيف — 3.9 بار",
          detail_en: "Slight pressure drop — 3.9 bar",
          status: "warn",
        },
        {
          t_s: 24,
          label_ar: "T+24 ث",
          label_en: "T+24 s",
          detail_ar: "التوأم يرصد تسرباً — تنبيه ARIA",
          detail_en: "Twin flags leak — ARIA alert raised",
          status: "warn",
        },
        {
          t_s: 41,
          label_ar: "T+41 ث",
          label_en: "T+41 s",
          detail_ar: "احتواء افتراضي · تحويل الحمل مقترح",
          detail_en: "Virtual containment · load-shift proposed",
          status: "warn",
        },
        {
          t_s: 68,
          label_ar: "T+68 ث",
          label_en: "T+68 s",
          detail_ar: "فريق الميدان يصل — الحادث مطوّق",
          detail_en: "Field crew on-site — incident contained",
          status: "ok",
        },
        {
          t_s: 120,
          label_ar: "T+2 د",
          label_en: "T+2 min",
          detail_ar: "استعادة كاملة · لا تأثير على SLA",
          detail_en: "Full recovery · SLA unaffected",
          status: "ok",
        },
      ],
    },
    forecast: {
      title_ar: "توقع مخاطر التوقّف · 72 ساعة",
      title_en: "Downtime risk forecast · 72 h",
      unit_ar: "احتمال (0-1)",
      unit_en: "probability (0-1)",
      series: [
        { label: "T-24h", actual: 0.08, forecast: 0.08 },
        { label: "T-18h", actual: 0.09, forecast: 0.09 },
        { label: "T-12h", actual: 0.11, forecast: 0.11 },
        { label: "T-6h", actual: 0.14, forecast: 0.14 },
        { label: "Now", actual: 0.22, forecast: 0.22 },
        { label: "T+6h", forecast: 0.28, lower: 0.2, upper: 0.36 },
        { label: "T+12h", forecast: 0.34, lower: 0.24, upper: 0.44 },
        { label: "T+24h", forecast: 0.41, lower: 0.28, upper: 0.55 },
        { label: "T+48h", forecast: 0.36, lower: 0.22, upper: 0.52 },
        { label: "T+72h", forecast: 0.29, lower: 0.16, upper: 0.44 },
      ],
      aria_insight_ar:
        "آريا: تنفيذ الصيانة الليلة يُسقط الذروة المتوقعة عند +24 س من 0.41 إلى 0.09.",
      aria_insight_en:
        "ARIA: executing tonight's maintenance drops the +24h peak from 0.41 to 0.09.",
    },
    risk: {
      title_ar: "خريطة حرارية للمخاطر · الموقع الشمالي",
      title_en: "Risk heat map · North Site",
      cols: 8,
      rows: 5,
      cells: (() => {
        const cells: CockpitRiskCell[] = [];
        // Baseline noise
        for (let y = 0; y < 5; y++) {
          for (let x = 0; x < 8; x++) {
            cells.push({
              x,
              y,
              value: 0.05 + ((x * 13 + y * 7) % 17) / 100,
              label_ar: `قطاع ${String.fromCharCode(65 + y)}${x + 1}`,
              label_en: `Sector ${String.fromCharCode(65 + y)}${x + 1}`,
            });
          }
        }
        // Hotspots
        const hot: Array<[number, number, number]> = [
          [6, 1, 0.86], // pump V-207
          [1, 3, 0.62], // camera CCTV-03
          [4, 2, 0.44], // twin-flagged leak
          [7, 4, 0.38],
        ];
        for (const [x, y, v] of hot) {
          const cell = cells.find((c) => c.x === x && c.y === y);
          if (cell) cell.value = v;
        }
        return cells;
      })(),
    },
    links: [
      {
        to: "/digital-twin",
        label_ar: "افتح التوأم الرقمي المباشر",
        label_en: "Open live digital twin",
        hint_ar: "المشهد التنفيذي الكامل ثلاثي الأبعاد",
        hint_en: "Full executive 3D scene",
      },
      {
        to: "/command-center",
        label_ar: "مركز القيادة",
        label_en: "Command center",
        hint_ar: "الحوادث والدوريات والأصول لحظياً",
        hint_en: "Incidents, patrols, assets — live",
      },
      {
        to: "/executive",
        label_ar: "لوحة الرئيس التنفيذي",
        label_en: "Executive dashboard",
        hint_ar: "المؤشرات والقرارات والمالية",
        hint_en: "KPIs, decisions, financials",
      },
    ],
  },
};

export function getCockpitContent(slug: string): CockpitContent | null {
  return COCKPIT_CONTENT[slug] ?? null;
}
