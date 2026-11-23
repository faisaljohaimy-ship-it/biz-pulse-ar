import type { Locale } from "@/lib/i18n";

export const IDENTITY_FILM_POSTER = {
  src: "/home/brand/sadeed-banner-clean-1600.webp",
  width: 1600,
  height: 533,
} as const;

/** Reviewed narration and scene order: media-production/sadeed-identity-20261123/. */
export const IDENTITY_FILMS = {
  ar: {
    film: "identityAr",
    src: "/media/identity/sadeed-identity-ar.mp4?v=fusha-20261123",
    duration: 74.366667,
    starts: [0, 11.27, 25.061, 35.715, 49.859, 61.365],
    captions: {
      src: "/media/identity/sadeed-identity-ar.vtt?v=fusha-20261123",
      language: "ar",
      label: "العربية",
    },
  },
  en: {
    film: "identityEn",
    src: "/media/identity/sadeed-identity-en.mp4",
    duration: 69.554717,
    starts: [0, 10.231, 24.625, 33.702, 46.989, 57.164],
    captions: { src: "/media/identity/sadeed-identity-en.vtt", language: "en", label: "English" },
  },
} as const;

export const IDENTITY_SCENES = [
  {
    id: "why",
    title: { ar: "لماذا سديد؟", en: "Why Sadeed?" },
    text: {
      ar: "في قِطاعِ الطّاقة، تبدأ الحمايةُ بِوُضوحِ الرُّؤية. معلوماتٌ تَصِلُ من مَواقِعَ وأَنْظِمةٍ مُتَعَدِّدة، وقراراتٌ تَحتاجُ إلى دَليلٍ، ومَسؤوليّةٍ واضِحة.",
      en: "In the energy sector, protection begins with a clear view. Information arrives from multiple sites and systems, while decisions need evidence and clear accountability.",
    },
  },
  {
    id: "platform",
    title: { ar: "سياق واحد", en: "One connected context" },
    text: {
      ar: "من هنا يأتي سَدِيد. مِنَصّةٌ لِدَعْمِ الأَمْنِ الصِّناعيّ، صُمِّمَتْ لِتَجمَعَ البلاغات والأُصول والمَخاطِر والإجراءات في سِياقٍ واحدٍ، يُساعِدُ المسؤولَ على فَهْمِ المَوقِف وتحديد ما يحتاج إلى مُتابَعة.",
      en: "That is the purpose of Sadeed: an industrial security platform designed to bring incidents, assets, risks, and actions into one connected context, helping decision-makers understand the situation and see what needs attention.",
    },
  },
  {
    id: "sources",
    title: { ar: "المصدر وحداثة البيانات", en: "Sources and freshness" },
    text: {
      ar: "ويقوم تصميمُ سَدِيد على رَبْطِ الحَدَث بموقعه وأثرِهِ المُحتَمَل، وإظهار المعلومة مع مَصدَرِها ووقت تحديثها، مَتى توافَرَتِ البياناتُ المُعتَمَدة.",
      en: "The platform is designed to link events to their locations and potential impact, showing the source and freshness of information when approved data is available.",
    },
  },
  {
    id: "ai",
    title: { ar: "ذكاء يدعم المسؤول", en: "Intelligence supporting people" },
    text: {
      ar: "وصُمِّمَتْ قُدراتُ الذَّكاءِ الاصطِناعيّ وقُدراتُ الوُكلاءِ المُتَخَصِّصين لِتَيسيرِ البَحث، وتَلخيصِ الأَدِلّة، وتَوضيحِ الأَوْلَوِيّات، واقْتِراحِ الخُطوةِ التّالية. ويَبقى اعتِمادُ القرار لدى المسؤول المُخَوَّل.",
      en: "Its AI capabilities and specialized agents are designed to support search, evidence summaries, priority explanations, and suggested next steps. Authorized people remain responsible for approving decisions.",
    },
  },
  {
    id: "clarity",
    title: { ar: "وضوح يختصر البحث", en: "Clarity that reduces searching" },
    text: {
      ar: "ولأنَّ الوَقْتَ يَصنَعُ الفَرق، صُمِّمَتْ تَجرِبةُ سَدِيد لِتَقليلِ خُطُواتِ البَحث، وإيصالِ المعلومة ذات الصِّلة بسُرعةٍ ووُضوح، مع بيانِ ما يحتاجُ إلى استكمال.",
      en: "Because time matters, Sadeed is designed to reduce searching and unnecessary steps, bringing relevant information forward clearly while showing what is still missing.",
    },
  },
  {
    id: "decision",
    title: { ar: "القرار والمسؤولية", en: "Decisions and accountability" },
    text: {
      ar: "ومن السؤال إلى التَّوصِية، ومن الاعتماد إلى مُتابَعَةِ الإجراء، صُمِّمَ المَسارُ ليبقى واضِحًا وقابِلًا للمراجعة. سَدِيد. رُؤيةٌ أَوضَح، وقرارٌ يَستَنِدُ إلى الدَّليل.",
      en: "From a question to a recommendation, and from approval to action tracking, the aim is a clear, reviewable process. Sadeed. A clearer view. Decisions grounded in evidence.",
    },
  },
] as const;

export function identitySceneAt(locale: Locale, seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  const starts = IDENTITY_FILMS[locale].starts;
  let scene = 0;
  for (let index = 1; index < starts.length && seconds >= starts[index]; index += 1) scene = index;
  return scene;
}

/** Language changes restart the corresponding scene; they never scale elapsed duration. */
export function mapIdentityPosition(from: Locale, to: Locale, seconds: number): number {
  return IDENTITY_FILMS[to].starts[identitySceneAt(from, seconds)];
}
