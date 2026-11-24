/** Approved bilingual script; the canonical voice recording is not yet available. */
export const TWIN_NARRATION_AVAILABLE: boolean = false;

export const TWIN_NARRATION = {
  available: TWIN_NARRATION_AVAILABLE,
  voiceRate: 1.25,
  scripts: {
    ar: [
      {
        id: "s1",
        start: 0.5,
        end: 7.7,
        text: "محطات الطاقة لا تنام، وحمايتها تبدأ برُؤية واضحة.",
      },
      {
        id: "s2",
        start: 8.2,
        end: 23.7,
        text: "من توليد الكهرباء، ورفع الجُهد، إلى نقلها وخفض الجهد ثم توزيعها؛ كل مرحلة تحتاج متابعة تحافظ على سلامة الموقع واستمرار الخدمة.",
      },
      {
        id: "s3",
        start: 24.2,
        end: 37.7,
        text: "ترتبط البوابات والكاميرات والدوريات بغرفة التحكم. وعندما تتوفر التكاملات والبيانات المُصرَّح بها، تساعد هذه الرؤية فريق الأمن على فهم الحدث واتخاذ القرار.",
      },
      {
        id: "s4",
        start: 38.2,
        end: 49.7,
        text: "في هذا التصور، يربط التَّوأم الرَّقمي الأصول بالمعلومات المتاحة، ويعرض التنبيهات لتقييمها. يساند الفريق، واعتماد الإجراءات بيد الإنسان.",
      },
      {
        id: "s5",
        start: 50.2,
        end: 55.9,
        text: "سَديد. قرار أدق، وإنجاز أسرع. مشاهد توضيحية، وليست بثًّا حيًّا.",
      },
    ],
    en: [
      {
        id: "s1",
        start: 0.5,
        end: 7.7,
        text: "Energy never sleeps. Protecting it begins with a clear view.",
      },
      {
        id: "s2",
        start: 8.2,
        end: 23.7,
        text: "From generation and higher voltage, through transmission, lower voltage and distribution, every stage needs careful oversight to protect the site and keep essential services running.",
      },
      {
        id: "s3",
        start: 24.2,
        end: 37.7,
        text: "Gates, cameras and patrols connect with the control room. Where authorized data and integrations are available, this shared view helps security teams understand events and make informed decisions.",
      },
      {
        id: "s4",
        start: 38.2,
        end: 49.7,
        text: "In this concept, the digital twin links assets with available information and presents alerts for review. It supports the team; people authorize the actions.",
      },
      {
        id: "s5",
        start: 50.2,
        end: 55.9,
        text: "Sadeed. Smarter decisions. Faster execution. Illustrative scenes, not a live feed.",
      },
    ],
  },
} as const;

/** Authored subtitles timed to the scenes of the original 56-second film. */
export const TWIN_SCENE_SUBTITLES = {
  ar: {
    src: "/media/twin/script/sadeed-twin-ar.vtt",
    language: "ar",
    label: "نص المشاهد",
    default: true,
  },
  en: {
    src: "/media/twin/script/sadeed-twin-en.vtt",
    language: "en",
    label: "Scene script",
    default: true,
  },
} as const;

/** Until genuine recordings are verified, retain the original picture/audio.
 * Never point a player at an ungenerated narrated file or label original music
 * as SADEED narration. These fallbacks are not narration delivery receipts. */
export const TWIN_NARRATED_FILMS = {
  ar: { film: "twin", captions: undefined },
  en: { film: "twin", captions: undefined },
} as const;
