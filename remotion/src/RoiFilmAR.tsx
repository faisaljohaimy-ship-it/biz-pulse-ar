import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import roiDur from "../public/audio/roi-durations.json";
import roiEn from "../public/audio/roi-en.json";

export const ROI_FPS = 30;
const PAD = 0.45;

const cairo = `'Cairo','Tajawal','Noto Sans Arabic',sans-serif`;
const inter = `'Inter','SF Pro Display',sans-serif`;

const AR = [
  "كل دقيقة تأخير في القرار التنفيذي تُكلِّف المؤسسات ملايين الريالات.",
  "نِكسيوس يُحوِّل البيانات الخام إلى قرارٍ مدعومٍ بالأدلة، في ثوانٍ معدودة.",
  "تخفيضٌ بنسبة اثنين وأربعين بالمئة في زمن اتخاذ القرار التنفيذي.",
  "خفضٌ بنسبة ثمانية وثلاثين بالمئة في التكاليف التشغيلية المُهدَرة سنوياً.",
  "ارتفاعٌ بنسبة واحدٍ وستين بالمئة في إنتاجية الفرق التنفيذية.",
  "عائدٌ على الاستثمار يتجاوز أربعمئةٍ وعشرين بالمئة خلال أول اثني عشر شهراً.",
  "استرداد كامل لكلفة التطبيق في أقل من خمسة أشهر تشغيلية.",
  "تكامل أصيل مع ساب، ومايكروسوفت، وأوراكل، يحمي استثماراتك القائمة ويضاعف قيمتها.",
  "حوكمةٌ، وامتثالٌ، وسجل تدقيق كامل. كل ريال يُنفَق… يُرى، ويُقاس، ويُبرَّر.",
  "نِكسيوس… ليس مصروفاً تقنياً. بل أصلٌ استراتيجي يصنع الميزة التنافسية القادمة.",
];

type Seg = {
  audio: string;
  dur: number;
  image: string;
  ar: string;
  en: string;
  section: string;
  caption: string;
  metric?: {
    value: string;
    unit: string;
    label_ar: string;
    label_en: string;
    tone: "gold" | "emerald" | "cyan";
  };
};

const SEGS: Seg[] = [
  {
    audio: "audio/roi-00.mp3",
    dur: roiDur[0],
    image: "film/06-skyline.jpg",
    ar: AR[0],
    en: roiEn[0],
    section: "PART 01 · THE COST OF DELAY",
    caption: "Decision latency = lost millions",
  },
  {
    audio: "audio/roi-01.mp3",
    dur: roiDur[1],
    image: "tour/03-intelligence.png",
    ar: AR[1],
    en: roiEn[1],
    section: "PART 02 · DATA TO DECISION",
    caption: "Evidence-backed in seconds",
  },
  {
    audio: "audio/roi-02.mp3",
    dur: roiDur[2],
    image: "tour/04-decisions.png",
    ar: AR[2],
    en: roiEn[2],
    section: "PART 03 · IMPACT",
    caption: "Decision time",
    metric: {
      value: "42",
      unit: "%",
      label_ar: "تخفيض زمن القرار",
      label_en: "Decision time reduction",
      tone: "gold",
    },
  },
  {
    audio: "audio/roi-03.mp3",
    dur: roiDur[3],
    image: "tour/10-analytics.png",
    ar: AR[3],
    en: roiEn[3],
    section: "PART 03 · IMPACT",
    caption: "Operating cost",
    metric: {
      value: "38",
      unit: "%",
      label_ar: "خفض التكاليف المُهدَرة",
      label_en: "Wasted operating cost cut",
      tone: "emerald",
    },
  },
  {
    audio: "audio/roi-04.mp3",
    dur: roiDur[4],
    image: "tour/02-cockpit.png",
    ar: AR[4],
    en: roiEn[4],
    section: "PART 03 · IMPACT",
    caption: "Productivity lift",
    metric: {
      value: "61",
      unit: "%",
      label_ar: "إنتاجية الفرق التنفيذية",
      label_en: "Executive team productivity",
      tone: "cyan",
    },
  },
  {
    audio: "audio/roi-05.mp3",
    dur: roiDur[5],
    image: "tour/11-briefing.png",
    ar: AR[5],
    en: roiEn[5],
    section: "PART 04 · ROI",
    caption: "Return on investment",
    metric: {
      value: "420",
      unit: "%",
      label_ar: "العائد على الاستثمار · ١٢ شهر",
      label_en: "ROI · first 12 months",
      tone: "gold",
    },
  },
  {
    audio: "audio/roi-06.mp3",
    dur: roiDur[6],
    image: "tour/08-boardroom.png",
    ar: AR[6],
    en: roiEn[6],
    section: "PART 04 · ROI",
    caption: "Payback period",
    metric: {
      value: "< 5",
      unit: "mo",
      label_ar: "فترة استرداد رأس المال",
      label_en: "Full payback period",
      tone: "emerald",
    },
  },
  {
    audio: "audio/roi-07.mp3",
    dur: roiDur[7],
    image: "tour/06-integrations.png",
    ar: AR[7],
    en: roiEn[7],
    section: "PART 05 · INVESTMENT PROTECTION",
    caption: "SAP · Microsoft · Oracle",
  },
  {
    audio: "audio/roi-08.mp3",
    dur: roiDur[8],
    image: "tour/09-governance.png",
    ar: AR[8],
    en: roiEn[8],
    section: "PART 06 · GOVERNED VALUE",
    caption: "Every riyal seen, measured, justified",
  },
  {
    audio: "audio/roi-09.mp3",
    dur: roiDur[9],
    image: "film/04-boardroom.jpg",
    ar: AR[9],
    en: roiEn[9],
    section: "NEEXIOS · neexios.com",
    caption: "A strategic asset, not an IT expense",
  },
];

const SEG_FRAMES = SEGS.map((s) => Math.round((s.dur + PAD) * ROI_FPS));
const STARTS: number[] = SEG_FRAMES.reduce<number[]>((a, _, i) => {
  a.push(i === 0 ? 0 : a[i - 1] + SEG_FRAMES[i - 1]);
  return a;
}, []);
export const ROI_DURATION = STARTS[STARTS.length - 1] + SEG_FRAMES[SEG_FRAMES.length - 1] + 60;

const TONE = {
  gold: { fg: "#FFD24A", from: "#FFD24A", to: "#FF9500" },
  emerald: { fg: "#34D399", from: "#34D399", to: "#059669" },
  cyan: { fg: "#67E8F9", from: "#67E8F9", to: "#0891B2" },
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.78) 100%)",
      pointerEvents: "none",
    }}
  />
);
const FilmGrain: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px)",
      mixBlendMode: "overlay",
      pointerEvents: "none",
    }}
  />
);
const LetterBox: React.FC = () => (
  <>
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        background: "#000",
        zIndex: 10,
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: "#000",
        zIndex: 10,
      }}
    />
  </>
);

const MetricCard: React.FC<{ m: NonNullable<Seg["metric"]>; segFrame: number; fps: number }> = ({
  m,
  segFrame,
  fps,
}) => {
  const t = TONE[m.tone];
  const ease = spring({ frame: segFrame - 14, fps, config: { damping: 18, stiffness: 90 } });
  const num = parseFloat(m.value.replace(/[^0-9.]/g, "")) || 0;
  const isLT = m.value.startsWith("<");
  const animated = interpolate(ease, [0, 1], [0, num]);
  const display = isLT
    ? `< ${Math.round(animated)}`
    : num >= 100
      ? Math.round(animated).toString()
      : animated.toFixed(0);
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${interpolate(ease, [0, 1], [0.92, 1])})`,
        opacity: ease,
        padding: "44px 72px",
        borderRadius: 28,
        background: "rgba(8,12,22,0.78)",
        border: `1px solid ${t.fg}66`,
        boxShadow: `0 30px 80px -20px ${t.fg}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
        textAlign: "center",
        minWidth: 460,
      }}
    >
      <div
        style={{ fontFamily: inter, fontSize: 14, letterSpacing: 6, color: t.fg, fontWeight: 700 }}
      >
        IMPACT METRIC
      </div>
      <div
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 8,
          fontFamily: inter,
          fontWeight: 800,
          lineHeight: 1,
          background: `linear-gradient(180deg, ${t.from} 0%, ${t.to} 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textShadow: `0 0 50px ${t.fg}44`,
        }}
      >
        <span style={{ fontSize: 168 }}>{display}</span>
        <span style={{ fontSize: 84, fontWeight: 700 }}>{m.unit}</span>
      </div>
      <div
        dir="rtl"
        style={{ marginTop: 14, fontFamily: cairo, fontSize: 26, color: "#fff", fontWeight: 700 }}
      >
        {m.label_ar}
      </div>
      <div
        style={{
          marginTop: 4,
          fontFamily: inter,
          fontSize: 16,
          color: "rgba(255,255,255,0.7)",
          letterSpacing: 2,
        }}
      >
        {m.label_en.toUpperCase()}
      </div>
    </div>
  );
};

const SegmentView: React.FC<{ seg: Seg; segFrame: number; segDur: number; index: number }> = ({
  seg,
  segFrame,
  segDur,
  index,
}) => {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: segFrame, fps, config: { damping: 22, stiffness: 110 } });
  const exit = interpolate(segFrame, [segDur - 14, segDur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = enter * (1 - exit);
  const slide = interpolate(enter, [0, 1], [40, 0]);
  const dir = index % 2 === 0 ? 1 : -1;
  const kbScale = interpolate(segFrame, [0, segDur], [1.04, 1.16]);
  const kbX = interpolate(segFrame, [0, segDur], [0, dir * 36]);

  return (
    <AbsoluteFill style={{ background: "#03060d" }}>
      <AbsoluteFill
        style={{ transform: `scale(${kbScale}) translateX(${kbX}px)`, transformOrigin: "center" }}
      >
        <Img
          src={staticFile(seg.image)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: seg.metric ? 0.55 : 0.9,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(3,6,13,0.55) 0%, rgba(3,6,13,0.18) 30%, rgba(3,6,13,0.45) 65%, rgba(3,6,13,0.95) 100%)",
        }}
      />
      <Vignette />
      <FilmGrain />
      <LetterBox />

      {/* Section badge */}
      <div
        style={{
          position: "absolute",
          top: 84,
          left: 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          transform: `translateY(${-slide}px)`,
          opacity,
          zIndex: 5,
        }}
      >
        <div style={{ width: 4, height: 42, background: "#FFD24A", borderRadius: 2 }} />
        <div>
          <div
            style={{
              fontFamily: inter,
              color: "#FFD24A",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 5,
              textTransform: "uppercase",
            }}
          >
            {seg.section}
          </div>
          <div
            style={{
              fontFamily: inter,
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              letterSpacing: 3,
              marginTop: 4,
            }}
          >
            {seg.caption}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 88,
          right: 64,
          fontFamily: inter,
          fontSize: 22,
          fontWeight: 700,
          color: "rgba(255,255,255,0.92)",
          letterSpacing: 8,
          zIndex: 5,
        }}
      >
        NEEXIOS
      </div>

      {seg.metric && <MetricCard m={seg.metric} segFrame={segFrame} fps={fps} />}

      {/* Arabic title bottom-right */}
      <div
        dir="rtl"
        style={{
          position: "absolute",
          bottom: 170,
          right: 80,
          left: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          transform: `translateY(${slide}px)`,
          opacity,
          zIndex: 5,
        }}
      >
        <div
          style={{
            fontFamily: cairo,
            color: "#fff",
            fontSize: seg.metric ? 40 : 52,
            fontWeight: 800,
            lineHeight: 1.4,
            textShadow: "0 6px 28px rgba(0,0,0,0.9)",
            maxWidth: "92%",
            textAlign: "right",
          }}
        >
          {seg.ar}
        </div>
      </div>

      {/* English subtitle */}
      <div
        style={{
          position: "absolute",
          bottom: 84,
          left: 80,
          right: 80,
          textAlign: "center",
          opacity,
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "inline-block",
            fontFamily: inter,
            color: "#fff",
            fontSize: 24,
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: 0.3,
            background: "rgba(0,0,0,0.6)",
            padding: "10px 22px",
            borderRadius: 6,
            textShadow: "0 2px 10px rgba(0,0,0,0.6)",
          }}
        >
          {seg.en}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = Math.min(1, frame / (ROI_DURATION - 60));
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        height: 3,
        background: "rgba(255,255,255,0.08)",
        zIndex: 11,
      }}
    >
      <div
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          background: "linear-gradient(90deg, #FFD24A 0%, #FFB000 100%)",
        }}
      />
    </div>
  );
};

export const RoiFilmAR: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#03060d" }}>
      {SEGS.map((seg, i) => {
        const start = STARTS[i];
        const dur = SEG_FRAMES[i];
        if (frame < start || frame >= start + dur + 4) return null;
        return (
          <Sequence key={i} from={start} durationInFrames={dur} layout="none">
            <SegmentView seg={seg} segFrame={frame - start} segDur={dur} index={i} />
            <Audio src={staticFile(seg.audio)} />
          </Sequence>
        );
      })}
      <ProgressBar />
    </AbsoluteFill>
  );
};
