// Nexios Cinematic Film Suite — 4 films (F1..F4) as a single parameterized composition.
// Each film: 28s @ 30fps, 1920x1080. Silent (captions on-screen).
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";
import { loadFont as loadTajawal } from "@remotion/google-fonts/Tajawal";

const cairo = loadCairo("normal", { weights: ["400", "700", "900"], subsets: ["arabic"] });
const tajawal = loadTajawal("normal", { weights: ["400", "700"], subsets: ["arabic"] });

export const FILM_FPS = 30;
export const FILM_WIDTH = 1920;
export const FILM_HEIGHT = 1080;
export const FILM_SECONDS = 28;
export const FILM_DURATION = FILM_FPS * FILM_SECONDS; // 840 frames

const AR_D = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
const toAr = (n: number | string) => String(n).replace(/[0-9]/g, (d) => AR_D[+d]);

interface FilmSpec {
  slug: string;
  title: string;
  eyebrow: string;
  accent: string; // primary accent hex
  accentSoft: string; // soft glow variant
  variant: "shock" | "blueprint" | "flow" | "gold";
  narrations: { text: string; kpi?: { value: number; suffix: string; label: string } }[];
  cta: string;
  smallPrint?: string;
}

const SPECS: Record<string, FilmSpec> = {
  f1: {
    slug: "f1",
    title: "صَدْمَةُ الوَاقِعِ التَّشْغِيلِيّ",
    eyebrow: "NEXIOS · FILM 01",
    accent: "#ef4444",
    accentSoft: "#7f1d1d",
    variant: "shock",
    narrations: [
      { text: "أَنْظِمَتُكَ كَثِيرَة… وَإِنْجَازُكَ قَلِيل. هَذِهِ فَوْضَى تَشْغِيلِيَّة." },
      { text: "بَيَانَاتُكَ فِي عَشَرَةِ أَنْظِمَة؟ نِيكْسُوس يُوَحِّدُهَا فِي مَكَانٍ وَاحِد.", kpi: { value: 40, suffix: "٪−", label: "زمن الوصول للمعلومة" } },
      { text: "الأَتْمَتَةُ الذَّكِيَّةُ تَتَوَلَّى المَهَامَّ اليَدَوِيَّة.", kpi: { value: 60, suffix: "٪−", label: "الجهد اليدوي" } },
      { text: "لَوْحَاتُ القِيَادَةِ اللَّحْظِيَّةُ تُجِيبُكَ الآن.", kpi: { value: 3, suffix: "×", label: "سرعة القرار" } },
      { text: "الذَّكَاءُ التَّنَبُّؤِيُّ يَكْشِفُ الأَخْطَاءَ قَبْلَ وُقُوعِهَا.", kpi: { value: 50, suffix: "٪−", label: "الأخطاء" } },
    ],
    cta: "ابدأ اليوم",
    smallPrint: "النسب مستهدفات قطاعية استرشادية · Vision 2030",
  },
  f2: {
    slug: "f2",
    title: "رِحْلَةٌ دَاخِلَ نِيكْسُوس",
    eyebrow: "NEXIOS · FILM 02",
    accent: "#22d3ee",
    accentSoft: "#164e63",
    variant: "blueprint",
    narrations: [
      { text: "مَرْحَبًا — أَنَا آرِيَا. دَعْنِي آخُذُكَ فِي جَوْلَةٍ دَاخِلَ نِيكْسُوس." },
      { text: "مِنْ شَاشَةٍ وَاحِدَة… تَدْخُلُ إِلَى مَرْكَزِ قِيَادَتِكَ الكَامِل." },
      { text: "اسْأَلْنِي بِصَوْتِكَ أَوْ بِكِتَابَتِكَ — أُجِيبُكَ لَحْظِيًّا." },
      { text: "كُلُّ إِدَارَةٍ لَهَا نَافِذَتُهَا — تُحَدَّثُ فِي الثَّانِيَة." },
      { text: "بِنَقْرَةٍ وَاحِدَة… تُشَغِّلُ عَمَلِيَّةً كَامِلَةً كَانَتْ تَسْتَغْرِقُ أَيَّامًا." },
    ],
    cta: "جرّبه الآن",
  },
  f3: {
    slug: "f3",
    title: "أَقْصَى اسْتِفَادَةٍ مِنْ نِيكْسُوس",
    eyebrow: "NEXIOS · FILM 03",
    accent: "#10b981",
    accentSoft: "#064e3b",
    variant: "flow",
    narrations: [
      { text: "تَمْلِكُ نِيكْسُوس؟ دَعْنِي أُرِيكَ كَيْفَ يَسْتَخْدِمُهُ المُحْتَرِفُون." },
      { text: "الأُولَى: افْتَحْ يَوْمَكَ بِلَوْحَةِ القِيَادَة — دَقِيقَتَانِ تُغْنِيَانِ عَنِ اجْتِمَاعِ سَاعَة." },
      { text: "الثَّانِيَة: فَعِّلِ التَّنْبِيهَاتِ الذَّكِيَّة — دَعِ النِّظَامَ يُرَاقِبُ لَك." },
      { text: "الثَّالِثَة: أَتْمِتِ المُتَكَرِّر — سَاعَةٌ اليَوْمَ… سَاعَةٌ غَدًا." },
      { text: "الرَّابِعَة: اسْأَلْنِي قَبْلَ كُلِّ قَرَار — أُعْطِيكَ الأَرْقَامَ الحَاسِمَة." },
    ],
    cta: "ابدأ صباح غد",
  },
  f4: {
    slug: "f4",
    title: "فَوَائِدُ تَتَحَدَّثُ بِالأَرْقَام",
    eyebrow: "NEXIOS · FILM 04",
    accent: "#f5b041",
    accentSoft: "#78350f",
    variant: "gold",
    narrations: [
      { text: "القَرَارَاتُ الكَبِيرَةُ تُبْنَى عَلَى الأَرْقَام… لَا الوُعُود." },
      { text: "كَفَاءَةٌ تَشْغِيلِيَّةٌ تَرْتَفِعُ حَتَّى ثَمَانِيَةٍ وَثَلَاثِينَ بِالمِئَة.", kpi: { value: 38, suffix: "٪+", label: "الكفاءة" } },
      { text: "إِنْجَازٌ أَسْرَعُ بِثَلَاثَةِ أَضْعَاف، وَأَخْطَاءٌ أَقَلُّ بِاثْنَيْنِ وَسِتِّينَ بِالمِئَة.", kpi: { value: 62, suffix: "٪−", label: "الأخطاء" } },
      { text: "رُؤْيَةٌ تَنْفِيذِيَّةٌ لَحْظِيَّة، وَامْتِثَالٌ مُؤَسَّسِيٌّ مِنَ اليَوْمِ الأَوَّل." },
      { text: "فَرِيقٌ يَعْمَلُ عَلَى مَا يَسْتَحِقُّ وَقْتَه." },
    ],
    cta: "اطلب عرضك التنفيذي",
    smallPrint: "مستهدفات استرشادية",
  },
};

/* --------- Shared cinematic layers --------- */

function FilmGrain() {
  const frame = useCurrentFrame();
  const flicker = 0.08 + Math.sin(frame * 0.7) * 0.02;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        mixBlendMode: "overlay",
        opacity: flicker,
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.7'/></svg>\")",
      }}
    />
  );
}

function Vignette() {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        boxShadow: "inset 0 0 400px 60px rgba(0,0,0,0.9)",
      }}
    />
  );
}

function BackgroundLayer({ spec }: { spec: FilmSpec }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / durationInFrames;

  if (spec.variant === "blueprint") {
    // cyan wireframe grid, subtle parallax
    const shift = interpolate(frame, [0, durationInFrames], [0, -80]);
    return (
      <AbsoluteFill style={{ backgroundColor: "#04070F", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: -100,
            backgroundImage: `linear-gradient(${spec.accent}22 1px, transparent 1px), linear-gradient(90deg, ${spec.accent}22 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
            transform: `perspective(900px) rotateX(58deg) translateY(${shift}px)`,
            transformOrigin: "center bottom",
          }}
        />
        <AbsoluteFill
          style={{
            background: `radial-gradient(55% 55% at 50% 45%, ${spec.accent}33 0%, transparent 65%)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (spec.variant === "flow") {
    return (
      <AbsoluteFill style={{ backgroundColor: "#04070F", overflow: "hidden" }}>
        {Array.from({ length: 32 }).map((_, i) => {
          const y = (i / 32) * 100;
          const speed = 0.6 + (i % 5) * 0.15;
          const x = ((p * 200 * speed + i * 11) % 140) - 20;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `${y}%`,
                left: `${x}%`,
                width: 260,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${spec.accent}, transparent)`,
                opacity: 0.55,
              }}
            />
          );
        })}
        <AbsoluteFill
          style={{
            background: `radial-gradient(60% 60% at 50% 50%, ${spec.accentSoft}55 0%, transparent 70%)`,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (spec.variant === "gold") {
    const glow = 0.4 + 0.3 * Math.abs(Math.sin(frame * 0.03));
    return (
      <AbsoluteFill style={{ backgroundColor: "#04070F", overflow: "hidden" }}>
        <AbsoluteFill
          style={{
            background: `radial-gradient(70% 70% at 50% 60%, ${spec.accent}33 0%, transparent 70%)`,
            opacity: glow,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(${spec.accent}12 1px, transparent 1px)`,
            backgroundSize: "100% 60px",
          }}
        />
      </AbsoluteFill>
    );
  }

  // shock (F1) — red pulse
  const pulse = 0.4 + 0.5 * Math.abs(Math.sin(frame * 0.12));
  return (
    <AbsoluteFill style={{ backgroundColor: "#04070F", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 40% at 50% 50%, ${spec.accent}55 0%, transparent 65%)`,
          opacity: pulse,
        }}
      />
    </AbsoluteFill>
  );
}

/* --------- Scenes --------- */

function TitleScene({ spec }: { spec: FilmSpec }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opa = spring({ frame, fps, config: { damping: 20, stiffness: 100 } });
  const y = interpolate(opa, [0, 1], [30, 0]);
  const bar = interpolate(frame, [15, 60], [0, 200], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        direction: "rtl",
        fontFamily: cairo.fontFamily,
      }}
    >
      <div style={{ textAlign: "center", opacity: opa, transform: `translateY(${y}px)` }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.55em",
            color: spec.accent,
            marginBottom: 32,
            fontWeight: 700,
          }}
        >
          {spec.eyebrow}
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: "#fff",
            lineHeight: 1.1,
            textShadow: `0 8px 60px ${spec.accent}55`,
            maxWidth: 1500,
          }}
        >
          {spec.title}
        </div>
        <div
          style={{
            marginTop: 40,
            height: 3,
            width: bar,
            marginInline: "auto",
            background: spec.accent,
            boxShadow: `0 0 20px ${spec.accent}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

function NarrationScene({
  spec,
  index,
  narration,
}: {
  spec: FilmSpec;
  index: number;
  narration: FilmSpec["narrations"][number];
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const exit = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opa = Math.min(enter, exit);
  const y = interpolate(enter, [0, 1], [40, 0]);

  const kpi = narration.kpi;
  const kpiEase = interpolate(frame, [10, 70], [0, 1], { extrapolateRight: "clamp" });
  const kpiValue = kpi ? Math.round(kpi.value * (1 - Math.pow(1 - kpiEase, 3))) : 0;

  return (
    <AbsoluteFill
      style={{
        direction: "rtl",
        fontFamily: cairo.fontFamily,
        padding: "80px 120px",
      }}
    >
      {/* index chip top-right */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 80,
          display: "flex",
          gap: 12,
          alignItems: "center",
          opacity: opa,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: spec.accent,
            boxShadow: `0 0 16px ${spec.accent}`,
          }}
        />
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: "0.3em" }}>
          {toAr(String(index + 1).padStart(2, "0"))} / {toAr("05")}
        </div>
      </div>

      {/* KPI ring */}
      {kpi && (
        <div
          style={{
            position: "absolute",
            top: "38%",
            right: "8%",
            transform: "translateY(-50%)",
            textAlign: "center",
            opacity: opa,
          }}
        >
          <div
            style={{
              fontSize: 300,
              fontWeight: 900,
              color: spec.accent,
              lineHeight: 1,
              textShadow: `0 0 60px ${spec.accent}, 0 0 140px ${spec.accent}66`,
              fontFamily: tajawal.fontFamily,
            }}
          >
            {toAr(kpiValue)}
            <span style={{ fontSize: 140 }}>{kpi.suffix}</span>
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 32,
              color: "#fff",
              opacity: 0.85,
              fontWeight: 700,
            }}
          >
            {kpi.label}
          </div>
        </div>
      )}

      {/* Caption bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 140,
          right: 120,
          left: 120,
          textAlign: "center",
          opacity: opa,
          transform: `translateY(${y}px)`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "8px 24px",
            fontSize: 20,
            letterSpacing: "0.4em",
            color: spec.accent,
            border: `1px solid ${spec.accent}55`,
            borderRadius: 999,
            marginBottom: 30,
            fontWeight: 700,
          }}
        >
          {spec.eyebrow}
        </div>
        <div
          style={{
            fontSize: kpi ? 56 : 72,
            fontWeight: 900,
            color: "#fff",
            lineHeight: 1.35,
            textShadow: "0 4px 24px rgba(0,0,0,0.9)",
            maxWidth: kpi ? 900 : 1600,
            marginInline: kpi ? "0" : "auto",
            marginRight: kpi ? "auto" : "auto",
          }}
        >
          {narration.text}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ClosingScene({ spec }: { spec: FilmSpec }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opa = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });
  const ctaOpa = spring({ frame: frame - 30, fps, config: { damping: 15, stiffness: 120 } });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        direction: "rtl",
        fontFamily: cairo.fontFamily,
      }}
    >
      <div style={{ textAlign: "center", opacity: opa }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.55em",
            color: spec.accent,
            fontWeight: 700,
            marginBottom: 28,
          }}
        >
          NEXIOS
        </div>
        <div
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: "#fff",
            lineHeight: 1.15,
            maxWidth: 1500,
            textShadow: `0 8px 60px ${spec.accent}55`,
          }}
        >
          {spec.title}
        </div>
        <div
          style={{
            marginTop: 48,
            display: "inline-block",
            padding: "22px 60px",
            fontSize: 44,
            fontWeight: 900,
            color: "#04070F",
            background: spec.accent,
            borderRadius: 999,
            boxShadow: `0 20px 80px -10px ${spec.accent}`,
            opacity: ctaOpa,
            transform: `scale(${interpolate(ctaOpa, [0, 1], [0.9, 1])})`,
          }}
        >
          {spec.cta}
        </div>
        {spec.smallPrint && (
          <div
            style={{
              marginTop: 40,
              fontSize: 18,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.15em",
            }}
          >
            {spec.smallPrint}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

/* --------- Composition --------- */

export const NexiosFilm: React.FC<{ slug: string }> = ({ slug }) => {
  const spec = SPECS[slug];
  if (!spec) return <AbsoluteFill style={{ background: "#000" }} />;

  const fps = FILM_FPS;
  const titleFrames = 4 * fps; // 4s
  const closingFrames = 4 * fps; // 4s
  const narrationTotal = FILM_DURATION - titleFrames - closingFrames; // 600
  const per = Math.floor(narrationTotal / spec.narrations.length); // 120 per scene (4s)

  return (
    <AbsoluteFill style={{ backgroundColor: "#04070F" }}>
      <BackgroundLayer spec={spec} />

      <Sequence from={0} durationInFrames={titleFrames}>
        <TitleScene spec={spec} />
      </Sequence>

      {spec.narrations.map((n, i) => (
        <Sequence
          key={i}
          from={titleFrames + i * per}
          durationInFrames={per}
        >
          <NarrationScene spec={spec} index={i} narration={n} />
        </Sequence>
      ))}

      <Sequence from={FILM_DURATION - closingFrames} durationInFrames={closingFrames}>
        <ClosingScene spec={spec} />
      </Sequence>

      <FilmGrain />
      <Vignette />
    </AbsoluteFill>
  );
};

export const NexiosFilmF1: React.FC = () => <NexiosFilm slug="f1" />;
export const NexiosFilmF2: React.FC = () => <NexiosFilm slug="f2" />;
export const NexiosFilmF3: React.FC = () => <NexiosFilm slug="f3" />;
export const NexiosFilmF4: React.FC = () => <NexiosFilm slug="f4" />;
