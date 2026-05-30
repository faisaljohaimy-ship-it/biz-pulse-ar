import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { TwinBackground } from "./scenes/TwinBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

export const DOC_EN_FPS = 30;

// Per-scene frame durations sized to English narration clip lengths (+0.4s gap).
const SCENES = [
  { dur: 175, num: "01", chap: "The Silent Crisis",       title: "A Thousand Systems. No Mind." },
  { dur: 178, num: "02", chap: "Introducing Nexus",       title: "The Enterprise Operating System" },
  { dur: 169, num: "03", chap: "Executive Cockpit",       title: "Every Metric. One Surface." },
  { dur: 143, num: "04", chap: "Intelligence Fabric",     title: "Threads No Human Can See" },
  { dur: 154, num: "05", chap: "Digital Twin",            title: "Your Enterprise. In Your Hand." },
  { dur: 142, num: "06", chap: "ARIA",                    title: "Bilingual Executive Copilot" },
  { dur: 137, num: "07", chap: "Executive Memory",        title: "No Decision Forgotten" },
  { dur: 135, num: "08", chap: "Predictive Intelligence", title: "Before the Risk Spreads" },
  { dur: 176, num: "09", chap: "Governance & Outcomes",   title: "Transformation You Can Prove" },
  { dur: 123, num: "10", chap: "Boardroom",               title: "The Briefing Is Ready" },
  { dur: 128, num: "11", chap: "Voice AI",                title: "Hands Free. Mind Clear." },
  { dur: 174, num: "12", chap: "Security & Sovereignty",  title: "Enterprise-Grade. Sovereign." },
  { dur: 107, num: "13", chap: "Vision",                  title: "The Enterprise That Never Sleeps." },
];

export const DOC_EN_DURATION = SCENES.reduce((a, s) => a + s.dur, 0);

const TitleCard: React.FC<{ scene: typeof SCENES[number]; idx: number }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const inProg = spring({ frame, fps: DOC_EN_FPS, config: { damping: 18, stiffness: 90, mass: 1 } });
  const outStart = scene.dur - 30;
  const outProg = interpolate(frame, [outStart, scene.dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = inProg * (1 - outProg);
  const ty = interpolate(inProg, [0, 1], [40, 0]);
  const lineW = interpolate(inProg, [0, 1], [0, 280]);

  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      justifyContent: "flex-end", alignItems: "flex-start",
      padding: "0 110px 140px 110px",
      transform: `translateY(${ty}px)`, opacity,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
        <span style={{ color: "#7fb8ff", fontSize: 16, letterSpacing: 6, fontWeight: 700 }}>
          CHAPTER {scene.num}
        </span>
        <div style={{ width: lineW, height: 2, background: "linear-gradient(90deg, #22d3ee, transparent)" }} />
      </div>
      <div style={{ color: "#9fcfff", fontSize: 22, letterSpacing: 4, marginBottom: 18, opacity: 0.85, textTransform: "uppercase" }}>
        {scene.chap}
      </div>
      <h1 style={{
        color: "#fff", fontSize: 86, lineHeight: 1.1, margin: 0, fontWeight: 800,
        letterSpacing: -2,
        textShadow: "0 8px 40px rgba(34,211,238,0.35), 0 2px 0 rgba(0,0,0,0.5)",
        maxWidth: 1500, textAlign: "left",
      }}>
        {scene.title}
      </h1>
    </div>
  );
};

const Crosshair: React.FC = () => {
  const f = useCurrentFrame();
  const r = 220 + Math.sin(f / 18) * 12;
  return (
    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <g transform="translate(960, 540)" stroke="#22d3ee" fill="none" opacity={0.5}>
        <circle r={r} strokeWidth={1.2} strokeDasharray="3 8" />
        <circle r={r * 0.7} strokeWidth={1} strokeDasharray="2 6" opacity={0.6} />
        <line x1={-r * 1.2} x2={r * 1.2} y1={0} y2={0} strokeWidth={0.6} opacity={0.3} />
        <line y1={-r * 1.2} y2={r * 1.2} x1={0} x2={0} strokeWidth={0.6} opacity={0.3} />
      </g>
    </svg>
  );
};

const KpiStream: React.FC<{ items: string[] }> = ({ items }) => {
  const f = useCurrentFrame();
  return (
    <div style={{
      position: "absolute", top: 110, left: 0, right: 0,
      display: "flex", justifyContent: "center", gap: 16,
    }}>
      {items.map((it, i) => {
        const p = spring({ frame: f - i * 6, fps: DOC_EN_FPS, config: { damping: 16, stiffness: 120 } });
        return (
          <div key={i} style={{
            opacity: p,
            transform: `translateY(${interpolate(p, [0, 1], [-20, 0])}px)`,
            background: "rgba(8,14,30,0.6)",
            border: "1px solid rgba(34,211,238,0.35)",
            borderRadius: 10, padding: "10px 18px",
            color: "#cfe7ff", fontSize: 14, letterSpacing: 2, fontWeight: 700,
            boxShadow: "0 10px 30px -10px rgba(34,211,238,0.4)",
          }}>{it}</div>
        );
      })}
    </div>
  );
};

const Stream: React.FC<{ color: string; offset: number; y: number }> = ({ color, offset, y }) => {
  const f = useCurrentFrame();
  const path = `M -200 ${y} Q 480 ${y - 80 + Math.sin((f + offset) / 22) * 60} 960 ${y} T 2200 ${y}`;
  return (
    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <path d={path} stroke={color} strokeWidth={2} fill="none" opacity={0.6}
        strokeDasharray="6 14" strokeDashoffset={-((f * 4 + offset) % 200)} />
    </svg>
  );
};

const RingPulse: React.FC = () => {
  const f = useCurrentFrame();
  const pulses = [0, 25, 50, 75];
  return (
    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <g transform="translate(960, 540)" fill="none">
        {pulses.map((d, i) => {
          const t = ((f - d) % 100) / 100;
          if (t < 0) return null;
          const r = interpolate(t, [0, 1], [40, 520]);
          const op = interpolate(t, [0, 1], [0.6, 0]);
          return <circle key={i} r={r} stroke="#a78bfa" strokeWidth={2} opacity={op} />;
        })}
      </g>
    </svg>
  );
};

const CornerHUD: React.FC<{ idx: number; total: number }> = ({ idx, total }) => (
  <div style={{
    position: "absolute", top: 40, left: 50, display: "flex", flexDirection: "column",
    gap: 4, color: "#7fb8ff", fontSize: 11, letterSpacing: 4, fontFamily: "monospace",
  }}>
    <div>NEXUS · OS</div>
    <div>SCENE {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</div>
    <div>LIVE FABRIC ▲ 24FPS · 4K</div>
  </div>
);

const Scene: React.FC<{ scene: typeof SCENES[number]; idx: number }> = ({ scene, idx }) => {
  const f = useCurrentFrame();
  let motif: React.ReactNode = null;
  if (idx === 0) motif = <><Stream color="#f43f5e" offset={0} y={420} /><Stream color="#f59e0b" offset={40} y={520} /><Stream color="#a78bfa" offset={80} y={620} /></>;
  else if (idx === 1) motif = <RingPulse />;
  else if (idx === 2) motif = <KpiStream items={["REVENUE +4.2%", "MARGIN 31.4%", "RUNWAY 18M", "RISK 0.21", "NPS 62"]} />;
  else if (idx === 3) motif = <><Stream color="#22d3ee" offset={0} y={380} /><Stream color="#34d399" offset={30} y={500} /><Stream color="#a78bfa" offset={60} y={620} /><Crosshair /></>;
  else if (idx === 4) motif = <Crosshair />;
  else if (idx === 5) motif = <KpiStream items={["EN", "AR", "ARIA · STREAMING"]} />;
  else if (idx === 6) motif = <KpiStream items={["DECISIONS 1,284", "PENDING 12", "OVERDUE 0"]} />;
  else if (idx === 7) motif = <><Stream color="#f59e0b" offset={0} y={460} /><Stream color="#22d3ee" offset={50} y={580} /><RingPulse /></>;
  else if (idx === 8) motif = <KpiStream items={["GOVERNANCE", "POLICIES 248", "PROGRAMS 17", "ON TARGET 92%"]} />;
  else if (idx === 9) motif = <KpiStream items={["ACTIONS", "RISKS", "OPPORTUNITIES"]} />;
  else if (idx === 10) motif = <RingPulse />;
  else if (idx === 11) motif = <KpiStream items={["RLS", "AUDIT", "AI USAGE", "p95 < 800ms"]} />;
  else if (idx === 12) motif = <><RingPulse /><Crosshair /></>;

  const vig = Math.sin(f / 30) * 0.05 + 0.95;

  return (
    <AbsoluteFill style={{ background: "#04060d", color: "#e2f0ff", fontFamily }}>
      <TwinBackground />
      {motif}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,10,0.85) 100%)",
        opacity: vig, pointerEvents: "none",
      }} />
      <CornerHUD idx={idx} total={SCENES.length} />
      <TitleCard scene={scene} idx={idx} />
      <div style={{ position: "absolute", bottom: 36, right: 50, display: "flex", alignItems: "center", gap: 14, opacity: 0.85 }}>
        <Img src={staticFile("images/nexus-icon.png")} style={{ width: 40, height: 40, borderRadius: 8 }} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, color: "#fff" }}>NEXUS</div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#7fb8ff" }}>AI OPERATING SYSTEM</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const DocumentaryEN: React.FC = () => {
  let acc = 0;
  return (
    <AbsoluteFill style={{ background: "#04060d" }}>
      <Audio src={staticFile("audio/narration-en.mp3")} volume={1} />
      {SCENES.map((s, i) => {
        const from = acc;
        acc += s.dur;
        return (
          <Sequence key={i} from={from} durationInFrames={s.dur}>
            <Scene scene={s} idx={i} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
