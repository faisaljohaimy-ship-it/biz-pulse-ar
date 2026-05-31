import { AbsoluteFill, Audio, Sequence, useCurrentFrame, interpolate, spring, staticFile, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cairo";
import { TwinBackground } from "./scenes/TwinBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["arabic"] });

export const STEPS_AR3D_FPS = 30;

type Mod = { code: string; name: string; metric: string; value: string; tone: string };

const STEPS: Array<{
  dur: number;
  num: string;
  tag: string;
  title: string;
  ai: string;
  bg: string;
  cam: "pushIn" | "pullOut" | "panLeft" | "panRight" | "orbit";
  modules: Mod[];
}> = [
  {
    dur: 305, num: "٠٠", tag: "المشكلة", ai: "Diagnose · AI", bg: "s00-chaos.jpg", cam: "pullOut",
    title: "فوضى الأنظمة · كثرة البيانات · ضعف القرار",
    modules: [
      { code: "ERP", name: "Legacy ERP", metric: "Silos", value: "37", tone: "#f43f5e" },
      { code: "CRM", name: "Disconnected CRM", metric: "Drift", value: "62%", tone: "#f59e0b" },
      { code: "BI",  name: "Stale Dashboards", metric: "Lag",   value: "9 days", tone: "#a78bfa" },
    ],
  },
  {
    dur: 398, num: "٠١", tag: "الخطوة ١", ai: "Live Data · AI", bg: "s01-cockpit.jpg", cam: "pushIn",
    title: "ربط كل الأنظمة في سطح تنفيذي واحد",
    modules: [
      { code: "/cockpit",   name: "Executive Cockpit", metric: "Streams", value: "248", tone: "#22d3ee" },
      { code: "/integrations", name: "Integrations Hub", metric: "Connected", value: "100%", tone: "#34d399" },
      { code: "/dashboard", name: "Strategic Pulse",    metric: "Refresh",   value: "1.2s",  tone: "#7dd3fc" },
    ],
  },
  {
    dur: 373, num: "٠٢", tag: "الخطوة ٢", ai: "Live Analysis · AI", bg: "s02-fabric.jpg", cam: "panRight",
    title: "نسيج الذكاء يكشف الأنماط الخفيّة لحظياً",
    modules: [
      { code: "/fabric",      name: "Intelligence Fabric", metric: "Signals/s", value: "1.4M", tone: "#22d3ee" },
      { code: "/intelligence",name: "Signal Synthesis",     metric: "Patterns", value: "318",  tone: "#a78bfa" },
      { code: "/analytics",   name: "Realtime Analytics",   metric: "Models",   value: "42",   tone: "#34d399" },
    ],
  },
  {
    dur: 342, num: "٠٣", tag: "الخطوة ٣", ai: "Simulation · AI", bg: "s03-twin.jpg", cam: "orbit",
    title: "التوأم الرقمي · حاكِ قراراتك قبل تنفيذها",
    modules: [
      { code: "/digital-twin",  name: "Digital Twin",         metric: "Entities",    value: "11,402", tone: "#22d3ee" },
      { code: "/departments",   name: "Org Simulator",         metric: "Scenarios",   value: "64",     tone: "#f59e0b" },
      { code: "/orchestration", name: "Workflow Choreographer",metric: "Pipelines",   value: "186",    tone: "#a78bfa" },
    ],
  },
  {
    dur: 405, num: "٠٤", tag: "الخطوة ٤", ai: "Copilot · AI", bg: "s04-aria.jpg", cam: "pushIn",
    title: "آريا · مساعد تنفيذي بالعربية والإنجليزية",
    modules: [
      { code: "/assistant", name: "ARIA Copilot",       metric: "Languages", value: "AR · EN", tone: "#22d3ee" },
      { code: "/voice",     name: "Voice Channel",       metric: "Latency",   value: "320 ms",  tone: "#7dd3fc" },
      { code: "/agents",    name: "Specialist Agents",   metric: "Active",    value: "18",      tone: "#34d399" },
    ],
  },
  {
    dur: 348, num: "٠٥", tag: "الخطوة ٥", ai: "Predictive · AI", bg: "s05-predict.jpg", cam: "panLeft",
    title: "ذكاءٌ تنبّؤي يكشف المخاطر قبل وقوعها",
    modules: [
      { code: "/risk",      name: "Risk Radar",        metric: "Foresight", value: "30 days", tone: "#f59e0b" },
      { code: "/crisis",    name: "Crisis Playbooks",  metric: "Drills",    value: "27",      tone: "#f43f5e" },
      { code: "/forgotten", name: "Forgotten Signals", metric: "Recovered", value: "94%",     tone: "#22d3ee" },
    ],
  },
  {
    dur: 406, num: "٠٦", tag: "الخطوة ٦", ai: "Governance · AI", bg: "s06-gov.jpg", cam: "pushIn",
    title: "حوكمة ذكية · كل سياسة مرتبطة بنتيجة",
    modules: [
      { code: "/governance",     name: "Policy Graph",       metric: "Policies", value: "412",  tone: "#34d399" },
      { code: "/transformation", name: "Transformation OKRs",metric: "Aligned",  value: "98%",  tone: "#22d3ee" },
      { code: "/outcomes",       name: "Outcome Ledger",     metric: "Tracked",  value: "1,287",tone: "#a78bfa" },
    ],
  },
  {
    dur: 369, num: "٠٧", tag: "الخطوة ٧", ai: "Boardroom · AI", bg: "s07-board.jpg", cam: "pushIn",
    title: "تقرير مجلس الإدارة جاهز قبل بدء الاجتماع",
    modules: [
      { code: "/boardroom",     name: "Boardroom Briefing", metric: "Auto-Gen",  value: "T-15m", tone: "#22d3ee" },
      { code: "/briefing",      name: "Executive Brief",     metric: "Pages",     value: "12",    tone: "#fbbf24" },
      { code: "/chief-of-staff",name: "Chief of Staff AI",   metric: "Drafts",    value: "ready", tone: "#a78bfa" },
    ],
  },
  {
    dur: 365, num: "٠٨", tag: "الخطوة ٨", ai: "Memory · AI", bg: "s08-memory.jpg", cam: "orbit",
    title: "ذاكرة تنفيذية · لا قرارَ يضيع",
    modules: [
      { code: "/memory",    name: "Executive Memory", metric: "Decisions", value: "24,901", tone: "#a78bfa" },
      { code: "/decisions", name: "Decision Ledger",  metric: "Traceable", value: "100%",   tone: "#22d3ee" },
      { code: "/knowledge", name: "Knowledge Graph",  metric: "Nodes",     value: "612k",   tone: "#34d399" },
    ],
  },
  {
    dur: 353, num: "٠٩", tag: "الخلاصة", ai: "Nexus · Full Stack AI", bg: "s09-nexus.jpg", cam: "pullOut",
    title: "نظامٌ رقميٌّ شاملٌ متكاملٌ لحلّ مشكلات المؤسسات بالذكاء الاصطناعي",
    modules: [
      { code: "Layer 6", name: "Boardroom",          metric: "Decisions", value: "Live", tone: "#fbbf24" },
      { code: "Layer 4", name: "ARIA Copilot",        metric: "AR · EN",   value: "On",   tone: "#22d3ee" },
      { code: "Layer 2", name: "Intelligence Fabric", metric: "Signals",   value: "1.4M", tone: "#a78bfa" },
      { code: "Layer 0", name: "Sovereign Data",      metric: "Encrypted", value: "AES-256", tone: "#34d399" },
    ],
  },
];

export const STEPS_AR3D_DURATION = STEPS.reduce((a, s) => a + s.dur, 0);

// === Camera (Ken Burns w/ 3D parallax) ===
const useCamera = (cam: typeof STEPS[number]["cam"], dur: number) => {
  const f = useCurrentFrame();
  const t = f / dur;
  switch (cam) {
    case "pushIn":  return { scale: interpolate(t, [0, 1], [1.05, 1.22]), tx: interpolate(t, [0, 1], [0, -10]), ty: 0 };
    case "pullOut": return { scale: interpolate(t, [0, 1], [1.25, 1.05]), tx: 0, ty: interpolate(t, [0, 1], [0, 6]) };
    case "panLeft": return { scale: 1.18, tx: interpolate(t, [0, 1], [40, -40]), ty: 0 };
    case "panRight":return { scale: 1.18, tx: interpolate(t, [0, 1], [-40, 40]), ty: 0 };
    case "orbit":   return { scale: 1.15, tx: Math.sin(t * Math.PI) * 50, ty: Math.cos(t * Math.PI) * 22 };
  }
};

// === 3D holographic UI mockup window (looks like a Nexus route panel) ===
const HoloModule: React.FC<{ mod: Mod; idx: number; total: number; total_dur: number }> = ({ mod, idx, total, total_dur }) => {
  const f = useCurrentFrame();
  const delay = 28 + idx * 14;
  const p = spring({ frame: f - delay, fps: STEPS_AR3D_FPS, config: { damping: 14, stiffness: 95 } });
  const out = interpolate(f, [total_dur - 26, total_dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = p * (1 - out);
  const lift = interpolate(p, [0, 1], [40, 0]);
  // arrange on a 3D arc on the LEFT side (since title is on right for RTL)
  const angle = (idx - (total - 1) / 2) * 14;
  const yOffset = (idx - (total - 1) / 2) * 150;
  const float = Math.sin((f + idx * 30) / 32) * 8;
  return (
    <div style={{
      position: "absolute", left: 90, top: 240 + yOffset, width: 460,
      perspective: 1400, opacity, transform: `translateY(${lift + float}px)`,
      direction: "ltr",
    }}>
      <div style={{
        transform: `rotateY(${angle}deg) rotateX(-3deg)`,
        transformStyle: "preserve-3d",
        background: "linear-gradient(135deg, rgba(8,18,38,0.78), rgba(8,18,38,0.55))",
        border: `1px solid ${mod.tone}55`,
        borderRadius: 14,
        boxShadow: `0 30px 80px -20px ${mod.tone}55, inset 0 1px 0 rgba(255,255,255,0.08)`,
        padding: "16px 20px",
        backdropFilter: "blur(0px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 9, height: 9, borderRadius: 99, background: mod.tone, boxShadow: `0 0 12px ${mod.tone}` }} />
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#7fb8ff", letterSpacing: 2 }}>{mod.code}</div>
          <div style={{ marginLeft: "auto", fontSize: 9, color: "#7fb8ff88", letterSpacing: 2 }}>LIVE</div>
        </div>
        <div style={{ color: "#fff", fontSize: 19, fontWeight: 800, letterSpacing: 0.2, marginBottom: 14, fontFamily: "Inter, sans-serif" }}>
          {mod.name}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 10, color: "#7fb8ff", letterSpacing: 2, textTransform: "uppercase" }}>{mod.metric}</div>
          <div style={{ fontSize: 28, color: mod.tone, fontWeight: 800, fontFamily: "monospace", textShadow: `0 0 20px ${mod.tone}88` }}>
            {mod.value}
          </div>
        </div>
        {/* sparkline */}
        <svg width="100%" height={24} style={{ marginTop: 8 }}>
          {Array.from({ length: 26 }).map((_, i) => {
            const h = 4 + Math.abs(Math.sin((f + idx * 12 + i * 0.7) / 8)) * 18;
            return <rect key={i} x={i * 17} y={24 - h} width={11} height={h} fill={mod.tone} opacity={0.4 + (i / 26) * 0.5} rx={1} />;
          })}
        </svg>
      </div>
    </div>
  );
};

const Crosshair: React.FC = () => {
  const f = useCurrentFrame();
  const r = 220 + Math.sin(f / 18) * 14;
  return (
    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <g transform="translate(1380, 540)" stroke="#22d3ee" fill="none" opacity={0.45}>
        <circle r={r} strokeWidth={1.2} strokeDasharray="3 8" />
        <circle r={r * 0.7} strokeWidth={1} strokeDasharray="2 6" opacity={0.6} />
        <line x1={-r} y1={0} x2={r} y2={0} strokeWidth={0.5} opacity={0.5} />
        <line x1={0} y1={-r} x2={0} y2={r} strokeWidth={0.5} opacity={0.5} />
      </g>
    </svg>
  );
};

const Particles: React.FC = () => {
  const f = useCurrentFrame();
  const parts = Array.from({ length: 60 }).map((_, i) => {
    const seed = i * 137.5;
    const x = (seed % 1920);
    const y = ((f * 0.6 + seed * 1.3) % 1080);
    const r = 0.6 + (i % 5) * 0.4;
    const op = 0.15 + (i % 4) * 0.12;
    return <circle key={i} cx={x} cy={y} r={r} fill="#7fb8ff" opacity={op} />;
  });
  return <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width="100%" height="100%">{parts}</svg>;
};

const ScanSweep: React.FC = () => {
  const f = useCurrentFrame();
  const y = (f * 4) % 1200 - 100;
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, top: y, height: 3,
      background: "linear-gradient(180deg, transparent, rgba(34,211,238,0.22), transparent)",
      pointerEvents: "none", mixBlendMode: "screen",
    }} />
  );
};

const TitleCard: React.FC<{ step: typeof STEPS[number] }> = ({ step }) => {
  const f = useCurrentFrame();
  const inP = spring({ frame: f, fps: STEPS_AR3D_FPS, config: { damping: 18, stiffness: 90 } });
  const outP = interpolate(f, [step.dur - 30, step.dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = inP * (1 - outP);
  const ty = interpolate(inP, [0, 1], [40, 0]);
  const lineW = interpolate(inP, [0, 1], [0, 320]);
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      justifyContent: "flex-end", alignItems: "flex-end",
      padding: "0 90px 170px 90px", direction: "rtl",
      transform: `translateY(${ty}px)`, opacity, pointerEvents: "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
        <div style={{ width: lineW, height: 2, background: "linear-gradient(90deg, transparent, #22d3ee)" }} />
        <span style={{ color: "#7fb8ff", fontSize: 16, letterSpacing: 6, fontWeight: 800 }}>
          {step.tag} · {step.num}
        </span>
      </div>
      <h1 style={{
        color: "#fff", fontSize: 64, lineHeight: 1.22, margin: 0, fontWeight: 800,
        letterSpacing: -0.5,
        textShadow: "0 8px 40px rgba(34,211,238,0.4), 0 2px 0 rgba(0,0,0,0.6)",
        maxWidth: 1100, textAlign: "right",
      }}>
        {step.title}
      </h1>
    </div>
  );
};

const AiBadge: React.FC<{ label: string }> = ({ label }) => {
  const f = useCurrentFrame();
  const p = spring({ frame: f - 18, fps: STEPS_AR3D_FPS, config: { damping: 14, stiffness: 110 } });
  return (
    <div style={{
      position: "absolute", top: 56, right: 56, direction: "ltr",
      opacity: p, transform: `translateY(${interpolate(p, [0, 1], [-12, 0])}px)`,
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 18px", borderRadius: 999,
      background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(167,139,250,0.18))",
      border: "1px solid rgba(34,211,238,0.55)",
      boxShadow: "0 12px 40px -8px rgba(34,211,238,0.45)",
      color: "#e2f0ff", fontSize: 13, letterSpacing: 3, fontWeight: 800,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: 999, background: "#22d3ee", boxShadow: "0 0 14px #22d3ee" }} />
      {label}
    </div>
  );
};

const CornerHUD: React.FC<{ idx: number; total: number }> = ({ idx, total }) => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{
        position: "absolute", top: 56, left: 56, direction: "ltr",
        fontFamily: "monospace", fontSize: 11, color: "#7fb8ff", letterSpacing: 3, opacity: 0.85,
      }}>
        NEXUS · OS · CH {String(idx + 1).padStart(2, "0")}/{String(total).padStart(2, "0")} · {String(Math.floor(f / 30)).padStart(2, "0")}s
      </div>
      <div style={{
        position: "absolute", bottom: 36, left: 50, direction: "ltr",
        fontFamily: "monospace", fontSize: 10, color: "#7fb8ff88", letterSpacing: 2,
      }}>
        REC ● 1920×1080 · 30FPS · H264 · CINEMA
      </div>
    </>
  );
};

const ProgressRail: React.FC<{ idx: number; total: number }> = ({ idx, total }) => {
  const f = useCurrentFrame();
  return (
    <div style={{
      position: "absolute", bottom: 110, left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: 10, direction: "ltr",
    }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === idx;
        const done = i < idx;
        const pulse = active ? (0.6 + Math.sin(f / 6) * 0.4) : 1;
        return (
          <div key={i} style={{
            width: active ? 48 : 22, height: 4, borderRadius: 4,
            background: done ? "#22d3ee" : active ? "#22d3ee" : "rgba(127,184,255,0.25)",
            opacity: active ? pulse : 1,
          }} />
        );
      })}
    </div>
  );
};

const Step: React.FC<{ step: typeof STEPS[number]; idx: number }> = ({ step, idx }) => {
  const cam = useCamera(step.cam, step.dur);
  const f = useCurrentFrame();
  const fadeIn = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(f, [step.dur - 20, step.dur], [1, 0], { extrapolateLeft: "clamp" });
  const alpha = fadeIn * fadeOut;
  return (
    <AbsoluteFill style={{ background: "#04060d", color: "#e2f0ff", fontFamily, opacity: alpha }}>
      {/* 3D camera-moved AI scene */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          transform: `scale(${cam.scale}) translate(${cam.tx}px, ${cam.ty}px)`,
          transformOrigin: "center",
        }}>
          <Img src={staticFile(`images/scenes/${step.bg}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </AbsoluteFill>

      {/* Color grade + vignette */}
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, rgba(2,6,18,0.55) 0%, rgba(2,6,18,0.15) 35%, rgba(2,6,18,0.85) 100%)",
        pointerEvents: "none",
      }} />
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(2,4,10,0.85) 100%)",
        pointerEvents: "none",
      }} />

      {/* 3D wireframe twin overlay (subtle, mix-blend) */}
      <AbsoluteFill style={{ opacity: 0.35, mixBlendMode: "screen" }}>
        <TwinBackground />
      </AbsoluteFill>

      <Particles />
      <Crosshair />
      <ScanSweep />

      {/* Holographic Nexus module windows (real system references) */}
      {step.modules.map((m, i) => (
        <HoloModule key={i} mod={m} idx={i} total={step.modules.length} total_dur={step.dur} />
      ))}

      <AiBadge label={step.ai} />
      <CornerHUD idx={idx} total={STEPS.length} />
      <TitleCard step={step} />
      <ProgressRail idx={idx} total={STEPS.length} />

      {/* Nexus brand mark */}
      <div style={{ position: "absolute", bottom: 36, right: 50, display: "flex", alignItems: "center", gap: 14, opacity: 0.92, direction: "ltr" }}>
        <Img src={staticFile("images/nexus-icon.png")} style={{ width: 42, height: 42, borderRadius: 8 }} />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, color: "#fff", fontFamily: "Inter, sans-serif" }}>NEXUS</div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#7fb8ff", fontFamily: "Inter, sans-serif" }}>AI OPERATING SYSTEM</div>
        </div>
      </div>

      {/* Letterbox bars */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 60, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "#000" }} />
    </AbsoluteFill>
  );
};

export const StepsAR3D: React.FC = () => {
  let acc = 0;
  return (
    <AbsoluteFill style={{ background: "#04060d" }}>
      <Audio src={staticFile("audio/steps-ar.mp3")} volume={1} />
      {STEPS.map((s, i) => {
        const from = acc;
        acc += s.dur;
        return (
          <Sequence key={i} from={from} durationInFrames={s.dur}>
            <Step step={s} idx={i} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
