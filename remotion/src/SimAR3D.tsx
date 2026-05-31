import { AbsoluteFill, Audio, Sequence, useCurrentFrame, interpolate, spring, staticFile, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cairo";
import { TwinBackground } from "./scenes/TwinBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["arabic"] });

export const SIM_AR3D_FPS = 30;

type Sim = {
  dur: number;
  num: string;
  tag: string;
  title: string;
  ai: string;
  bg: string;
  route: string;
  command: string;
  pageTitle: string;
  rows: Array<{ label: string; value: string; tone: string }>;
  chartTone: string;
};

const SIMS: Sim[] = [
  { dur: 305, num: "٠٠", tag: "المشكلة", ai: "Diagnose · AI", bg: "s00-chaos.jpg",
    route: "/diagnose", command: "تشخيص حالة المؤسسة",
    pageTitle: "Enterprise Diagnostic",
    rows: [
      { label: "ERP Silos", value: "37", tone: "#f43f5e" },
      { label: "Data Drift", value: "62%", tone: "#f59e0b" },
      { label: "Decision Lag", value: "9d", tone: "#a78bfa" },
      { label: "Blind Spots", value: "184", tone: "#f87171" },
    ], chartTone: "#f43f5e" },
  { dur: 398, num: "٠١", tag: "الخطوة ١", ai: "Live Data · AI", bg: "s01-cockpit.jpg",
    route: "/cockpit", command: "افتح قمرة القيادة التنفيذية",
    pageTitle: "Executive Cockpit",
    rows: [
      { label: "Live Streams",   value: "248",  tone: "#22d3ee" },
      { label: "Systems Linked", value: "100%", tone: "#34d399" },
      { label: "Refresh",        value: "1.2s", tone: "#7dd3fc" },
      { label: "Signal Health",  value: "OK",   tone: "#34d399" },
    ], chartTone: "#22d3ee" },
  { dur: 373, num: "٠٢", tag: "الخطوة ٢", ai: "Live Analysis · AI", bg: "s02-fabric.jpg",
    route: "/fabric", command: "حلّل الإشارات الحيّة",
    pageTitle: "Intelligence Fabric",
    rows: [
      { label: "Signals/sec", value: "1.4M", tone: "#22d3ee" },
      { label: "Patterns",    value: "318",  tone: "#a78bfa" },
      { label: "AI Models",   value: "42",   tone: "#34d399" },
      { label: "Anomalies",   value: "7",    tone: "#f59e0b" },
    ], chartTone: "#a78bfa" },
  { dur: 342, num: "٠٣", tag: "الخطوة ٣", ai: "Simulation · AI", bg: "s03-twin.jpg",
    route: "/digital-twin", command: "حاكِ سيناريو القرار",
    pageTitle: "Digital Twin · Scenario Lab",
    rows: [
      { label: "Entities",   value: "11,402", tone: "#22d3ee" },
      { label: "Scenarios",  value: "64",     tone: "#f59e0b" },
      { label: "Pipelines",  value: "186",    tone: "#a78bfa" },
      { label: "Confidence", value: "94%",    tone: "#34d399" },
    ], chartTone: "#22d3ee" },
  { dur: 405, num: "٠٤", tag: "الخطوة ٤", ai: "Copilot · AI", bg: "s04-aria.jpg",
    route: "/assistant", command: "اسأل آريا: ما أهم ٣ مخاطر هذا الأسبوع؟",
    pageTitle: "ARIA · Executive Copilot",
    rows: [
      { label: "Languages", value: "AR · EN", tone: "#22d3ee" },
      { label: "Latency",   value: "320 ms",  tone: "#7dd3fc" },
      { label: "Agents",    value: "18",      tone: "#34d399" },
      { label: "Sessions",  value: "Live",    tone: "#fbbf24" },
    ], chartTone: "#22d3ee" },
  { dur: 348, num: "٠٥", tag: "الخطوة ٥", ai: "Predictive · AI", bg: "s05-predict.jpg",
    route: "/risk", command: "تنبّأ بالمخاطر خلال ٣٠ يوم",
    pageTitle: "Predictive Risk Radar",
    rows: [
      { label: "Foresight",   value: "30d",  tone: "#f59e0b" },
      { label: "Drills",      value: "27",   tone: "#f43f5e" },
      { label: "Recovered",   value: "94%",  tone: "#22d3ee" },
      { label: "Alerts Open", value: "12",   tone: "#fbbf24" },
    ], chartTone: "#f59e0b" },
  { dur: 406, num: "٠٦", tag: "الخطوة ٦", ai: "Governance · AI", bg: "s06-gov.jpg",
    route: "/governance", command: "اربط السياسات بالنتائج",
    pageTitle: "Policy → Outcome Graph",
    rows: [
      { label: "Policies", value: "412",  tone: "#34d399" },
      { label: "OKR Align",value: "98%",  tone: "#22d3ee" },
      { label: "Outcomes", value: "1,287",tone: "#a78bfa" },
      { label: "Audits",   value: "Pass", tone: "#34d399" },
    ], chartTone: "#34d399" },
  { dur: 369, num: "٠٧", tag: "الخطوة ٧", ai: "Boardroom · AI", bg: "s07-board.jpg",
    route: "/boardroom", command: "جهّز إحاطة مجلس الإدارة",
    pageTitle: "Boardroom Briefing",
    rows: [
      { label: "Auto-Gen", value: "T-15m", tone: "#22d3ee" },
      { label: "Pages",    value: "12",    tone: "#fbbf24" },
      { label: "Drafts",   value: "Ready", tone: "#a78bfa" },
      { label: "Approved", value: "3 / 3", tone: "#34d399" },
    ], chartTone: "#fbbf24" },
  { dur: 365, num: "٠٨", tag: "الخطوة ٨", ai: "Memory · AI", bg: "s08-memory.jpg",
    route: "/memory", command: "استرجع قرارات الربع الماضي",
    pageTitle: "Executive Memory",
    rows: [
      { label: "Decisions", value: "24,901", tone: "#a78bfa" },
      { label: "Traceable", value: "100%",   tone: "#22d3ee" },
      { label: "Knowledge", value: "612k",   tone: "#34d399" },
      { label: "Recall",    value: "<1s",    tone: "#fbbf24" },
    ], chartTone: "#a78bfa" },
  { dur: 353, num: "٠٩", tag: "الخلاصة", ai: "Nexus · Full Stack AI", bg: "s09-nexus.jpg",
    route: "/", command: "تشغيل النظام الكامل",
    pageTitle: "NEXUS · AI Operating System",
    rows: [
      { label: "Boardroom",  value: "Live",    tone: "#fbbf24" },
      { label: "ARIA",       value: "On",      tone: "#22d3ee" },
      { label: "Fabric",     value: "1.4M/s",  tone: "#a78bfa" },
      { label: "Sovereign",  value: "AES-256", tone: "#34d399" },
    ], chartTone: "#22d3ee" },
];

export const SIM_AR3D_DURATION = SIMS.reduce((a, s) => a + s.dur, 0);

const useCamera = (dur: number, mode: "push" | "pull" | "orbit") => {
  const f = useCurrentFrame();
  const t = f / dur;
  if (mode === "push") return { scale: interpolate(t, [0, 1], [1.06, 1.22]), tx: 0, ty: interpolate(t, [0, 1], [0, -8]) };
  if (mode === "pull") return { scale: interpolate(t, [0, 1], [1.22, 1.06]), tx: 0, ty: interpolate(t, [0, 1], [-6, 0]) };
  return { scale: 1.15, tx: Math.sin(t * Math.PI) * 36, ty: Math.cos(t * Math.PI) * 16 };
};

const Particles: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width="100%" height="100%">
      {Array.from({ length: 70 }).map((_, i) => {
        const seed = i * 137.5;
        const x = seed % 1920;
        const y = ((f * 0.6 + seed * 1.3) % 1080);
        return <circle key={i} cx={x} cy={y} r={0.6 + (i % 5) * 0.4} fill="#7fb8ff" opacity={0.15 + (i % 4) * 0.1} />;
      })}
    </svg>
  );
};

const ScanSweep: React.FC = () => {
  const f = useCurrentFrame();
  const y = (f * 4) % 1200 - 100;
  return <div style={{ position: "absolute", left: 0, right: 0, top: y, height: 3,
    background: "linear-gradient(180deg, transparent, rgba(34,211,238,0.22), transparent)",
    pointerEvents: "none", mixBlendMode: "screen" }} />;
};

const AppWindow: React.FC<{ s: Sim; dur: number }> = ({ s, dur }) => {
  const f = useCurrentFrame();
  const inP = spring({ frame: f - 20, fps: SIM_AR3D_FPS, config: { damping: 18, stiffness: 95 } });
  const out = interpolate(f, [dur - 30, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op = inP * (1 - out);
  const float = Math.sin(f / 38) * 6;
  const tilt = interpolate(inP, [0, 1], [12, -4]);

  const typeStart = 30;
  const typeEnd = 130;
  const chars = Math.max(0, Math.min(s.command.length, Math.floor(interpolate(f, [typeStart, typeEnd], [0, s.command.length]))));
  const typed = s.command.slice(0, chars);
  const caret = f % 20 < 10 ? "│" : " ";

  const reveal = spring({ frame: f - 140, fps: SIM_AR3D_FPS, config: { damping: 18, stiffness: 90 } });

  return (
    <div style={{
      position: "absolute", left: 90, top: 200, width: 760, height: 620,
      perspective: 1600, opacity: op, transform: `translateY(${float}px)`,
    }}>
      <div style={{
        width: "100%", height: "100%",
        transform: `rotateY(${tilt}deg) rotateX(-3deg) translateZ(0)`,
        transformStyle: "preserve-3d",
        background: "linear-gradient(180deg, rgba(8,14,30,0.94), rgba(6,10,22,0.96))",
        border: "1px solid rgba(127,184,255,0.28)",
        borderRadius: 18,
        boxShadow: "0 60px 120px -30px rgba(34,211,238,0.45), 0 0 0 1px rgba(34,211,238,0.1) inset",
        overflow: "hidden", direction: "ltr",
      }}>
        <div style={{ height: 38, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", padding: "0 14px", gap: 8, borderBottom: "1px solid rgba(127,184,255,0.15)" }}>
          <div style={{ width: 10, height: 10, borderRadius: 99, background: "#ff5f57" }} />
          <div style={{ width: 10, height: 10, borderRadius: 99, background: "#febc2e" }} />
          <div style={{ width: 10, height: 10, borderRadius: 99, background: "#28c840" }} />
          <div style={{ marginLeft: 18, padding: "4px 14px", background: "rgba(127,184,255,0.08)", borderRadius: 6, fontFamily: "monospace", fontSize: 11, color: "#7fb8ff", letterSpacing: 1 }}>
            nexus.ai{s.route}
          </div>
          <div style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 10, color: "#7fb8ff88" }}>● connected</div>
        </div>

        <div style={{ padding: 16, borderBottom: "1px solid rgba(127,184,255,0.1)" }}>
          <div style={{ background: "rgba(127,184,255,0.06)", border: "1px solid rgba(127,184,255,0.25)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "monospace", color: "#22d3ee", fontSize: 14 }}>⌘</span>
            <div style={{ flex: 1, direction: "rtl", fontFamily, fontSize: 17, color: "#e2f0ff", fontWeight: 600 }}>
              {typed}<span style={{ color: "#22d3ee" }}>{caret}</span>
            </div>
            <span style={{ fontFamily: "monospace", color: "#7fb8ff88", fontSize: 10, letterSpacing: 2 }}>AI</span>
          </div>
        </div>

        <div style={{ padding: 18, opacity: reveal, transform: `translateY(${interpolate(reveal, [0, 1], [16, 0])}px)` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, fontFamily: "Inter, sans-serif" }}>{s.pageTitle}</div>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "#22d3ee", padding: "4px 10px", border: "1px solid #22d3ee55", borderRadius: 999 }}>● LIVE</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {s.rows.map((r, i) => {
              const p = spring({ frame: f - 150 - i * 8, fps: SIM_AR3D_FPS, config: { damping: 16, stiffness: 110 } });
              return (
                <div key={i} style={{
                  background: "rgba(127,184,255,0.05)", border: `1px solid ${r.tone}40`,
                  borderRadius: 10, padding: "10px 14px",
                  opacity: p, transform: `translateY(${interpolate(p, [0, 1], [12, 0])}px)`,
                }}>
                  <div style={{ fontSize: 10, color: "#7fb8ff", letterSpacing: 2, textTransform: "uppercase" }}>{r.label}</div>
                  <div style={{ fontSize: 24, color: r.tone, fontWeight: 800, fontFamily: "monospace", textShadow: `0 0 14px ${r.tone}66` }}>{r.value}</div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "rgba(127,184,255,0.04)", border: "1px solid rgba(127,184,255,0.15)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#7fb8ff", letterSpacing: 2, marginBottom: 8 }}>REAL-TIME · AI SIGNAL</div>
            <svg width="100%" height={120}>
              {Array.from({ length: 60 }).map((_, i) => {
                const h = 10 + Math.abs(Math.sin((f + i * 4) / 9)) * 100;
                return <rect key={i} x={i * 12} y={120 - h} width={8} height={h} rx={1} fill={s.chartTone} opacity={0.35 + (i / 60) * 0.55} />;
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

const Cursor: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const wp = [
    { f: 0,   x: 1600, y: 900 },
    { f: 30,  x: 760,  y: 305 },
    { f: 60,  x: 760,  y: 305 },
    { f: 140, x: 760,  y: 305 },
    { f: 175, x: 410,  y: 520 },
    { f: 215, x: 750,  y: 600 },
    { f: 260, x: 500,  y: 760 },
    { f: dur, x: 1700, y: 950 },
  ];
  let p = wp[0];
  for (let i = 0; i < wp.length - 1; i++) {
    if (f >= wp[i].f && f <= wp[i + 1].f) {
      const t = (f - wp[i].f) / Math.max(1, wp[i + 1].f - wp[i].f);
      const e = 1 - Math.pow(1 - t, 3);
      p = { f, x: wp[i].x + (wp[i + 1].x - wp[i].x) * e, y: wp[i].y + (wp[i + 1].y - wp[i].y) * e };
      break;
    }
  }
  const clickFrames = [60, 175, 215, 260];
  const ripple = clickFrames.map(cf => {
    const dt = f - cf;
    if (dt < 0 || dt > 28) return null;
    const r = interpolate(dt, [0, 28], [4, 60]);
    const op = interpolate(dt, [0, 28], [0.8, 0]);
    return <circle key={cf} cx={p.x} cy={p.y} r={r} fill="none" stroke="#22d3ee" strokeWidth={2} opacity={op} />;
  });
  const inOp = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const outOp = interpolate(f, [dur - 20, dur], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width="100%" height="100%" opacity={inOp * outOp}>
      {ripple}
      <g transform={`translate(${p.x}, ${p.y})`} style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,0.9))" }}>
        <path d="M 0 0 L 0 22 L 6 17 L 10 26 L 13 25 L 9 16 L 16 16 Z" fill="#fff" stroke="#0a1530" strokeWidth={1.2} />
      </g>
    </svg>
  );
};

const TitleCard: React.FC<{ s: Sim; dur: number }> = ({ s, dur }) => {
  const f = useCurrentFrame();
  const inP = spring({ frame: f, fps: SIM_AR3D_FPS, config: { damping: 18, stiffness: 90 } });
  const outP = interpolate(f, [dur - 30, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op = inP * (1 - outP);
  const ty = interpolate(inP, [0, 1], [40, 0]);
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      justifyContent: "flex-end", alignItems: "flex-end",
      padding: "0 90px 160px 90px", direction: "rtl",
      transform: `translateY(${ty}px)`, opacity: op, pointerEvents: "none",
    }}>
      <div style={{ color: "#7fb8ff", fontSize: 15, letterSpacing: 6, fontWeight: 800, marginBottom: 16 }}>
        {s.tag} · {s.num}
      </div>
      <h1 style={{
        color: "#fff", fontSize: 54, lineHeight: 1.25, margin: 0, fontWeight: 800,
        textShadow: "0 8px 40px rgba(34,211,238,0.4), 0 2px 0 rgba(0,0,0,0.6)",
        maxWidth: 880, textAlign: "right",
      }}>{s.title}</h1>
      <div style={{
        marginTop: 18, padding: "8px 16px", borderRadius: 999,
        background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(167,139,250,0.18))",
        border: "1px solid rgba(34,211,238,0.55)", direction: "ltr",
        color: "#e2f0ff", fontSize: 12, letterSpacing: 3, fontWeight: 800,
      }}>● {s.ai}</div>
    </div>
  );
};

const Scene: React.FC<{ s: Sim; idx: number; total: number }> = ({ s, idx, total }) => {
  const cam = useCamera(s.dur, idx % 3 === 0 ? "pull" : idx % 3 === 1 ? "push" : "orbit");
  const f = useCurrentFrame();
  const fadeIn = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(f, [s.dur - 20, s.dur], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#04060d", color: "#e2f0ff", fontFamily, opacity: fadeIn * fadeOut }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${cam.scale}) translate(${cam.tx}px, ${cam.ty}px)`, transformOrigin: "center" }}>
          <Img src={staticFile(`images/scenes/${s.bg}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(2,6,18,0.6) 0%, rgba(2,6,18,0.2) 40%, rgba(2,6,18,0.9) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 25%, rgba(2,4,10,0.85) 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.3, mixBlendMode: "screen" }}><TwinBackground /></AbsoluteFill>
      <Particles />
      <ScanSweep />

      <AppWindow s={s} dur={s.dur} />
      <Cursor dur={s.dur} />
      <TitleCard s={s} dur={s.dur} />

      <div style={{ position: "absolute", top: 56, left: 56, direction: "ltr", fontFamily: "monospace", fontSize: 11, color: "#7fb8ff", letterSpacing: 3, opacity: 0.85 }}>
        NEXUS · SIM · CH {String(idx + 1).padStart(2, "0")}/{String(total).padStart(2, "0")} · {String(Math.floor(f / 30)).padStart(2, "0")}s
      </div>
      <div style={{ position: "absolute", bottom: 36, left: 50, direction: "ltr", fontFamily: "monospace", fontSize: 10, color: "#7fb8ff88", letterSpacing: 2 }}>
        REC ● 1920×1080 · 30FPS · H264 · CINEMA · LIVE SIM
      </div>
      <div style={{ position: "absolute", bottom: 36, right: 50, display: "flex", alignItems: "center", gap: 14, opacity: 0.92, direction: "ltr" }}>
        <Img src={staticFile("images/nexus-icon.png")} style={{ width: 42, height: 42, borderRadius: 8 }} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, color: "#fff", fontFamily: "Inter, sans-serif" }}>NEXUS</div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#7fb8ff", fontFamily: "Inter, sans-serif" }}>AI OPERATING SYSTEM</div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 110, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10, direction: "ltr" }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ width: i === idx ? 48 : 22, height: 4, borderRadius: 4, background: i <= idx ? "#22d3ee" : "rgba(127,184,255,0.25)" }} />
        ))}
      </div>

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "#000" }} />
    </AbsoluteFill>
  );
};

export const SimAR3D: React.FC = () => {
  let acc = 0;
  return (
    <AbsoluteFill style={{ background: "#04060d" }}>
      <Audio src={staticFile("audio/steps-ar.mp3")} volume={1} />
      {SIMS.map((s, i) => {
        const from = acc;
        acc += s.dur;
        return (
          <Sequence key={i} from={from} durationInFrames={s.dur}>
            <Scene s={s} idx={i} total={SIMS.length} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
