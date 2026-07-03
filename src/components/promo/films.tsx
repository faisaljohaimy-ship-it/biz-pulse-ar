// Scene builders for Nexios Cinematic Film Suite.
// Central place: each film's scenes + caption timings derived from narration array.
import type { Scene } from "@/components/promo/ScenePlayer";
import {
  BigCounter,
  CaptionBackdrop,
  ClosingLockup,
  TitleCard,
  type FilmDefinition,
} from "./FilmShell";

interface BuildOpts {
  slug: string;
  titleAr: string;
  subtitleAr?: string;
  cinematicTitle: string; // 3-4 word opening card
  accent: string;
  narrations: string[]; // captions per scene
  variants?: ("pulse" | "grid" | "flow" | "counter")[]; // per scene visual variant
  counters?: (null | { value: number; suffix: string; label?: string })[];
  cta?: string;
  smallPrint?: string;
  duration?: number;
}

export function buildFilm(o: BuildOpts): FilmDefinition {
  const totalDuration = o.duration ?? 85;
  const openSec = 4;
  const closeSec = 6;
  const narrSpan = totalDuration - openSec - closeSec;
  const per = narrSpan / o.narrations.length;

  const scenes: Scene[] = [];
  const captions: { start: number; end: number; text: string }[] = [];

  // Opening title card
  scenes.push({
    id: "title",
    start: 0,
    end: openSec,
    render: (p) => (
      <TitleCard
        progress={p}
        title={o.cinematicTitle}
        accent={o.accent}
        eyebrow={`Nexios · ${o.slug.toUpperCase()}`}
      />
    ),
  });

  // Narration scenes
  o.narrations.forEach((text, i) => {
    const start = openSec + i * per;
    const end = start + per;
    const variant = o.variants?.[i] ?? "pulse";
    const counter = o.counters?.[i] ?? null;
    scenes.push({
      id: `n-${i}`,
      start,
      end,
      render: (p) => (
        <>
          <CaptionBackdrop progress={p} accent={o.accent} variant={variant} />
          {counter && (
            <BigCounter
              progress={p}
              target={counter.value}
              suffix={counter.suffix}
              accent={o.accent}
              label={counter.label}
            />
          )}
        </>
      ),
    });
    captions.push({ start: start + 0.1, end: end - 0.15, text });
  });

  // Closing lockup
  scenes.push({
    id: "close",
    start: totalDuration - closeSec,
    end: totalDuration,
    render: (p) => (
      <ClosingLockup
        progress={p}
        title={o.cinematicTitle}
        accent={o.accent}
        cta={o.cta}
        smallPrint={o.smallPrint}
      />
    ),
  });

  return {
    slug: o.slug,
    titleAr: o.titleAr,
    subtitleAr: o.subtitleAr,
    accent: o.accent,
    duration: totalDuration,
    scenes,
    captions,
  };
}

/* ================= FILM 1 — Reality Shock ================= */
export const FILM_1 = buildFilm({
  slug: "f1",
  cinematicTitle: "صَدْمَةُ الوَاقِعِ التَّشْغِيلِيّ",
  titleAr: "صَدْمَةُ الوَاقِعِ التَّشْغِيلِيّ",
  subtitleAr: "من الفوضى التشغيلية إلى الذكاء المؤسسي — بالأرقام.",
  accent: "#ef4444",
  narrations: [
    "أَنْظِمَتُكَ كَثِيرَة… وَإِنْجَازُكَ قَلِيل. هَذِهِ لَيْسَتْ صُدْفَة — هَذِهِ فَوْضَى تَشْغِيلِيَّة.",
    "بَيَانَاتُكَ مُبَعْثَرَةٌ فِي عَشَرَةِ أَنْظِمَة؟ نِيكْسُوس يُوَحِّدُهَا فِي مَكَانٍ وَاحِد — وَقْتُ الوُصُولِ لِلْمَعْلُومَةِ يَنْخَفِضُ حَتَّى أَرْبَعِينَ بِالمِئَة.",
    "مُوَظَّفُوكَ يُكَرِّرُونَ مَهَامَّ يَدَوِيَّةً كُلَّ يَوْم؟ الأَتْمَتَةُ الذَّكِيَّةُ تَتَوَلَّاهَا — حَتَّى سِتِّينَ بِالمِئَةِ مِنَ الجُهْدِ اليَدَوِيِّ يَخْتَفِي.",
    "قَرَارَاتُكَ تَنْتَظِرُ تَقَارِيرَ الأُسْبُوعِ القَادِم؟ لَوْحَاتُ القِيَادَةِ اللَّحْظِيَّةُ تُجِيبُكَ الآن — سُرْعَةُ القَرَارِ تَتَضَاعَفُ ثَلَاثَ مَرَّات.",
    "الأَخْطَاءُ التَّشْغِيلِيَّةُ تُكَلِّفُكَ بِصَمْت؟ الذَّكَاءُ التَّنَبُّؤِيُّ يَكْشِفُهَا قَبْلَ وُقُوعِهَا — الأَخْطَاءُ تَنْخَفِضُ حَتَّى خَمْسِينَ بِالمِئَة.",
    "نَحْنُ فِي عَصْرِ الذَّكَاءِ الاصْطِنَاعِيّ — وَالنُّمُوُّ فِيهِ لِمَنْ يَتَحَرَّكُ أَوَّلًا. كُلُّ يَوْمِ تَأْخِيرٍ فُرْصَةٌ يَلْتَقِطُهَا غَيْرُك.",
    "نِيكْسُوس — إِنْجَازُ الأَعْمَالِ رَقَمِيًّا، مُوَاكَبَةً لِرُؤْيَةِ المَمْلَكَةِ أَلْفَيْنِ وَثَلَاثِين. اِبْدَأِ اليَوْم.",
  ],
  variants: ["pulse", "counter", "counter", "counter", "counter", "flow", "grid"],
  counters: [
    null,
    { value: 40, suffix: "٪−", label: "زمن الوصول" },
    { value: 60, suffix: "٪−", label: "الجهد اليدوي" },
    { value: 3, suffix: "×", label: "سرعة القرار" },
    { value: 50, suffix: "٪−", label: "الأخطاء" },
    null,
    null,
  ],
  cta: "ابدأ اليوم",
  smallPrint: "النسب مستهدفات قطاعية استرشادية",
});

/* ================= FILM 2 — Journey Inside Nexios ================= */
export const FILM_2 = buildFilm({
  slug: "f2",
  cinematicTitle: "رِحْلَةٌ دَاخِلَ نِيكْسُوس",
  titleAr: "رِحْلَةٌ دَاخِلَ نِيكْسُوس",
  subtitleAr: "جولة مع أريا في مركز القيادة الرقمي.",
  accent: "#22d3ee",
  duration: 82,
  narrations: [
    "مَرْحَبًا — أَنَا آرِيَا. دَعْنِي آخُذُكَ فِي جَوْلَةٍ دَاخِلَ نِيكْسُوس.",
    "مِنْ شَاشَةٍ وَاحِدَة… تَدْخُلُ إِلَى مَرْكَزِ قِيَادَتِكَ الكَامِل: المُؤَشِّرَات، المَهَامّ، وَالتَّنْبِيهَاتُ الحَيَّة.",
    "اسْأَلْنِي بِصَوْتِكَ أَوْ بِكِتَابَتِكَ — أُجِيبُكَ مِنْ بَيَانَاتِ مُؤَسَّسَتِكَ لَحْظِيًّا.",
    "كُلُّ إِدَارَةٍ لَهَا نَافِذَتُهَا — وَكُلُّ نَافِذَةٍ تُحَدَّثُ فِي الثَّانِيَة.",
    "وَبِنَقْرَةٍ وَاحِدَة… تُشَغِّلُ عَمَلِيَّةً كَامِلَةً كَانَتْ تَسْتَغْرِقُ أَيَّامًا.",
    "هَذَا نِيكْسُوس — نِظَامٌ يَعْمَلُ مَعَك، لَا نِظَامٌ تَعْمَلُ لَهُ. جَرِّبْهُ الآن.",
  ],
  variants: ["grid", "grid", "grid", "grid", "flow", "grid"],
  cta: "جرّبه الآن",
});

/* ================= FILM 3 — Power User Habits ================= */
export const FILM_3 = buildFilm({
  slug: "f3",
  cinematicTitle: "أَقْصَى اسْتِفَادَةٍ مِنْ نِيكْسُوس",
  titleAr: "أَقْصَى اسْتِفَادَةٍ مِنْ نِيكْسُوس",
  subtitleAr: "أربع عادات تصنع الفارق في الإنجاز.",
  accent: "#10b981",
  duration: 82,
  narrations: [
    "تَمْلِكُ نِيكْسُوس؟ إِذَنْ دَعْنِي أُرِيكَ كَيْفَ يَسْتَخْدِمُهُ المُحْتَرِفُون.",
    "العَادَةُ الأُولَى: افْتَحْ يَوْمَكَ بِلَوْحَةِ القِيَادَة — دَقِيقَتَانِ تُغْنِيَانِكَ عَنِ اجْتِمَاعِ سَاعَة.",
    "الثَّانِيَة: فَعِّلِ التَّنْبِيهَاتِ الذَّكِيَّة — لَا تُرَاقِبِ النِّظَام؛ دَعِ النِّظَامَ يُرَاقِبُ لَك.",
    "الثَّالِثَة: أَتْمِتِ المُتَكَرِّر — كُلُّ مَهَمَّةٍ تُؤَتْمِتُهَا اليَوْمَ سَاعَةٌ تَكْسِبُهَا غَدًا.",
    "الرَّابِعَة: اسْأَلْنِي قَبْلَ كُلِّ قَرَار — أُعْطِيكَ الأَرْقَامَ الَّتِي تَحْسِمُ النِّقَاش.",
    "أَرْبَعُ عَادَات… وَفَارِقٌ لَا يُقَاسُ فِي الإِنْجَاز. اِبْدَأْ بِالأُولَى صَبَاحَ غَد.",
  ],
  variants: ["flow", "flow", "pulse", "flow", "pulse", "flow"],
  cta: "ابدأ صباح غد",
});

/* ================= FILM 4 — Numbers Speak ================= */
export const FILM_4 = buildFilm({
  slug: "f4",
  cinematicTitle: "فَوَائِدُ تَتَحَدَّثُ بِالأَرْقَام",
  titleAr: "فَوَائِدُ تَتَحَدَّثُ بِالأَرْقَام",
  subtitleAr: "عائد استثماري بلغة مجلس الإدارة.",
  accent: "#f5b041",
  duration: 82,
  narrations: [
    "القَرَارَاتُ الكَبِيرَةُ لَا تُبْنَى عَلَى الوُعُود — بَلْ عَلَى الأَرْقَام. فَدَعُونَا نَتَحَدَّثُ بِالأَرْقَام.",
    "كَفَاءَةٌ تَشْغِيلِيَّةٌ تَرْتَفِعُ حَتَّى ثَمَانِيَةٍ وَثَلَاثِينَ بِالمِئَة.",
    "إِنْجَازٌ أَسْرَعُ بِثَلَاثَةِ أَضْعَاف، وَأَخْطَاءٌ أَقَلُّ بِاثْنَيْنِ وَسِتِّينَ بِالمِئَة.",
    "رُؤْيَةٌ تَنْفِيذِيَّةٌ لَحْظِيَّة، وَامْتِثَالٌ مُؤَسَّسِيٌّ مِنَ اليَوْمِ الأَوَّل.",
    "وَفَوْقَ ذَلِكَ كُلِّه: فَرِيقٌ يَعْمَلُ عَلَى مَا يَسْتَحِقُّ وَقْتَه.",
    "نِيكْسُوس — اسْتِثْمَارٌ يُثْبِتُ نَفْسَهُ بِالأَرْقَام. اِطْلُبْ عَرْضَكَ التَّنْفِيذِيَّ اليَوْم.",
  ],
  variants: ["pulse", "counter", "counter", "grid", "flow", "grid"],
  counters: [
    null,
    { value: 38, suffix: "٪+", label: "الكفاءة" },
    { value: 3, suffix: "×", label: "الإنجاز" },
    null,
    null,
    null,
  ],
  cta: "اطلب عرضك التنفيذي",
  smallPrint: "مستهدفات استرشادية",
});

export const FILMS: FilmDefinition[] = [FILM_1, FILM_2, FILM_3, FILM_4];
