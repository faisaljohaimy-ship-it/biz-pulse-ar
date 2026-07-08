/**
 * Executive Voice Tour narration — 10-stop bilingual script.
 * Dual-field per stop: `display` is UI text; `tts` is the
 * fully-diacritized (Arabic) or plain (English) string sent to the
 * ARIA voice pipeline. The pipeline is the SAME shared TTS route
 * `/api/public/aria-tts` — which imports `ARIA_ELEVENLABS_VOICE_ID`
 * from `@/lib/aria/voice-config`, the same voice ID the ARIA chatbot
 * uses. Never introduce a second voice source here.
 */
import type { TourStop, TourLang } from "@/components/aria/AriaTourController";

const AR: readonly TourStop[] = [
  {
    id: "hero",
    anchorId: "tour-hero",
    display: "مرحبًا، أنا آريا، مساعدتك التنفيذية. دعني أصحبك في جولة داخل منصة نكسيوس.",
    tts: "مَرْحَبًا، أَنَا آرْيَا، مُسَاعِدَتُكَ التَّنْفِيذِيَّةُ. دَعْنِي أَصْحَبُكَ فِي جَوْلَةٍ دَاخِلَ مِنَصَّةِ نِكْسِيُوس.",
  },
  {
    id: "positioning",
    anchorId: "tour-positioning",
    display:
      "نكسيوس منصة إنجاز الأعمال التنفيذية — تكامل واحد يجمع عملياتك وأنظمتك وذكاءك التنفيذي.",
    tts: "نِكْسِيُوس مِنَصَّةُ إِنْجَازِ الأَعْمَالِ التَّنْفِيذِيَّةِ — تَكَامُلٌ وَاحِدٌ يَجْمَعُ عَمَلِيَّاتِكَ وَأَنْظِمَتَكَ وَذَكَاءَكَ التَّنْفِيذِيَّ.",
  },
  {
    id: "pillar-security",
    anchorId: "tour-pillar-security",
    display: "الأمن الصناعي: حوادث ودوريات وتصاريح وزوار في منصة موحّدة.",
    tts: "الأَمْنُ الصِّنَاعِيُّ: حَوَادِثُ وَدَوْرِيَّاتٌ وَتَصَارِيحُ وَزُوَّارٌ فِي مِنَصَّةٍ مُوَحَّدَةٍ.",
  },
  {
    id: "pillar-agents",
    anchorId: "tour-pillar-agents",
    display: "أكثر من أربعة عشر وكيلًا تنفيذيًا يقترحون ويجهّزون — والقرار النهائي بشري دائمًا.",
    tts: "أَكْثَرُ مِنْ أَرْبَعَةَ عَشَرَ وَكِيلًا تَنْفِيذِيًّا يَقْتَرِحُونَ وَيُجَهِّزُونَ — وَالقَرَارُ النِّهَائِيُّ بَشَرِيٌّ دَائِمًا.",
  },
  {
    id: "pillar-twin",
    anchorId: "tour-pillar-twin",
    display: "التوأم الرقمي الحي: تحديث لحظي للأصول والمواقع عبر نبض المؤسسة.",
    tts: "التَّوْأَمُ الرَّقْمِيُّ الحَيُّ: تَحْدِيثٌ لَحْظِيٌّ لِلأُصُولِ وَالمَوَاقِعِ عَبْرَ نَبْضِ المُؤَسَّسَةِ.",
  },
  {
    id: "pillar-reports",
    anchorId: "tour-pillar-reports",
    display: "تقارير تنفيذية بمؤشرات أداء وذاكرة إنتاجية، تصلك حيث تعمل.",
    tts: "تَقَارِيرُ تَنْفِيذِيَّةٌ بِمُؤَشِّرَاتِ أَدَاءٍ وَذَاكِرَةٍ إِنْتَاجِيَّةٍ، تَصِلُكَ حَيْثُ تَعْمَلُ.",
  },
  {
    id: "pillar-hajj",
    anchorId: "tour-pillar-hajj",
    display: "ومنصة نُسك الحج: إدارة العمليات الميدانية لموسم ألف وأربعمئة وسبعة وأربعين.",
    tts: "وَمِنَصَّةُ نُسُكِ الحَجِّ: إِدَارَةُ العَمَلِيَّاتِ المَيْدَانِيَّةِ لِمَوْسِمِ أَلْفٍ وَأَرْبَعِمِئَةٍ وَسَبْعَةٍ وَأَرْبَعِينَ.",
  },
  {
    id: "pillar-aria",
    anchorId: "tour-pillar-aria",
    display: "وأنا آريا: محرك تنفيذي ثنائي اللغة، بصوت طبيعي وذاكرة حية.",
    tts: "وَأَنَا آرْيَا: مُحَرِّكٌ تَنْفِيذِيٌّ ثُنَائِيُّ اللُّغَةِ، بِصَوْتٍ طَبِيعِيٍّ وَذَاكِرَةٍ حَيَّةٍ.",
  },
  {
    id: "compliance",
    anchorId: "tour-compliance",
    display: "مبنية بامتثال كامل لنظام حماية البيانات الشخصية، وتكاملات مؤسسية على خارطة الطريق.",
    tts: "مَبْنِيَّةٌ بِامْتِثَالٍ كَامِلٍ لِنِظَامِ حِمَايَةِ البَيَانَاتِ الشَّخْصِيَّةِ، وَتَكَامُلَاتٌ مُؤَسَّسِيَّةٌ عَلَى خَارِطَةِ الطَّرِيقِ.",
  },
  {
    id: "closing",
    anchorId: "tour-closing",
    display: "انتهت الجولة. أنا في خدمتك — ابدأ محادثة معي، أو ادخل مركز القيادة الآن.",
    tts: "اِنْتَهَتِ الجَوْلَةُ. أَنَا فِي خِدْمَتِكَ — اِبْدَأْ مُحَادَثَةً مَعِي، أَوِ ادْخُلْ مَرْكَزَ القِيَادَةِ الآنَ.",
  },
] as const;

const EN: readonly TourStop[] = [
  {
    id: "hero",
    anchorId: "tour-hero",
    display:
      "Hello — I'm ARIA, your executive assistant. Let me walk you through the NEXIOS platform.",
    tts: "Hello. I am ARIA, your executive assistant. Let me walk you through the NEXIOS platform.",
  },
  {
    id: "positioning",
    anchorId: "tour-positioning",
    display:
      "NEXIOS is the Executive Delivery Platform — one integration that unifies your operations, systems, and executive intelligence.",
    tts: "NEXIOS is the Executive Delivery Platform. One integration that unifies your operations, systems, and executive intelligence.",
  },
  {
    id: "pillar-security",
    anchorId: "tour-pillar-security",
    display: "Industrial Security: incidents, patrols, permits, and visitors on a unified surface.",
    tts: "Industrial Security. Incidents, patrols, permits, and visitors on a unified surface.",
  },
  {
    id: "pillar-agents",
    anchorId: "tour-pillar-agents",
    display:
      "More than fourteen executive AI agents propose and prepare — the final decision is always human.",
    tts: "More than fourteen executive A I agents propose and prepare. The final decision is always human.",
  },
  {
    id: "pillar-twin",
    anchorId: "tour-pillar-twin",
    display: "Live Digital Twin: real-time pulse of assets and sites across the enterprise.",
    tts: "Live Digital Twin. Real-time pulse of assets and sites across the enterprise.",
  },
  {
    id: "pillar-reports",
    anchorId: "tour-pillar-reports",
    display: "Executive reports with KPIs and production memory, delivered where you work.",
    tts: "Executive reports with K P Is and production memory, delivered where you work.",
  },
  {
    id: "pillar-hajj",
    anchorId: "tour-pillar-hajj",
    display: "And the Hajj Nexus platform: field operations management for the 1447 season.",
    tts: "And the Hajj Nexus platform. Field operations management for the fourteen forty-seven season.",
  },
  {
    id: "pillar-aria",
    anchorId: "tour-pillar-aria",
    display: "And I am ARIA: a bilingual executive engine with a natural voice and live memory.",
    tts: "And I am ARIA. A bilingual executive engine with a natural voice and live memory.",
  },
  {
    id: "compliance",
    anchorId: "tour-compliance",
    display:
      "Built with full compliance to the Personal Data Protection Law, with enterprise integrations on the roadmap.",
    tts: "Built with full compliance to the Personal Data Protection Law, with enterprise integrations on the roadmap.",
  },
  {
    id: "closing",
    anchorId: "tour-closing",
    display:
      "The tour has ended. I'm at your service — start a conversation with me, or enter the Command Center now.",
    tts: "The tour has ended. I am at your service. Start a conversation with me, or enter the Command Center now.",
  },
] as const;

export function tourStopsFor(lang: TourLang): readonly TourStop[] {
  return lang === "ar" ? AR : EN;
}
