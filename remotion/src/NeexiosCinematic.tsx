import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";
import { TwinBackground } from "./scenes/TwinBackground";

const inter = loadInter("normal", { weights: ["300","400","600","700","800","900"], subsets: ["latin"] });
const cairo = loadCairo("normal", { weights: ["400","600","700","800","900"], subsets: ["arabic"] });

export const NX_FPS = 30;
// Scene durations (seconds)
const D = [14, 14, 14, 14, 14, 14, 14, 16, 14, 18];
const SEC_TO_F = (s: number) => Math.round(s * NX_FPS);
const STARTS = D.reduce<number[]>((acc, d, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SEC_TO_F(D[i - 1]));
  return acc;
}, []);
const TOTAL_SEC = D.reduce((a, b) => a + b, 0);
export const NX_DURATION = SEC_TO_F(TOTAL_SEC);

// Narration: AR line + EN subtitle, AR on-screen title
const LINES = [
  { ar: "مرحباً بكم في مستقبل الذكاء الاصطناعي المؤسسي", en: "Welcome to the future of enterprise AI", title_ar: "نِكسَس", title_en: "NEEXIOS AI OS" },
  { ar: "نِكسَس… نظام التشغيل الذكي للمؤسسات الوطنية", en: "The AI operating system for national enterprises", title_ar: "نظام التشغيل المؤسسي", title_en: "Enterprise AI OS" },
  { ar: "مركز قيادة تنفيذي… كل قرار استراتيجي في سطح واحد", en: "Executive command center — every strategic decision on one surface", title_ar: "قمرة القيادة التنفيذية", title_en: "Executive Command Center" },
  { ar: "عمليات الحج… ملايين الحجاج… في الوقت الحقيقي", en: "Hajj operations — millions of pilgrims, in real time", title_ar: "منصة عمليات الحج", title_en: "Hajj Operations Platform" },
  { ar: "إدارة قوى عاملة ذكية… كل موظفٍ في المكان الصحيح", en: "Smart workforce — every person in the right place", title_ar: "إدارة القوى العاملة الذكية", title_en: "Smart Workforce Management" },
  { ar: "ذكاءٌ تنبّؤي… وتوأمٌ رقمي يُحاكي مؤسستك بأكملها", en: "Predictive intelligence and a digital twin of your enterprise", title_ar: "التحليلات التنبّؤية والتوأم الرقمي", title_en: "Predictive Analytics + Digital Twin" },
  { ar: "وكلاء ذكاءٍ اصطناعي… يعملون بلا توقف", en: "Autonomous AI agents — working without pause", title_ar: "وكلاء الذكاء الاصطناعي", title_en: "Autonomous AI Agents" },
  { ar: "قبل الذكاء الاصطناعي… فوضى. بعد نِكسَس… انضباطٌ كامل", en: "Before AI — chaos. After NEEXIOS — total discipline.", title_ar: "قبل وبعد", title_en: "Before vs. After" },
  { ar: "جاهزٌ للمؤسسات. جاهزٌ للحكومات. جاهزٌ للاستحواذ", en: "Enterprise-ready. Government-ready. Acquisition-ready.", title_ar: "جاهزية المستثمرين", title_en: "Investor Readiness" },
  { ar: "نِكسَس… منصّةُ الذكاء الاصطناعي المؤسسية القادمة", en: "NEEXIOS AI OS — The Next Generation Enterprise AI Platform", title_ar: "نِكسَس", title_en: "www.neexios.com" },
];

// =================== Reusable bits ===================

const Vignette: React.FC = () => (
  <AbsoluteFill style={{
    background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)",
    pointerEvents: "none",
  }} />
);

const Particles: React.FC<{ count?: number; tone?: string; speed?: number }> = ({ count = 60, tone = "#d4af37", speed = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height}>
        {Array.from({ length: count }).map((_, i) => {
          const seed = i * 73.1;
          const x = ((Math.sin(seed) * 0.5 + 0.5) * width + frame * speed * (i % 2 ? 0.3 : -0.2)) % width;
          const y = (height - ((frame * speed * (0.5 + (i % 5) * 0.1) + seed * 17) % (height + 60)));
          const r = 1 + Math.abs(Math.sin(seed * 2)) * 2.5;
          const op = 0.25 + Math.abs(Math.sin(seed + frame / 30)) * 0.6;
          return (
            <g key={i}>
              <circle cx={(x + width) % width} cy={y} r={r * 3} fill={tone} opacity={op * 0.15} />
              <circle cx={(x + width) % width} cy={y} r={r} fill={tone} opacity={op} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

const ScanLine: React.FC = () => {
  const frame = useCurrentFrame();
  const y = (frame * 4) % 100;
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, transparent ${y}%, rgba(212,175,55,0.06) ${y + 1.5}%, transparent ${y + 3}%)`,
      mixBlendMode: "screen", pointerEvents: "none",
    }} />
  );
};

const SubtitleBar: React.FC<{ ar: string; en: string; titleAr: string; titleEn: string }> = ({ ar, en, titleAr, titleEn }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [8, 18], [0, 1], { extrapolateRight: "clamp" });
  return (
    <>
      {/* Top bilingual title row */}
      <div style={{
        position: "absolute", top: 60, left: 80, right: 80,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        opacity: op,
      }}>
        <div style={{ fontFamily: inter.fontFamily, fontSize: 28, fontWeight: 700, letterSpacing: 6, color: "#d4af37", textTransform: "uppercase" }}>
          {titleEn}
        </div>
        <div style={{ fontFamily: cairo.fontFamily, fontSize: 36, fontWeight: 800, color: "#d4af37", direction: "rtl" }}>
          {titleAr}
        </div>
      </div>
      {/* Bottom subtitle block */}
      <div style={{
        position: "absolute", bottom: 110, left: 80, right: 80,
        textAlign: "center", opacity: op,
      }}>
        <div style={{ fontFamily: cairo.fontFamily, fontSize: 44, fontWeight: 700, color: "#fff", lineHeight: 1.4, direction: "rtl", marginBottom: 18, textShadow: "0 2px 24px rgba(0,0,0,0.85)" }}>
          {ar}
        </div>
        <div style={{ fontFamily: inter.fontFamily, fontSize: 28, fontWeight: 400, color: "#cfe7ff", letterSpacing: 1, textShadow: "0 2px 16px rgba(0,0,0,0.85)" }}>
          {en}
        </div>
      </div>
    </>
  );
};

// =================== Scenes ===================

// Scene 0: Logo emerges from particles
const SceneOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoScale = spring({ frame: frame - 40, fps, config: { damping: 18, stiffness: 80 } });
  const logoOp = interpolate(frame, [40, 90], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [110, 170], [0, 600], { extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [150, 190], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Particles count={80} tone="#d4af37" speed={0.6} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{
          opacity: logoOp,
          transform: `scale(${0.6 + logoScale * 0.4})`,
          fontFamily: inter.fontFamily,
          fontSize: 140, fontWeight: 900, letterSpacing: 18,
          color: "#fff",
          textShadow: "0 0 60px rgba(212,175,55,0.6), 0 0 120px rgba(212,175,55,0.3)",
        }}>
          NEEXIOS
        </div>
        <div style={{ height: 2, width: lineW, background: "linear-gradient(90deg,transparent,#d4af37,transparent)", marginTop: 24 }} />
        <div style={{
          opacity: subOp, marginTop: 30,
          fontFamily: inter.fontFamily, fontSize: 22, fontWeight: 400, letterSpacing: 12, color: "#d4af37",
        }}>
          AI OPERATING SYSTEM
        </div>
        <div style={{
          opacity: subOp, marginTop: 16,
          fontFamily: cairo.fontFamily, fontSize: 28, fontWeight: 600, color: "#cfe7ff", direction: "rtl",
        }}>
          نظام التشغيل الذكي للمؤسسات
        </div>
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};

// Scene 1: NEEXIOS intro — orbiting nodes (re-uses TwinBackground)
const SceneTwin: React.FC = () => (
  <AbsoluteFill style={{ background: "#04060d" }}>
    <TwinBackground />
    <Vignette />
  </AbsoluteFill>
);

// Scene 2: Executive Command Center — KPI grid
const SceneCockpit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kpis = [
    { label: "REVENUE", value: 247.3, suffix: "M", delta: "+18.4%", tone: "#34d399" },
    { label: "DECISIONS", value: 1842, suffix: "", delta: "+312", tone: "#22d3ee" },
    { label: "RISK INDEX", value: 12.4, suffix: "", delta: "-6.1", tone: "#f59e0b" },
    { label: "AGENTS LIVE", value: 96, suffix: "%", delta: "+2.1%", tone: "#a78bfa" },
    { label: "TWIN SYNC", value: 99.8, suffix: "%", delta: "OK", tone: "#34d399" },
    { label: "BRIEFINGS", value: 38, suffix: "", delta: "+12", tone: "#7dd3fc" },
  ];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#02030a 0%,#061226 100%)" }}>
      <TwinBackground />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 28, padding: 80, width: "78%", maxWidth: 1400 }}>
          {kpis.map((k, i) => {
            const s = spring({ frame: frame - 30 - i * 6, fps, config: { damping: 14 } });
            const v = k.value * Math.min(1, Math.max(0, (frame - 40 - i * 6) / 40));
            return (
              <div key={i} style={{
                transform: `translateY(${(1 - s) * 30}px) scale(${0.92 + s * 0.08})`,
                opacity: s,
                background: "linear-gradient(135deg,rgba(20,40,80,0.55),rgba(8,16,32,0.55))",
                border: "1px solid rgba(212,175,55,0.25)",
                borderRadius: 18, padding: 28,
                boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}>
                <div style={{ fontFamily: inter.fontFamily, fontSize: 13, letterSpacing: 4, color: "#7fb8ff", fontWeight: 700 }}>{k.label}</div>
                <div style={{ fontFamily: inter.fontFamily, fontSize: 56, fontWeight: 800, color: "#fff", marginTop: 10 }}>
                  {Number.isInteger(k.value) ? Math.round(v) : v.toFixed(1)}{k.suffix}
                </div>
                <div style={{ fontFamily: inter.fontFamily, fontSize: 16, fontWeight: 700, color: k.tone, marginTop: 6 }}>{k.delta}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <ScanLine />
      <Vignette />
    </AbsoluteFill>
  );
};

// Scene 3: Hajj Operations — satellite-style map with pulsing nodes
const SceneHajj: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cx = width / 2, cy = height / 2;
  const sites = [
    { name: "MAKKAH", ar: "مكة", x: 0, y: 0, count: "2.4M" },
    { name: "MINA", ar: "منى", x: 180, y: -60, count: "890K" },
    { name: "ARAFAT", ar: "عرفات", x: 340, y: 40, count: "1.2M" },
    { name: "MUZDALIFAH", ar: "مزدلفة", x: 260, y: 120, count: "640K" },
    { name: "MADINAH", ar: "المدينة", x: -360, y: -160, count: "510K" },
    { name: "JEDDAH", ar: "جدة", x: -260, y: 140, count: "320K" },
  ];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%,#1a3552 0%,#04060d 70%)" }}>
      {/* Map grid */}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <line key={`h${i}`} x1={0} x2={width} y1={(i + 1) * (height / 31)} y2={(i + 1) * (height / 31)} stroke="#22d3ee" strokeWidth={0.5} opacity={0.2} />
        ))}
        {Array.from({ length: 40 }).map((_, i) => (
          <line key={`v${i}`} x1={(i + 1) * (width / 41)} x2={(i + 1) * (width / 41)} y1={0} y2={height} stroke="#22d3ee" strokeWidth={0.5} opacity={0.2} />
        ))}
        {/* connecting routes */}
        {sites.map((s, i) => (
          <line key={i} x1={cx} y1={cy} x2={cx + s.x} y2={cy + s.y} stroke="#d4af37" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="4 6" />
        ))}
        {/* pulsing nodes */}
        {sites.map((s, i) => {
          const pulse = (Math.sin(frame / 8 + i) + 1) / 2;
          return (
            <g key={i}>
              <circle cx={cx + s.x} cy={cy + s.y} r={10 + pulse * 18} fill="#d4af37" opacity={0.15 + pulse * 0.15} />
              <circle cx={cx + s.x} cy={cy + s.y} r={6} fill="#d4af37" />
              <circle cx={cx + s.x} cy={cy + s.y} r={3} fill="#fff" />
            </g>
          );
        })}
      </svg>
      {/* labels (HTML for fonts) */}
      {sites.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          left: cx + s.x + 16, top: cy + s.y - 18,
          fontFamily: inter.fontFamily, fontSize: 14, fontWeight: 700, letterSpacing: 2, color: "#d4af37",
        }}>
          {s.name} · <span style={{ color: "#fff" }}>{s.count}</span>
          <div style={{ fontFamily: cairo.fontFamily, fontSize: 16, color: "#cfe7ff", fontWeight: 600, marginTop: 2 }}>{s.ar}</div>
        </div>
      ))}
      {/* live counter */}
      <div style={{ position: "absolute", top: 180, left: 100, fontFamily: inter.fontFamily, color: "#fff" }}>
        <div style={{ fontSize: 14, letterSpacing: 4, color: "#22d3ee", fontWeight: 700 }}>LIVE · PILGRIMS TRACKED</div>
        <div style={{ fontSize: 72, fontWeight: 900, marginTop: 6 }}>
          {Math.round(5_980_000 + Math.sin(frame / 6) * 4000 + frame * 12).toLocaleString()}
        </div>
      </div>
      <ScanLine />
      <Vignette />
    </AbsoluteFill>
  );
};

// Scene 4: Smart Workforce — animated org grid
const SceneWorkforce: React.FC = () => {
  const frame = useCurrentFrame();
  const cols = 14, rows = 8;
  const cells: JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const delay = (i * 1.5) % 90;
      const on = ((frame - delay) % 120) < 60;
      const pulse = Math.sin((frame - delay) / 8) * 0.5 + 0.5;
      const tone = on ? "#34d399" : "#22d3ee";
      const op = 0.25 + pulse * 0.55;
      cells.push(
        <div key={i} style={{
          width: 60, height: 60, borderRadius: 12,
          background: `linear-gradient(135deg, ${tone}40, ${tone}10)`,
          border: `1px solid ${tone}80`,
          opacity: op,
          boxShadow: on ? `0 0 24px ${tone}66` : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: inter.fontFamily, fontSize: 11, color: "#fff", fontWeight: 700,
        }}>
          {String.fromCharCode(65 + (i % 26))}
        </div>,
      );
    }
  }
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#02030a 0%,#0a1a2e 100%)" }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{
          display: "grid", gridTemplateColumns: `repeat(${cols}, 60px)`, gap: 14,
          padding: 60,
        }}>{cells}</div>
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 180, left: 100, fontFamily: inter.fontFamily, color: "#fff" }}>
        <div style={{ fontSize: 14, letterSpacing: 4, color: "#34d399", fontWeight: 700 }}>WORKFORCE ALLOCATION · LIVE</div>
        <div style={{ fontSize: 60, fontWeight: 900, marginTop: 6 }}>{Math.round(42_840 + frame * 3).toLocaleString()} <span style={{ fontSize: 24, color: "#7fb8ff" }}>people · 96.4% match</span></div>
      </div>
      <Vignette />
    </AbsoluteFill>
  );
};

// Scene 5: Predictive analytics — animated chart
const SceneChart: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const w = width * 0.7, h = 320;
  const x0 = (width - w) / 2, y0 = height / 2 - 40;
  const N = 60;
  const points = Array.from({ length: N }).map((_, i) => {
    const x = x0 + (i / (N - 1)) * w;
    const base = 0.5 + Math.sin(i * 0.25) * 0.18 + (i / N) * 0.4;
    const noise = Math.sin(i * 1.7 + frame / 12) * 0.05;
    const yv = y0 + h - base * h - noise * h;
    return { x, y: yv, i };
  });
  const reveal = interpolate(frame, [20, 110], [0, points.length], { extrapolateRight: "clamp" });
  const path = points.slice(0, Math.floor(reveal)).map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  // forecast (lighter, dashed)
  const fcPath = points.slice(Math.floor(reveal)).map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#04060d 0%,#0a1a2e 100%)" }}>
      <TwinBackground />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {/* axis */}
        <line x1={x0} x2={x0 + w} y1={y0 + h} y2={y0 + h} stroke="#22d3ee" strokeOpacity={0.5} />
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={i} x1={x0} x2={x0 + w} y1={y0 + h * t} y2={y0 + h * t} stroke="#22d3ee" strokeOpacity={0.15} strokeDasharray="3 6" />
        ))}
        {/* area under curve */}
        <path d={`${path} L${points[Math.max(0, Math.floor(reveal) - 1)]?.x ?? x0},${y0 + h} L${x0},${y0 + h} Z`}
          fill="url(#grad)" opacity={0.5} />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={path} stroke="#d4af37" strokeWidth={3} fill="none" />
        <path d={fcPath} stroke="#d4af37" strokeWidth={2} fill="none" strokeDasharray="6 6" opacity={0.55} />
        {/* current point */}
        {points[Math.floor(reveal) - 1] && (
          <>
            <circle cx={points[Math.floor(reveal) - 1].x} cy={points[Math.floor(reveal) - 1].y} r={14} fill="#d4af37" opacity={0.3} />
            <circle cx={points[Math.floor(reveal) - 1].x} cy={points[Math.floor(reveal) - 1].y} r={6} fill="#fff" />
          </>
        )}
      </svg>
      <div style={{ position: "absolute", top: 180, left: 100, fontFamily: inter.fontFamily, color: "#fff" }}>
        <div style={{ fontSize: 14, letterSpacing: 4, color: "#d4af37", fontWeight: 700 }}>FORECAST · NEXT 12 WEEKS</div>
        <div style={{ fontSize: 60, fontWeight: 900, marginTop: 6 }}>+{(18 + Math.sin(frame / 30) * 0.6).toFixed(1)}%<span style={{ fontSize: 22, color: "#7fb8ff", marginLeft: 16 }}>vs baseline</span></div>
      </div>
      <Vignette />
    </AbsoluteFill>
  );
};

// Scene 6: AI Agents — orbiting agent nodes
const SceneAgents: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cx = width / 2, cy = height / 2 + 20;
  const agents = ["FINANCE","OPS","RISK","HR","SALES","LEGAL","SECURITY","DATA","BOARD","STRAT"];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%,#0a1a2e 0%,#02030a 70%)" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {[1, 1.4, 1.8].map((r, i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={280 * r} ry={120 * r} fill="none" stroke="#22d3ee" strokeOpacity={0.2 - i * 0.04} strokeDasharray="2 8" />
        ))}
        {agents.map((a, i) => {
          const a0 = (i / agents.length) * Math.PI * 2 + frame / 90;
          const r = 380;
          const x = cx + Math.cos(a0) * r;
          const y = cy + Math.sin(a0) * 160;
          const tone = ["#d4af37","#22d3ee","#a78bfa","#34d399","#f59e0b"][i % 5];
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={tone} strokeOpacity={0.4} strokeWidth={1} />
              <circle cx={x} cy={y} r={28} fill={tone} opacity={0.18} />
              <circle cx={x} cy={y} r={14} fill={tone} />
              <text x={x} y={y + 50} textAnchor="middle" fill="#cfe7ff" fontFamily="Inter, sans-serif" fontSize={13} fontWeight={800} letterSpacing={2}>{a}</text>
            </g>
          );
        })}
        {/* core */}
        <circle cx={cx} cy={cy} r={70} fill="#d4af37" opacity={0.15} />
        <circle cx={cx} cy={cy} r={40} fill="#d4af37" opacity={0.4} />
        <circle cx={cx} cy={cy} r={20} fill="#fff" />
        <text x={cx} y={cy + 6} textAnchor="middle" fill="#000" fontFamily="Inter, sans-serif" fontSize={16} fontWeight={900}>ARIA</text>
      </svg>
      <ScanLine />
      <Vignette />
    </AbsoluteFill>
  );
};

// Scene 7: Before vs After (split screen)
const SceneBeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const split = spring({ frame: frame - 10, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* Left: chaos */}
      <div style={{
        position: "absolute", left: 0, top: 0, width: width / 2, height: "100%",
        background: "radial-gradient(circle at 30% 50%,#3a0a0a 0%,#0a0202 80%)",
        opacity: 0.4 + split * 0.6,
      }}>
        <Particles count={40} tone="#f43f5e" speed={2.5} />
        <div style={{ position: "absolute", top: 200, left: 80, fontFamily: inter.fontFamily, color: "#fff" }}>
          <div style={{ fontSize: 18, letterSpacing: 6, color: "#f43f5e", fontWeight: 700 }}>BEFORE AI</div>
          <div style={{ fontFamily: cairo.fontFamily, fontSize: 28, fontWeight: 700, color: "#f87171", marginTop: 6, direction: "rtl" }}>قبل الذكاء الاصطناعي</div>
          <div style={{ marginTop: 40, fontSize: 22, color: "#fca5a5", lineHeight: 2 }}>
            <div>· 14 disconnected systems</div>
            <div>· 38% data conflicts</div>
            <div>· 9-day decision cycles</div>
            <div>· $4.2M annual waste</div>
            <div>· 23% executive blind spots</div>
          </div>
        </div>
      </div>
      {/* Right: order */}
      <div style={{
        position: "absolute", right: 0, top: 0, width: width / 2, height: "100%",
        background: "radial-gradient(circle at 70% 50%,#0a2a1a 0%,#02060a 80%)",
        opacity: split,
      }}>
        <Particles count={40} tone="#34d399" speed={0.4} />
        <div style={{ position: "absolute", top: 200, right: 80, textAlign: "right", fontFamily: inter.fontFamily, color: "#fff" }}>
          <div style={{ fontSize: 18, letterSpacing: 6, color: "#34d399", fontWeight: 700 }}>AFTER NEEXIOS</div>
          <div style={{ fontFamily: cairo.fontFamily, fontSize: 28, fontWeight: 700, color: "#86efac", marginTop: 6, direction: "rtl" }}>بعد نِكسَس</div>
          <div style={{ marginTop: 40, fontSize: 22, color: "#a7f3d0", lineHeight: 2 }}>
            <div>1 unified AI surface ·</div>
            <div>99.8% data integrity ·</div>
            <div>real-time decisions ·</div>
            <div>+$11.6M value created ·</div>
            <div>0 executive blind spots ·</div>
          </div>
        </div>
      </div>
      {/* divider */}
      <div style={{
        position: "absolute", left: width / 2 - 1, top: 0, width: 2, height: "100%",
        background: "linear-gradient(180deg,transparent,#d4af37,transparent)",
        boxShadow: "0 0 30px #d4af37",
      }} />
      <Vignette />
    </AbsoluteFill>
  );
};

// Scene 8: Investor readiness — stat cards
const SceneInvestor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { k: "VALUATION", v: "$120M", sub: "Series A target", tone: "#d4af37" },
    { k: "TAM", v: "$48B", sub: "MENA Enterprise AI", tone: "#22d3ee" },
    { k: "ARR", v: "$3.2M", sub: "Pipeline qualified", tone: "#34d399" },
    { k: "READINESS", v: "92/100", sub: "Acquisition-grade", tone: "#a78bfa" },
  ];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#02030a 0%,#0c1a3a 100%)" }}>
      <Particles count={50} tone="#d4af37" speed={0.3} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32, padding: 100, width: "84%" }}>
          {stats.map((s, i) => {
            const sp = spring({ frame: frame - 30 - i * 10, fps, config: { damping: 14 } });
            return (
              <div key={i} style={{
                opacity: sp,
                transform: `translateY(${(1 - sp) * 40}px)`,
                background: "linear-gradient(135deg,rgba(20,40,80,0.6),rgba(8,16,32,0.6))",
                border: `1px solid ${s.tone}55`, borderRadius: 22, padding: 36,
                boxShadow: `0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 40px ${s.tone}22`,
              }}>
                <div style={{ fontFamily: inter.fontFamily, fontSize: 13, letterSpacing: 5, color: s.tone, fontWeight: 800 }}>{s.k}</div>
                <div style={{ fontFamily: inter.fontFamily, fontSize: 62, fontWeight: 900, color: "#fff", marginTop: 14, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontFamily: inter.fontFamily, fontSize: 16, color: "#7fb8ff", marginTop: 14 }}>{s.sub}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 40, display: "flex", gap: 40, fontFamily: inter.fontFamily, fontSize: 16, letterSpacing: 4, color: "#d4af37", fontWeight: 700 }}>
          <span>ENTERPRISE</span><span>·</span><span>GOVERNMENT</span><span>·</span><span>ACQUISITION</span>
        </div>
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};

// Scene 9: Final logo
const SceneFinal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame, fps, config: { damping: 18, stiffness: 60 } });
  const urlOp = interpolate(frame, [180, 240], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Particles count={100} tone="#d4af37" speed={0.4} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{
          opacity: sp,
          transform: `scale(${0.7 + sp * 0.3})`,
          fontFamily: inter.fontFamily,
          fontSize: 160, fontWeight: 900, letterSpacing: 22,
          color: "#fff",
          textShadow: "0 0 80px rgba(212,175,55,0.8), 0 0 160px rgba(212,175,55,0.4)",
        }}>
          NEEXIOS
        </div>
        <div style={{
          opacity: sp, marginTop: 20,
          fontFamily: inter.fontFamily, fontSize: 24, fontWeight: 400, letterSpacing: 16, color: "#d4af37",
        }}>
          AI OPERATING SYSTEM
        </div>
        <div style={{
          opacity: sp, marginTop: 40,
          fontFamily: cairo.fontFamily, fontSize: 32, fontWeight: 700, color: "#cfe7ff", direction: "rtl",
        }}>
          منصة الذكاء الاصطناعي المؤسسية القادمة
        </div>
        <div style={{
          opacity: sp, marginTop: 8,
          fontFamily: inter.fontFamily, fontSize: 22, fontWeight: 400, color: "#cfe7ff",
        }}>
          The Next Generation Enterprise AI Platform
        </div>
        <div style={{
          opacity: urlOp, marginTop: 60,
          fontFamily: inter.fontFamily, fontSize: 28, fontWeight: 700, letterSpacing: 8, color: "#d4af37",
          padding: "16px 40px",
          border: "1px solid #d4af3755",
          borderRadius: 999,
        }}>
          www.neexios.com
        </div>
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};

const SCENES = [SceneOpen, SceneTwin, SceneCockpit, SceneHajj, SceneWorkforce, SceneChart, SceneAgents, SceneBeforeAfter, SceneInvestor, SceneFinal];

// =================== Main composition ===================

export const NeexiosCinematic: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#000", fontFamily: inter.fontFamily, color: "#fff" }}>
      {/* Music bed */}
      <Audio src={staticFile("audio/nx-music.mp3")} volume={0.85} />

      {SCENES.map((Scene, i) => (
        <Sequence key={i} from={STARTS[i]} durationInFrames={SEC_TO_F(D[i])}>
          <Scene />
          {/* Subtitle / title overlay (skip on first 1.5s for clean entry) */}
          {i !== 0 && i !== 9 && <SubtitleBar ar={LINES[i].ar} en={LINES[i].en} titleAr={LINES[i].title_ar} titleEn={LINES[i].title_en} />}
          {(i === 0 || i === 9) && (
            <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, textAlign: "center",
              fontFamily: inter.fontFamily, fontSize: 22, color: "#cfe7ff", letterSpacing: 2, opacity: 0.85 }}>
              {LINES[i].en}
            </div>
          )}
          {/* Narration: starts ~1.2s into each scene */}
          <Sequence from={Math.round(NX_FPS * 1.2)} durationInFrames={SEC_TO_F(D[i]) - Math.round(NX_FPS * 1.2)}>
            <Audio src={staticFile(`audio/nx-${String(i).padStart(2, "0")}.mp3`)} volume={1.0} />
          </Sequence>
        </Sequence>
      ))}

      {/* Persistent brand badge */}
      <div style={{ position: "absolute", bottom: 30, right: 50, opacity: 0.7,
        fontFamily: inter.fontFamily, fontSize: 11, letterSpacing: 4, color: "#d4af37", fontWeight: 700 }}>
        NEEXIOS · AI OS
      </div>
    </AbsoluteFill>
  );
};
