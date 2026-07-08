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
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";
import { loadFont as loadTajawal } from "@remotion/google-fonts/Tajawal";
import { loadFont as loadAmiri } from "@remotion/google-fonts/Amiri";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import dur from "../public/audio/saudi-durations.json";
import enArr from "../public/audio/saudi-en.json";
import arArr from "../public/audio/saudi-ar.json";

const { fontFamily: CAIRO } = loadCairo("normal", {
  weights: ["400", "700", "800", "900"],
  subsets: ["arabic"],
});
const { fontFamily: TAJAWAL } = loadTajawal("normal", {
  weights: ["400", "500", "700", "800"],
  subsets: ["arabic"],
});
const { fontFamily: AMIRI } = loadAmiri("normal", { weights: ["400", "700"], subsets: ["arabic"] });
const { fontFamily: INTER } = loadInter("normal", {
  weights: ["400", "500", "700", "800"],
  subsets: ["latin"],
});

export const SAUDI_FPS = 30;
const PAD = 0.55;

type Seg = {
  audio: string;
  dur: number;
  image: string;
  ar: string;
  en: string;
  section: string;
  caption: string;
  decorative?: boolean; // use Amiri for the AR line
  highlight?: {
    title_ar: string;
    title_en: string;
    bullets_ar: string[];
    tone: "gold" | "emerald" | "cyan";
  };
};

const SEGS: Seg[] = [
  {
    audio: "audio/saudi-00.mp3",
    dur: dur[0],
    image: "film/06-skyline.jpg",
    ar: arArr[0],
    en: enArr[0],
    decorative: true,
    section: "مقدمة · INTRO",
    caption: "Welcome to NEEXIOS",
  },
  {
    audio: "audio/saudi-01.mp3",
    dur: dur[1],
    image: "film/05-analyst.jpg",
    ar: arArr[1],
    en: enArr[1],
    section: "المشكلة · THE PROBLEM",
    caption: "Slow decisions · scattered data",
  },
  {
    audio: "audio/saudi-02.mp3",
    dur: dur[2],
    image: "tour/02-cockpit.png",
    ar: arArr[2],
    en: enArr[2],
    section: "الحل · UNIFIED COMMAND",
    caption: "One command room · Evidence in seconds",
  },
  {
    audio: "audio/saudi-03.mp3",
    dur: dur[3],
    image: "tour/03-intelligence.png",
    ar: arArr[3],
    en: enArr[3],
    section: "أريا · ARIA AI",
    caption: "Speak Arabic · Get executive answers",
  },
  {
    audio: "audio/saudi-04.mp3",
    dur: dur[4],
    image: "tour/10-analytics.png",
    ar: arArr[4],
    en: enArr[4],
    section: "النتائج · THE IMPACT",
    caption: "Measured outcomes",
    highlight: {
      title_ar: "أرقامٌ حقيقية",
      title_en: "REAL NUMBERS",
      bullets_ar: [
        "−٤٢٪   زمن القرار التنفيذي",
        "+٤٢٠٪   عائد الاستثمار",
        "أقل من ٥ أشهر   استرداد رأس المال",
      ],
      tone: "gold",
    },
  },
  {
    audio: "audio/saudi-05.mp3",
    dur: dur[5],
    image: "tour/06-integrations.png",
    ar: arArr[5],
    en: enArr[5],
    section: "الركائز · THREE PILLARS",
    caption: "Integration · Agents · Governance",
    highlight: {
      title_ar: "ركائزٌ إبداعية",
      title_en: "CREATIVE PILLARS",
      bullets_ar: [
        "تكاملٌ أصيلٌ مع SAP · Oracle · Microsoft",
        "٤٨ وكيلاً ذكياً يعمل ٢٤/٧",
        "حوكمةٌ كاملة · سجل تدقيق لكل ريال",
      ],
      tone: "cyan",
    },
  },
  {
    audio: "audio/saudi-06.mp3",
    dur: dur[6],
    image: "tour/11-briefing.png",
    ar: arArr[6],
    en: enArr[6],
    section: "العقل التنفيذي · DIGITAL BRAIN",
    caption: "A strategic asset, not an IT expense",
  },
  {
    audio: "audio/saudi-07.mp3",
    dur: dur[7],
    image: "film/04-boardroom.jpg",
    ar: arArr[7],
    en: enArr[7],
    decorative: true,
    section: "نِكسيوس · NEEXIOS",
    caption: "neexios.com",
  },
];

const SEG_FRAMES = SEGS.map((s) => Math.round((s.dur + PAD) * SAUDI_FPS));
const STARTS: number[] = SEG_FRAMES.reduce<number[]>((a, _, i) => {
  a.push(i === 0 ? 0 : a[i - 1] + SEG_FRAMES[i - 1]);
  return a;
}, []);
export const SAUDI_DURATION = STARTS[STARTS.length - 1] + SEG_FRAMES[SEG_FRAMES.length - 1] + 60;

const TONE = {
  gold: { fg: "#F5C24A", from: "#FFE08A", mid: "#F5C24A", to: "#C8881A" },
  emerald: { fg: "#34D399", from: "#86EFAC", mid: "#34D399", to: "#047857" },
  cyan: { fg: "#67E8F9", from: "#A5F3FC", mid: "#67E8F9", to: "#0E7490" },
};

// ===== Decorative SVG ornament (Islamic-style geometric flourish) =====
const Ornament: React.FC<{ width?: number; color?: string; opacity?: number }> = ({
  width = 360,
  color = "#F5C24A",
  opacity = 0.9,
}) => (
  <svg width={width} height={28} viewBox="0 0 360 28" fill="none" style={{ opacity }}>
    <defs>
      <linearGradient id="ornGrad" x1="0" x2="360" y1="0" y2="0">
        <stop offset="0%" stopColor={color} stopOpacity="0" />
        <stop offset="40%" stopColor={color} stopOpacity="1" />
        <stop offset="60%" stopColor={color} stopOpacity="1" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <line x1="0" y1="14" x2="148" y2="14" stroke="url(#ornGrad)" strokeWidth="1.2" />
    <line x1="212" y1="14" x2="360" y2="14" stroke="url(#ornGrad)" strokeWidth="1.2" />
    <g transform="translate(180 14)" stroke={color} strokeWidth="1.4" fill="none">
      <circle r="9" />
      <path d="M-9 0 L0 -9 L9 0 L0 9 Z" />
      <circle r="2.4" fill={color} />
    </g>
    <circle cx="148" cy="14" r="2" fill={color} />
    <circle cx="212" cy="14" r="2" fill={color} />
  </svg>
);

// ===== Floating bokeh particles =====
const Bokeh: React.FC<{ tone: string }> = ({ tone }) => {
  const frame = useCurrentFrame();
  const dots = Array.from({ length: 22 });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: 0.45 }}>
      {dots.map((_, i) => {
        const seed = i * 37.7;
        const x = (Math.sin(seed) * 0.5 + 0.5) * 1920;
        const yBase = (Math.cos(seed * 1.31) * 0.5 + 0.5) * 1080;
        const y = yBase + Math.sin((frame + seed) / 60) * 30;
        const size = 6 + (i % 6) * 5;
        const op = 0.15 + (i % 5) * 0.08;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${tone}cc 0%, ${tone}00 70%)`,
              opacity: op,
              filter: "blur(2px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.82) 100%)",
      pointerEvents: "none",
    }}
  />
);
const FilmGrain: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)",
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

const HighlightCard: React.FC<{
  h: NonNullable<Seg["highlight"]>;
  segFrame: number;
  fps: number;
}> = ({ h, segFrame, fps }) => {
  const t = TONE[h.tone];
  const ease = spring({ frame: segFrame - 14, fps, config: { damping: 20, stiffness: 95 } });
  return (
    <div
      dir="rtl"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${interpolate(ease, [0, 1], [0.92, 1])})`,
        opacity: ease,
        padding: "44px 64px 50px",
        borderRadius: 28,
        background: "linear-gradient(160deg, rgba(10,14,24,0.92) 0%, rgba(8,12,22,0.85) 100%)",
        border: `1px solid ${t.mid}55`,
        boxShadow: `0 40px 100px -25px ${t.mid}66, inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.03)`,
        minWidth: 780,
        maxWidth: 980,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          fontFamily: INTER,
          fontSize: 13,
          letterSpacing: 7,
          fontWeight: 700,
          background: `linear-gradient(90deg, ${t.from}, ${t.to})`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          textAlign: "left",
        }}
      >
        {h.title_en}
      </div>
      <div
        style={{
          fontFamily: CAIRO,
          fontSize: 44,
          color: "#fff",
          fontWeight: 900,
          marginTop: 4,
          marginBottom: 6,
          textAlign: "right",
          letterSpacing: "-0.5px",
        }}
      >
        {h.title_ar}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 22 }}>
        <Ornament width={280} color={t.mid} opacity={0.9} />
      </div>
      {h.bullets_ar.map((b, i) => {
        const bEase = spring({
          frame: segFrame - 24 - i * 11,
          fps,
          config: { damping: 22, stiffness: 110 },
        });
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 18,
              marginTop: 16,
              opacity: bEase,
              transform: `translateX(${interpolate(bEase, [0, 1], [-34, 0])}px)`,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                transform: "rotate(45deg)",
                background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                boxShadow: `0 0 20px ${t.mid}cc`,
              }}
            />
            <div
              style={{
                fontFamily: TAJAWAL,
                fontSize: 32,
                color: "#fff",
                fontWeight: 700,
                lineHeight: 1.5,
                textAlign: "right",
              }}
            >
              {b}
            </div>
          </div>
        );
      })}
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
  const slide = interpolate(enter, [0, 1], [44, 0]);
  const dir = index % 2 === 0 ? 1 : -1;
  const kbScale = interpolate(segFrame, [0, segDur], [1.05, 1.18]);
  const kbX = interpolate(segFrame, [0, segDur], [0, dir * 36]);

  // Animated gold underline width
  const underline = interpolate(
    spring({ frame: segFrame - 12, fps, config: { damping: 200 } }),
    [0, 1],
    [0, 1],
  );

  // Arabic title word-by-word reveal (simulate by character group split on spaces)
  const arWords = seg.ar.split(" ");

  const titleFont = seg.decorative ? AMIRI : CAIRO;

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
            opacity: seg.highlight ? 0.42 : 0.85,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(3,6,13,0.65) 0%, rgba(3,6,13,0.18) 30%, rgba(3,6,13,0.55) 65%, rgba(3,6,13,0.96) 100%)",
        }}
      />
      <Bokeh tone={seg.highlight ? TONE[seg.highlight.tone].mid : "#F5C24A"} />
      <Vignette />
      <FilmGrain />
      <LetterBox />

      {/* Section badge top-left */}
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          transform: `translateY(${-slide}px)`,
          opacity,
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: 4,
            height: 46,
            background: "linear-gradient(180deg, #FFE08A, #C8881A)",
            borderRadius: 2,
            boxShadow: "0 0 14px #F5C24Acc",
          }}
        />
        <div>
          <div
            style={{
              fontFamily: INTER,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 5,
              background: "linear-gradient(90deg, #FFE08A, #C8881A)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {seg.section}
          </div>
          <div
            style={{
              fontFamily: INTER,
              color: "rgba(255,255,255,0.75)",
              fontSize: 14,
              letterSpacing: 3,
              marginTop: 4,
            }}
          >
            {seg.caption}
          </div>
        </div>
      </div>

      {/* Brand top-right */}
      <div
        style={{
          position: "absolute",
          top: 90,
          right: 64,
          fontFamily: INTER,
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 10,
          background: "linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.7) 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          zIndex: 5,
        }}
      >
        NEEXIOS
      </div>

      {seg.highlight && <HighlightCard h={seg.highlight} segFrame={segFrame} fps={fps} />}

      {/* Arabic title — large, gradient, word-staggered */}
      <div
        dir="rtl"
        style={{
          position: "absolute",
          bottom: 168,
          right: 80,
          left: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          opacity,
          zIndex: 5,
        }}
      >
        <div
          style={{
            fontFamily: titleFont,
            fontSize: seg.highlight ? 38 : seg.decorative ? 64 : 56,
            fontWeight: seg.decorative ? 700 : 900,
            lineHeight: 1.55,
            color: "#fff",
            textShadow: "0 6px 30px rgba(0,0,0,0.95), 0 0 40px rgba(245,194,74,0.18)",
            maxWidth: "94%",
            textAlign: "right",
            letterSpacing: seg.decorative ? "0px" : "-0.5px",
            direction: "rtl",
          }}
        >
          {arWords.map((w, i) => {
            const wSpring = spring({ frame: segFrame - 6 - i * 2, fps, config: { damping: 200 } });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: wSpring,
                  transform: `translateY(${interpolate(wSpring, [0, 1], [16, 0])}px)`,
                  marginLeft: 8,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        {/* Animated gold underline */}
        <div
          style={{
            marginTop: 14,
            height: 3,
            borderRadius: 2,
            width: `${underline * 38}%`,
            background:
              "linear-gradient(90deg, transparent 0%, #FFE08A 20%, #F5C24A 50%, #C8881A 80%, transparent 100%)",
            boxShadow: "0 0 18px rgba(245,194,74,0.7)",
          }}
        />
      </div>

      {/* English subtitle bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
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
            fontFamily: INTER,
            color: "#fff",
            fontSize: 22,
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: 0.3,
            background: "rgba(0,0,0,0.65)",
            padding: "10px 24px",
            borderRadius: 8,
            border: "1px solid rgba(245,194,74,0.18)",
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
  const pct = Math.min(1, frame / (SAUDI_DURATION - 60));
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        height: 3,
        background: "rgba(255,255,255,0.06)",
        zIndex: 11,
      }}
    >
      <div
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          background: "linear-gradient(90deg, #FFE08A 0%, #F5C24A 50%, #C8881A 100%)",
          boxShadow: "0 0 12px rgba(245,194,74,0.7)",
        }}
      />
    </div>
  );
};

export const SaudiFinal: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#03060d" }}>
      {SEGS.map((seg, i) => {
        const start = STARTS[i];
        const segDur = SEG_FRAMES[i];
        if (frame < start || frame >= start + segDur + 4) return null;
        return (
          <Sequence key={i} from={start} durationInFrames={segDur} layout="none">
            <SegmentView seg={seg} segFrame={frame - start} segDur={segDur} index={i} />
            <Audio src={staticFile(seg.audio)} />
          </Sequence>
        );
      })}
      <ProgressBar />
    </AbsoluteFill>
  );
};
