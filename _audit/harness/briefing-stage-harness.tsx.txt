import { createRoot } from "react-dom/client";
import { BriefingStage } from "@/components/bridge/BriefingStage";
import "@/styles.css";

const PHASE =
  new URLSearchParams(location.search).get("phase") === "recommendation"
    ? "recommendation"
    : "segments";

const mk = (measured: boolean) => ({
  // **المقاطع تُرسَم فعلًا.** كانت `segments: []` و`total_seconds: 0`،
  // فـ`done` صحيحٌ من أوّل إطار ومسرحُ المقاطع لا يُرسَم إطلاقًا — وهو
  // منبع التجاوز عند 390 (عنوان `text-3xl sm:text-4xl` وشبكةُ شارات).
  // فالقياس كان يغطّي بطاقة التوصية وحدها ويُقرأ تغطيةً للمكوّن كلّه.
  total_seconds: PHASE === "recommendation" ? 0 : 60,
  generated_at: new Date().toISOString(),
  segments: [
    {
      at: 0,
      speaker_id: "sadeed",
      speaker_name: "سَدِيد",
      text_ar:
        "الوضع التشغيلي مستقر. لدينا 12 بلاغًا مفتوحًا منها 3 حرجة، و4 دوريات نشطة، وتصريح واحد عالي الخطورة سارٍ في المنطقة الشرقية.",
      text_en:
        "Posture is stable. 12 open incidents (3 critical), 4 active patrols, 1 high-risk permit in effect across the eastern region.",
      badges: [
        { label: "Open Incidents", value: "12" },
        { label: "Active Patrols", value: "4" },
        { label: "High-Risk Permits", value: "1" },
      ],
    },
  ],
  recommendation: {
    title_ar: "تعزيز الدوريات في المنطقة الشرقية خلال الأربع والعشرين ساعة القادمة",
    title_en: "Reinforce eastern-region patrols over the next twenty-four hours",
    rationale_ar:
      "بناءً على 12 بلاغًا مفتوحًا و4 دوريات نشطة و1 تصريح عالي الخطورة، يُوصى بالتنسيق المباشر بين قيادة الحوادث والدوريات.",
    rationale_en:
      "Based on 12 open incidents, 4 active patrols and 1 high-risk permit, coordinate incident command with patrol leads.",
    confidence: measured
      ? {
          measured: true as const,
          value: "derived" as const,
          confidence: "derived" as const,
          evidence: [
            {
              kind: "db.query" as const,
              source: "sec_incidents,sec_patrols,sec_permits",
              observedAt: new Date().toISOString(),
            },
          ],
        }
      : { measured: false as const, reason: "لا مشاهدات تشغيلية مرصودة — لا يمكن إثبات درجة ثقة" },
    horizon_hours: 24,
  },
});

const params = new URLSearchParams(location.search);
// المكوّن طوران: مسرحُ المقاطع قبل `done`، وبطاقةُ التوصية بعده. وقياسُ
// أحدهما يُقرأ قياسًا للمكوّن كلّه، فيُقاس كلٌّ صراحةً.
const ar = params.get("lang") !== "en";
const measured = params.get("state") !== "unmeasured";
document.documentElement.dir = ar ? "rtl" : "ltr";
document.documentElement.lang = ar ? "ar" : "en";

createRoot(document.getElementById("root")!).render(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <BriefingStage briefing={mk(measured) as any} ar={ar} onClose={() => {}} backTo={{ ar: "رجوع", en: "Back" }} />,
);
