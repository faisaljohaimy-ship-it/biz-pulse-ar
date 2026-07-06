/**
 * Executive Voice Tour narration — dual-field (display / tts) per stop.
 * `display` is UI text; `tts` is fully diacritized (Arabic) or plain (English)
 * text sent to the ARIA voice pipeline.
 */
import type { TourStop, TourLang } from "@/components/aria/AriaTourController";

const AR: readonly TourStop[] = [
  {
    id: "hero",
    anchorId: "tour-hero",
    display: "مرحبًا، أنا آريا. دعني أعرّفك بمنصة نكسيوس.",
    tts: "مَرْحَبًا، أَنَا آرْيَا. دَعْنِي أُعَرِّفُكَ بِمِنَصَّةِ نِكْسِيُوس.",
  },
  {
    id: "capabilities",
    anchorId: "tour-capabilities",
    display: "هذه مكوّنات المنصة الست، من الأمن الصناعي إلى التوأم الرقمي.",
    tts: "هَذِهِ مُكَوِّنَاتُ المِنَصَّةِ السِّتُّ، مِنَ الأَمْنِ الصِّنَاعِيِّ إِلَى التَّوْأَمِ الرَّقْمِيِّ.",
  },
  {
    id: "agents",
    anchorId: "tour-agents",
    display: "وكلاء ذكاء متخصصون يقترحون ويجهّزون، والقرار النهائي بشري دائمًا.",
    tts: "وُكَلَاءُ ذَكَاءٍ مُتَخَصِّصُونَ يَقْتَرِحُونَ وَيُجَهِّزُونَ، وَالقَرَارُ النِّهَائِيُّ بَشَرِيٌّ دَائِمًا.",
  },
  {
    id: "hajj",
    anchorId: "tour-hajj",
    display: "ومنصة نُسك الحج لإدارة العمليات الميدانية على نطاق واسع.",
    tts: "وَمِنَصَّةُ نُسُكِ الحَجِّ لِإِدَارَةِ العَمَلِيَّاتِ المَيْدَانِيَّةِ عَلَى نِطَاقٍ وَاسِعٍ.",
  },
  {
    id: "compliance",
    anchorId: "tour-compliance",
    display: "مبنية بامتثال كامل لنظام حماية البيانات الشخصية في المملكة.",
    tts: "مَبْنِيَّةٌ بِامْتِثَالٍ كَامِلٍ لِنِظَامِ حِمَايَةِ البَيَانَاتِ الشَّخْصِيَّةِ فِي المَمْلَكَةِ.",
  },
  {
    id: "closing",
    anchorId: "tour-closing",
    display: "أنا في خدمتك — ابدأ محادثة معي متى شئت.",
    tts: "أَنَا فِي خِدْمَتِكَ — اِبْدَأْ مُحَادَثَةً مَعِي مَتَى شِئْتَ.",
  },
] as const;

const EN: readonly TourStop[] = [
  {
    id: "hero",
    anchorId: "tour-hero",
    display: "Hello — I'm ARIA. Let me walk you through the NEXIOS platform.",
    tts: "Hello. I am ARIA. Let me walk you through the NEXIOS platform.",
  },
  {
    id: "capabilities",
    anchorId: "tour-capabilities",
    display: "These are the six platform capabilities, from Industrial Security to the Live Digital Twin.",
    tts: "These are the six platform capabilities, from industrial security to the live digital twin.",
  },
  {
    id: "agents",
    anchorId: "tour-agents",
    display: "Specialized AI agents propose and prepare — the final decision is always human.",
    tts: "Specialized A I agents propose and prepare. The final decision is always human.",
  },
  {
    id: "hajj",
    anchorId: "tour-hajj",
    display: "And the Hajj Nexus platform runs large-scale field operations.",
    tts: "And the Hajj Nexus platform runs large-scale field operations.",
  },
  {
    id: "compliance",
    anchorId: "tour-compliance",
    display: "Built with full compliance to Saudi Arabia's Personal Data Protection Law.",
    tts: "Built with full compliance to Saudi Arabia's Personal Data Protection Law.",
  },
  {
    id: "closing",
    anchorId: "tour-closing",
    display: "I'm at your service — start a conversation with me whenever you like.",
    tts: "I am at your service. Start a conversation with me whenever you like.",
  },
] as const;

export function tourStopsFor(lang: TourLang): readonly TourStop[] {
  return lang === "ar" ? AR : EN;
}
