import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import dur from "../public/audio/saudi-durations.json";
import enArr from "../public/audio/saudi-en.json";
import arArr from "../public/audio/saudi-ar.json";

export const SAUDI_FPS = 30;
const PAD = 0.55;

const cairo = `'Cairo','Tajawal','Noto Sans Arabic',sans-serif`;
const inter = `'Inter','SF Pro Display',sans-serif`;

type Seg = {
  audio: string; dur: number; image: string;
  ar: string; en: string;
  section: string; caption: string;
  highlight?: { title_ar: string; title_en: string; bullets_ar: string[]; tone: "gold" | "emerald" | "cyan" };
};

const SEGS: Seg[] = [
  { audio: "audio/saudi-00.mp3", dur: dur[0], image: "film/06-skyline.jpg",
    ar: arArr[0], en: enArr[0],
    section: "مقدمة · INTRO", caption: "Welcome to NEEXIOS" },
  { audio: "audio/saudi-01.mp3", dur: dur[1], image: "film/05-analyst.jpg",
    ar: arArr[1], en: enArr[1],
    section: "المشكلة · THE PROBLEM", caption: "Slow decisions · scattered data" },
  { audio: "audio/saudi-02.mp3", dur: dur[2], image: "tour/02-cockpit.png",
    ar: arArr[2], en: enArr[2],
    section: "الحل · UNIFIED COMMAND", caption: "One command room. Evidence in seconds." },
  { audio: "audio/saudi-03.mp3", dur: dur[3], image: "tour/03-intelligence.png",
    ar: arArr[3], en: enArr[3],
    section: "أريا · ARIA AI", caption: "Speak Arabic. Get executive answers." },
  { audio: "audio/saudi-04.mp3", dur: dur[4], image: "tour/10-analytics.png",
    ar: arArr[4], en: enArr[4],
    section: "النتائج · THE IMPACT", caption: "Measured outcomes",
    highlight: { title_ar: "أرقام حقيقية", title_en: "REAL NUMBERS",
      bullets_ar: ["−42٪  زمن القرار", "+420٪  عائد الاستثمار", "<5  أشهر استرداد"], tone: "gold" } },
  { audio: "audio/saudi-05.mp3", dur: dur[5], image: "tour/06-integrations.png",
    ar: arArr[5], en: enArr[5],
    section: "ثلاث ركائز · THREE PILLARS", caption: "Integration · Agents · Governance",
    highlight: { title_ar: "الركائز الإبداعية", title_en: "CREATIVE PILLARS",
      bullets_ar: ["تكامل ذكي مع SAP · Oracle · Microsoft", "٤٨ وكيلاً ذكياً يعمل ٢٤/٧", "حوكمة كاملة · سجل تدقيق لكل ريال"], tone: "cyan" } },
  { audio: "audio/saudi-06.mp3", dur: dur[6], image: "tour/11-briefing.png",
    ar: arArr[6], en: enArr[6],
    section: "العقل التنفيذي · DIGITAL BRAIN", caption: "A strategic asset, not an IT expense" },
  { audio: "audio/saudi-07.mp3", dur: dur[7], image: "film/04-boardroom.jpg",
    ar: arArr[7], en: enArr[7],
    section: "نِكسيوس · NEEXIOS", caption: "neexios.com" },
];

const SEG_FRAMES = SEGS.map((s) => Math.round((s.dur + PAD) * SAUDI_FPS));
const STARTS: number[] = SEG_FRAMES.reduce<number[]>((a, _, i) => { a.push(i === 0 ? 0 : a[i-1] + SEG_FRAMES[i-1]); return a; }, []);
export const SAUDI_DURATION = STARTS[STARTS.length - 1] + SEG_FRAMES[SEG_FRAMES.length - 1] + 60;

const TONE = {
  gold:    { fg: "#FFD24A", from: "#FFD24A", to: "#FF9500" },
  emerald: { fg: "#34D399", from: "#34D399", to: "#059669" },
  cyan:    { fg: "#67E8F9", from: "#67E8F9", to: "#0891B2" },
};

const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.78) 100%)", pointerEvents: "none" }} />
);
const FilmGrain: React.FC = () => (
  <AbsoluteFill style={{
    backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 3px)",
    mixBlendMode: "overlay", pointerEvents: "none",
  }} />
);
const LetterBox: React.FC = () => (
  <>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: "#000", zIndex: 10 }} />
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "#000", zIndex: 10 }} />
  </>
);

const HighlightCard: React.FC<{ h: NonNullable<Seg["highlight"]>; segFrame: number; fps: number }> = ({ h, segFrame, fps }) => {
  const t = TONE[h.tone];
  const ease = spring({ frame: segFrame - 14, fps, config: { damping: 20, stiffness: 95 } });
  return (
    <div dir="rtl" style={{
      position: "absolute", top: "50%", left: "50%",
      transform: `translate(-50%, -50%) scale(${interpolate(ease, [0,1], [0.93, 1])})`,
      opacity: ease,
      padding: "40px 60px", borderRadius: 24,
      background: "rgba(8,12,22,0.82)",
      border: `1px solid ${t.fg}66`,
      boxShadow: `0 30px 80px -20px ${t.fg}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
      minWidth: 720, maxWidth: 900,
    }}>
      <div style={{ fontFamily: inter, fontSize: 13, letterSpacing: 6, color: t.fg, fontWeight: 700, textAlign: "left" }}>
        {h.title_en}
      </div>
      <div style={{ fontFamily: cairo, fontSize: 36, color: "#fff", fontWeight: 800, marginTop: 6, marginBottom: 22, textAlign: "right" }}>
        {h.title_ar}
      </div>
      {h.bullets_ar.map((b, i) => {
        const bEase = spring({ frame: segFrame - 22 - i * 10, fps, config: { damping: 22, stiffness: 110 } });
        return (
          <div key={i} style={{
            display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: 16,
            marginTop: 14, opacity: bEase, transform: `translateX(${interpolate(bEase,[0,1],[-30,0])}px)`,
          }}>
            <div style={{ width: 14, height: 14, borderRadius: 4,
              background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
              boxShadow: `0 0 18px ${t.fg}99` }} />
            <div style={{ fontFamily: cairo, fontSize: 30, color: "#fff", fontWeight: 700, lineHeight: 1.5, textAlign: "right" }}>{b}</div>
          </div>
        );
      })}
    </div>
  );
};

const SegmentView: React.FC<{ seg: Seg; segFrame: number; segDur: number; index: number }> = ({ seg, segFrame, segDur, index }) => {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: segFrame, fps, config: { damping: 22, stiffness: 110 } });
  const exit = interpolate(segFrame, [segDur - 14, segDur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = enter * (1 - exit);
  const slide = interpolate(enter, [0, 1], [40, 0]);
  const dir = index % 2 === 0 ? 1 : -1;
  const kbScale = interpolate(segFrame, [0, segDur], [1.04, 1.16]);
  const kbX = interpolate(segFrame, [0, segDur], [0, dir * 36]);

  return (
    <AbsoluteFill style={{ background: "#03060d" }}>
      <AbsoluteFill style={{ transform: `scale(${kbScale}) translateX(${kbX}px)`, transformOrigin: "center" }}>
        <Img src={staticFile(seg.image)} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: seg.highlight ? 0.45 : 0.85 }} />
      </AbsoluteFill>
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, rgba(3,6,13,0.55) 0%, rgba(3,6,13,0.18) 30%, rgba(3,6,13,0.55) 65%, rgba(3,6,13,0.95) 100%)",
      }} />
      <Vignette />
      <FilmGrain />
      <LetterBox />

      <div style={{
        position: "absolute", top: 84, left: 64, display: "flex", alignItems: "center", gap: 14,
        transform: `translateY(${-slide}px)`, opacity, zIndex: 5,
      }}>
        <div style={{ width: 4, height: 42, background: "#FFD24A", borderRadius: 2 }} />
        <div>
          <div style={{ fontFamily: inter, color: "#FFD24A", fontSize: 16, fontWeight: 700, letterSpacing: 5 }}>
            {seg.section}
          </div>
          <div style={{ fontFamily: inter, color: "rgba(255,255,255,0.75)", fontSize: 14, letterSpacing: 3, marginTop: 4 }}>
            {seg.caption}
          </div>
        </div>
      </div>

      <div style={{
        position: "absolute", top: 88, right: 64, fontFamily: inter, fontSize: 22, fontWeight: 700,
        color: "rgba(255,255,255,0.92)", letterSpacing: 8, zIndex: 5,
      }}>NEEXIOS</div>

      {seg.highlight && <HighlightCard h={seg.highlight} segFrame={segFrame} fps={fps} />}

      <div dir="rtl" style={{
        position: "absolute", bottom: 170, right: 80, left: 80,
        display: "flex", flexDirection: "column", alignItems: "flex-end",
        transform: `translateY(${slide}px)`, opacity, zIndex: 5,
      }}>
        <div style={{
          fontFamily: cairo, color: "#fff",
          fontSize: seg.highlight ? 36 : 50, fontWeight: 800,
          lineHeight: 1.45, textShadow: "0 6px 28px rgba(0,0,0,0.9)", maxWidth: "94%",
          textAlign: "right",
        }}>{seg.ar}</div>
      </div>

      <div style={{
        position: "absolute", bottom: 84, left: 80, right: 80, textAlign: "center", opacity, zIndex: 5,
      }}>
        <div style={{
          display: "inline-block", fontFamily: inter, color: "#fff",
          fontSize: 22, fontWeight: 500, lineHeight: 1.4, letterSpacing: 0.3,
          background: "rgba(0,0,0,0.6)", padding: "10px 22px", borderRadius: 6,
        }}>{seg.en}</div>
      </div>
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const pct = Math.min(1, frame / (SAUDI_DURATION - 60));
  return (
    <div style={{ position: "absolute", top: 60, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.08)", zIndex: 11 }}>
      <div style={{ width: `${pct * 100}%`, height: "100%", background: "linear-gradient(90deg, #FFD24A 0%, #FFB000 100%)" }} />
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
