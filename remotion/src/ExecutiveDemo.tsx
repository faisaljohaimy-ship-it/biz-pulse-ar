import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";

const inter = loadInter("normal", { weights: ["400","600","700","800"], subsets: ["latin"] }).fontFamily;
const cairo = loadCairo("normal", { weights: ["400","700","800","900"], subsets: ["arabic"] }).fontFamily;

export const DX_FPS = 30;

// Durations in seconds for each scene's audio (from dx-durations.json + buffer)
const SCENES = [
  { id: 0,  dur: 279, audio: null,           kind: "intro" },
  { id: 1,  dur: 300, audio: "dx-01.mp3",    kind: "login" },
  { id: 2,  dur: 321, audio: "dx-02.mp3",    kind: "shot",  img: "02-cockpit.png",
            titleAr: "قمرة القيادة التنفيذية", titleEn: "Executive Cockpit",
            calloutAr: "CEO · COO · CIO · CTO — شاشة واحدة",
            calloutEn: "One screen. Every executive.",
            zoom: { x: 0.5, y: 0.45, s: 1.25 } },
  { id: 3,  dur: 279, audio: "dx-03.mp3",    kind: "shot",  img: "03-intelligence.png",
            titleAr: "محرك الذكاء", titleEn: "Intelligence Engine",
            calloutAr: "ARIA تحلل ٤٧ مصدر بيانات",
            calloutEn: "ARIA analyses 47 data sources",
            zoom: { x: 0.5, y: 0.5, s: 1.2 } },
  { id: 4,  dur: 378, audio: "dx-04.mp3",    kind: "shot",  img: "04-decisions.png",
            titleAr: "مركز القرارات", titleEn: "Decision Center",
            calloutAr: "توصية → ثقة → أثر → مالك",
            calloutEn: "Recommend → Confidence → Impact → Owner",
            zoom: { x: 0.55, y: 0.55, s: 1.3 } },
  { id: 5,  dur: 303, audio: "dx-05.mp3",    kind: "shot",  img: "05-risk.png",
            titleAr: "مركز المخاطر", titleEn: "Risk Center",
            calloutAr: "تشغيلية · مالية · سيبرانية · امتثال",
            calloutEn: "Ops · Finance · Cyber · Compliance",
            zoom: { x: 0.55, y: 0.5, s: 1.2 } },
  { id: 6,  dur: 621, audio: "dx-06.mp3",    kind: "shot",  img: "06-integrations.png",
            titleAr: "مركز التكاملات", titleEn: "Integration Command Center",
            calloutAr: "SAP · M365 · Outlook · Teams · Salesforce · Oracle · Snowflake · Azure AD",
            calloutEn: "Live to every enterprise system",
            zoom: { x: 0.5, y: 0.45, s: 1.25 } },
  { id: 7,  dur: 345, audio: "dx-07.mp3",    kind: "arch" },
  { id: 8,  dur: 330, audio: "dx-08.mp3",    kind: "shot",  img: "07-agents.png",
            titleAr: "وكلاء ذاتيون", titleEn: "Autonomous Agents",
            calloutAr: "مالية · مخاطر · مبيعات · عمليات",
            calloutEn: "Finance · Risk · Sales · Ops",
            zoom: { x: 0.5, y: 0.5, s: 1.15 } },
  { id: 9,  dur: 354, audio: "dx-09.mp3",    kind: "shot",  img: "09-governance.png",
            titleAr: "الحوكمة والامتثال", titleEn: "Governance & Compliance",
            calloutAr: "ISO 27001 · SOC 2 · NCA ECC",
            calloutEn: "ISO 27001 · SOC 2 · NCA ECC",
            zoom: { x: 0.5, y: 0.5, s: 1.2 } },
  { id: 10, dur: 357, audio: "dx-10.mp3",    kind: "shot",  img: "10-analytics.png",
            titleAr: "تحليلات تنفيذية", titleEn: "Executive Analytics",
            calloutAr: "KPI لحظية · مقارنات تاريخية",
            calloutEn: "Live KPIs · Historical comparisons",
            zoom: { x: 0.5, y: 0.45, s: 1.18 } },
  { id: 11, dur: 351, audio: "dx-11.mp3",    kind: "shot",  img: "11-briefing.png",
            titleAr: "الموجز التنفيذي", titleEn: "Executive Briefing",
            calloutAr: "تقرير ذكي جاهز للعرض",
            calloutEn: "Board-ready in seconds",
            zoom: { x: 0.5, y: 0.5, s: 1.2 } },
  { id: 12, dur: 258, audio: "dx-12.mp3",    kind: "outro" },
];

export const DX_DURATION = SCENES.reduce((a, s) => a + s.dur, 0);

// ─────────────────────────────────────────────────────────────
// Brand chrome (always on top)
// ─────────────────────────────────────────────────────────────
const BrandChrome: React.FC<{ section: string; index: number; total: number }> = ({ section, index, total }) => {
  return (
    <>
      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 56,
        background: "linear-gradient(180deg, rgba(4,6,13,0.95), rgba(4,6,13,0))",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 36px", zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "linear-gradient(135deg, #00D4FF, #7B5CFF)",
            display: "grid", placeItems: "center", fontFamily: inter, fontWeight: 900, color: "#04060d", fontSize: 16,
          }}>N</div>
          <div style={{ fontFamily: inter, fontWeight: 800, color: "#e6f4ff", letterSpacing: 4, fontSize: 14 }}>
            NEEXIOS AI OS
          </div>
          <div style={{ fontFamily: inter, fontWeight: 600, color: "#7fb8ff", letterSpacing: 2, fontSize: 10, marginLeft: 8 }}>
            EXECUTIVE PRODUCT DEMONSTRATION
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: inter, fontSize: 11, color: "#7fb8ff", letterSpacing: 2 }}>
          <span>{String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ color: "#9fc7ff" }}>{section}</span>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: "#10b981", boxShadow: "0 0 12px #10b981" }} />
          <span>LIVE</span>
        </div>
      </div>
      {/* Bottom progress */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.05)", zIndex: 50 }}>
        <div style={{ width: `${(index / total) * 100}%`, height: "100%", background: "linear-gradient(90deg, #00D4FF, #FFD24A)" }} />
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// Animated cursor with click pulse
// ─────────────────────────────────────────────────────────────
const Cursor: React.FC<{ path: Array<{ t: number; x: number; y: number; click?: boolean }>; sceneDur: number }> = ({ path, sceneDur }) => {
  const frame = useCurrentFrame();
  if (!path.length) return null;
  // Interpolate position
  const seg = (() => {
    for (let i = 0; i < path.length - 1; i++) {
      if (frame >= path[i].t && frame <= path[i + 1].t) {
        const u = (frame - path[i].t) / (path[i + 1].t - path[i].t || 1);
        // ease-in-out
        const e = u * u * (3 - 2 * u);
        return {
          x: path[i].x + (path[i + 1].x - path[i].x) * e,
          y: path[i].y + (path[i + 1].y - path[i].y) * e,
        };
      }
    }
    const last = path[path.length - 1];
    return { x: last.x, y: last.y };
  })();
  // Click pulse
  const click = path.find((p) => p.click && Math.abs(frame - p.t) < 18);
  const cs = click ? interpolate(frame - click.t, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30 }}>
      {click && (
        <div style={{
          position: "absolute", left: `${click.x * 100}%`, top: `${click.y * 100}%`,
          width: 80, height: 80, marginLeft: -40, marginTop: -40,
          borderRadius: "50%", border: "2px solid #FFD24A",
          opacity: 1 - cs, transform: `scale(${0.4 + cs * 1.4})`,
        }} />
      )}
      <svg style={{ position: "absolute", left: `${seg.x * 100}%`, top: `${seg.y * 100}%`, width: 32, height: 36, transform: "translate(-4px,-4px)", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}
        viewBox="0 0 32 36" fill="none">
        <path d="M2 2 L2 26 L9 20 L13 30 L17 28 L13 18 L22 18 Z" fill="white" stroke="#0a0e1f" strokeWidth="1.2" />
      </svg>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Section title slate
// ─────────────────────────────────────────────────────────────
const SlateTitle: React.FC<{ ar: string; en: string; eyebrow: string }> = ({ ar, en, eyebrow }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 12, 38, 50], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 12], [12, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", top: 90, left: 50, zIndex: 40,
      opacity: o, transform: `translateY(${y}px)`,
      borderInlineStart: "3px solid #FFD24A", paddingInlineStart: 16,
    }}>
      <div style={{ fontFamily: inter, fontWeight: 700, color: "#FFD24A", letterSpacing: 5, fontSize: 11 }}>{eyebrow}</div>
      <div dir="rtl" style={{ fontFamily: cairo, fontWeight: 900, color: "#fff", fontSize: 38, lineHeight: 1.1, marginTop: 6 }}>{ar}</div>
      <div style={{ fontFamily: inter, fontWeight: 600, color: "#9fc7ff", fontSize: 16, letterSpacing: 1, marginTop: 4 }}>{en}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Callout
// ─────────────────────────────────────────────────────────────
const Callout: React.FC<{ ar: string; en: string; y: number }> = ({ ar, en, y }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [40, 60, 240, 260], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const tx = interpolate(frame, [40, 60], [-30, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", left: 50, top: y, opacity: o, transform: `translateX(${tx}px)`,
      background: "rgba(4,6,13,0.85)", border: "1px solid rgba(255,210,74,0.4)",
      borderRadius: 12, padding: "14px 20px", maxWidth: 540, zIndex: 40,
      boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      <div dir="rtl" style={{ fontFamily: cairo, fontWeight: 700, color: "#fff", fontSize: 18, lineHeight: 1.4 }}>{ar}</div>
      <div style={{ fontFamily: inter, fontWeight: 500, color: "#9fc7ff", fontSize: 13, marginTop: 4, letterSpacing: 0.5 }}>{en}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Screenshot scene with Ken Burns zoom
// ─────────────────────────────────────────────────────────────
const ShotScene: React.FC<{ scene: any; index: number; total: number }> = ({ scene, index, total }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [scene.dur - 22, scene.dur], [1, 0], { extrapolateLeft: "clamp" });
  // Ken Burns: from neutral to zoomed-in target
  const p = interpolate(frame, [0, scene.dur], [0, 1]);
  const s = 1 + (scene.zoom.s - 1) * p;
  const tx = interpolate(p, [0, 1], [0, (0.5 - scene.zoom.x) * 1920 * (scene.zoom.s - 1)]);
  const ty = interpolate(p, [0, 1], [0, (0.5 - scene.zoom.y) * 1080 * (scene.zoom.s - 1)]);

  // Cursor path: moves toward zoom focus, clicks midway
  const focusX = scene.zoom.x;
  const focusY = scene.zoom.y;
  const cursorPath = [
    { t: 30, x: 0.85, y: 0.85 },
    { t: 90, x: focusX + 0.08, y: focusY + 0.06 },
    { t: 130, x: focusX, y: focusY, click: true },
    { t: scene.dur - 10, x: focusX - 0.1, y: focusY - 0.05 },
  ];

  return (
    <AbsoluteFill style={{ background: "#04060d", opacity: Math.min(fadeIn, fadeOut) }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${s}) translate(${tx}px, ${ty}px)`, transformOrigin: "center" }}>
        <Img src={staticFile(`tour/${scene.img}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(2,4,10,0.6) 100%)", pointerEvents: "none" }} />
      <SlateTitle ar={scene.titleAr} en={scene.titleEn} eyebrow={`MODULE ${String(index).padStart(2, "0")}`} />
      <Callout ar={scene.calloutAr} en={scene.calloutEn} y={1080 - 180} />
      <Cursor path={cursorPath} sceneDur={scene.dur} />
      <BrandChrome section={scene.titleEn.toUpperCase()} index={index} total={total} />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Login scene: shows real login screenshot + typing simulation
// ─────────────────────────────────────────────────────────────
const LoginScene: React.FC<{ scene: any; index: number; total: number }> = ({ scene, index, total }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [scene.dur - 22, scene.dur], [1, 0], { extrapolateLeft: "clamp" });
  // Type effect over login
  const email = "ceo@neexios.com";
  const chars = Math.min(email.length, Math.max(0, Math.floor((frame - 50) / 4)));
  const shown = email.slice(0, chars);
  const cursorPath = [
    { t: 30, x: 0.75, y: 0.85 },
    { t: 80, x: 0.25, y: 0.62 },
    { t: 220, x: 0.25, y: 0.69, click: true },
  ];
  return (
    <AbsoluteFill style={{ background: "#04060d", opacity: Math.min(fadeIn, fadeOut) }}>
      <Img src={staticFile("tour/01-login.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
      {/* Dark overlay panel */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(4,6,13,0.7) 30%, rgba(4,6,13,0.4))" }} />
      <SlateTitle ar="تسجيل دخول موحد آمن" en="Single Sign-On" eyebrow="MODULE 01" />
      {/* Mock login card */}
      <div style={{
        position: "absolute", top: 280, left: 120, width: 520,
        background: "rgba(10,14,30,0.9)", border: "1px solid rgba(127,184,255,0.3)",
        borderRadius: 16, padding: 32, boxShadow: "0 40px 80px rgba(0,0,0,0.6)", zIndex: 30,
      }}>
        <div style={{ fontFamily: inter, fontWeight: 700, color: "#7fb8ff", fontSize: 11, letterSpacing: 3 }}>NEEXIOS AI OS</div>
        <div dir="rtl" style={{ fontFamily: cairo, fontWeight: 800, color: "#fff", fontSize: 28, marginTop: 8 }}>تسجيل الدخول</div>
        <div style={{ marginTop: 26 }}>
          <div style={{ fontFamily: inter, color: "#9fc7ff", fontSize: 12, letterSpacing: 1.5 }}>EMAIL</div>
          <div style={{
            marginTop: 8, height: 48, borderRadius: 8, background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(127,184,255,0.4)", display: "flex", alignItems: "center", padding: "0 16px",
            fontFamily: inter, color: "#fff", fontSize: 16,
          }}>
            {shown}<span style={{ opacity: frame % 30 < 15 ? 1 : 0, color: "#FFD24A" }}>|</span>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: inter, color: "#9fc7ff", fontSize: 12, letterSpacing: 1.5 }}>PASSWORD</div>
          <div style={{
            marginTop: 8, height: 48, borderRadius: 8, background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(127,184,255,0.4)", display: "flex", alignItems: "center", padding: "0 16px",
            fontFamily: inter, color: "#fff", fontSize: 22, letterSpacing: 4,
          }}>
            {frame > 160 ? "••••••••••••" : ""}
          </div>
        </div>
        <div style={{
          marginTop: 26, height: 52, borderRadius: 8,
          background: frame > 220 ? "linear-gradient(135deg, #00D4FF, #FFD24A)" : "linear-gradient(135deg, rgba(0,212,255,0.6), rgba(255,210,74,0.6))",
          display: "grid", placeItems: "center", fontFamily: inter, fontWeight: 800, color: "#04060d", letterSpacing: 2,
          transform: frame > 220 ? "scale(0.97)" : "scale(1)",
        }}>
          SIGN IN SECURELY
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10, fontFamily: inter, fontSize: 10, color: "#7fb8ff", letterSpacing: 1.5 }}>
          <span>✓ MFA</span><span>✓ SAML 2.0</span><span>✓ AZURE AD</span><span>✓ ZERO TRUST</span>
        </div>
      </div>
      <Cursor path={cursorPath} sceneDur={scene.dur} />
      <BrandChrome section="SECURE SIGN-IN" index={index} total={total} />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Intro scene
// ─────────────────────────────────────────────────────────────
const IntroScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sN = spring({ frame, fps, config: { damping: 12, stiffness: 70 } });
  const fadeOut = interpolate(frame, [dur - 22, dur], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, #0a1530 0%, #04060d 70%)", opacity: fadeOut }}>
      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.15,
        backgroundImage: "linear-gradient(rgba(127,184,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(127,184,255,0.4) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", transform: `scale(${0.8 + sN * 0.2})`, opacity: sN }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: inter, fontWeight: 700, color: "#FFD24A", letterSpacing: 8, fontSize: 14, marginBottom: 18 }}>
            EXECUTIVE PRODUCT DEMONSTRATION
          </div>
          <div style={{ fontFamily: inter, fontWeight: 900, color: "#fff", fontSize: 110, letterSpacing: -2, lineHeight: 1 }}>
            NEEXIOS
          </div>
          <div style={{ fontFamily: inter, fontWeight: 600, color: "#7fb8ff", fontSize: 24, letterSpacing: 12, marginTop: 8 }}>
            AI&nbsp;&nbsp;OS
          </div>
          <div style={{ width: 220, height: 2, background: "linear-gradient(90deg, transparent, #FFD24A, transparent)", margin: "30px auto" }} />
          <div dir="rtl" style={{ fontFamily: cairo, fontWeight: 700, color: "#e6f4ff", fontSize: 26 }}>
            نظام التشغيل الذكي للمؤسسات
          </div>
          <div style={{ fontFamily: inter, fontWeight: 500, color: "#9fc7ff", fontSize: 18, marginTop: 6, letterSpacing: 1 }}>
            Enterprise AI Operating System — Live Walkthrough
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Architecture scene: SVG enterprise diagram
// ─────────────────────────────────────────────────────────────
const ArchScene: React.FC<{ dur: number; index: number; total: number }> = ({ dur, index, total }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [dur - 22, dur], [1, 0], { extrapolateLeft: "clamp" });
  // Animate data flowing along lines
  const flow = (frame % 60) / 60;
  const sources = [
    { x: 200, y: 240, label: "SAP S/4HANA", tag: "ERP" },
    { x: 200, y: 360, label: "Microsoft 365", tag: "PRODUCTIVITY" },
    { x: 200, y: 480, label: "Outlook · Teams", tag: "COMMS" },
    { x: 200, y: 600, label: "Salesforce", tag: "CRM" },
    { x: 200, y: 720, label: "Oracle · Snowflake", tag: "DATA" },
    { x: 200, y: 840, label: "Azure AD · SAML", tag: "IDENTITY" },
  ];
  const outputs = [
    { x: 1700, y: 280, label: "Power BI", tag: "REPORTING" },
    { x: 1700, y: 400, label: "Executive Dashboards", tag: "DASHBOARDS" },
    { x: 1700, y: 520, label: "Decisions & Approvals", tag: "WORKFLOW" },
    { x: 1700, y: 640, label: "API Gateway", tag: "INTEGRATIONS" },
    { x: 1700, y: 760, label: "Autonomous Agents", tag: "AUTOMATION" },
  ];
  const coreX = 960, coreY = 540;
  return (
    <AbsoluteFill style={{ background: "#04060d", opacity: Math.min(fadeIn, fadeOut) }}>
      <SlateTitle ar="معمارية تدفق البيانات" en="Enterprise Data Architecture" eyebrow="MODULE 07" />
      <svg viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <radialGradient id="coreGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFD24A" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#00D4FF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7B5CFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lineGradL" x1="0" x2="1">
            <stop offset="0" stopColor="#00D4FF" stopOpacity="0.1" />
            <stop offset="1" stopColor="#00D4FF" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="lineGradR" x1="0" x2="1">
            <stop offset="0" stopColor="#FFD24A" stopOpacity="0.7" />
            <stop offset="1" stopColor="#FFD24A" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {/* Input lines */}
        {sources.map((s, i) => {
          const appear = interpolate(frame, [20 + i * 8, 50 + i * 8], [0, 1], { extrapolateRight: "clamp" });
          return (
            <g key={"s" + i} opacity={appear}>
              <line x1={s.x + 130} y1={s.y} x2={coreX - 120} y2={coreY} stroke="url(#lineGradL)" strokeWidth="2" />
              {/* Packet */}
              <circle
                cx={s.x + 130 + (coreX - 120 - s.x - 130) * flow}
                cy={s.y + (coreY - s.y) * flow}
                r="4" fill="#00D4FF"
              />
            </g>
          );
        })}
        {/* Output lines */}
        {outputs.map((o, i) => {
          const appear = interpolate(frame, [80 + i * 8, 110 + i * 8], [0, 1], { extrapolateRight: "clamp" });
          return (
            <g key={"o" + i} opacity={appear}>
              <line x1={coreX + 120} y1={coreY} x2={o.x - 130} y2={o.y} stroke="url(#lineGradR)" strokeWidth="2" />
              <circle
                cx={coreX + 120 + (o.x - 130 - coreX - 120) * flow}
                cy={coreY + (o.y - coreY) * flow}
                r="4" fill="#FFD24A"
              />
            </g>
          );
        })}
        {/* Core */}
        <circle cx={coreX} cy={coreY} r="220" fill="url(#coreGrad)" opacity={0.5 + Math.sin(frame / 12) * 0.15} />
        <circle cx={coreX} cy={coreY} r="120" fill="#0a1530" stroke="#FFD24A" strokeWidth="2" />
        <circle cx={coreX} cy={coreY} r="170" fill="none" stroke="#00D4FF" strokeWidth="1" strokeDasharray="6 12" opacity="0.5"
          style={{ transformOrigin: `${coreX}px ${coreY}px`, transform: `rotate(${frame * 0.6}deg)` }} />
      </svg>
      {/* HTML labels (better text quality than SVG text) */}
      {sources.map((s, i) => {
        const appear = interpolate(frame, [15 + i * 8, 45 + i * 8], [0, 1], { extrapolateRight: "clamp" });
        const tx = interpolate(appear, [0, 1], [-20, 0]);
        return (
          <div key={"sl" + i} style={{
            position: "absolute", left: s.x - 60, top: s.y - 26, width: 220,
            background: "rgba(10,14,30,0.9)", border: "1px solid rgba(0,212,255,0.4)",
            borderRadius: 8, padding: "10px 14px", opacity: appear, transform: `translateX(${tx}px)`,
          }}>
            <div style={{ fontFamily: inter, fontWeight: 700, color: "#fff", fontSize: 14 }}>{s.label}</div>
            <div style={{ fontFamily: inter, fontWeight: 600, color: "#00D4FF", fontSize: 9, letterSpacing: 2 }}>{s.tag}</div>
          </div>
        );
      })}
      {outputs.map((o, i) => {
        const appear = interpolate(frame, [75 + i * 8, 105 + i * 8], [0, 1], { extrapolateRight: "clamp" });
        const tx = interpolate(appear, [0, 1], [20, 0]);
        return (
          <div key={"ol" + i} style={{
            position: "absolute", left: o.x - 160, top: o.y - 26, width: 220,
            background: "rgba(10,14,30,0.9)", border: "1px solid rgba(255,210,74,0.4)",
            borderRadius: 8, padding: "10px 14px", opacity: appear, transform: `translateX(${tx}px)`, textAlign: "right",
          }}>
            <div style={{ fontFamily: inter, fontWeight: 700, color: "#fff", fontSize: 14 }}>{o.label}</div>
            <div style={{ fontFamily: inter, fontWeight: 600, color: "#FFD24A", fontSize: 9, letterSpacing: 2 }}>{o.tag}</div>
          </div>
        );
      })}
      {/* Core label */}
      <div style={{
        position: "absolute", left: coreX - 110, top: coreY - 30, width: 220, textAlign: "center",
      }}>
        <div style={{ fontFamily: inter, fontWeight: 900, color: "#FFD24A", fontSize: 22, letterSpacing: 3 }}>NEEXIOS</div>
        <div style={{ fontFamily: inter, fontWeight: 700, color: "#fff", fontSize: 14, letterSpacing: 4, marginTop: 2 }}>AI CORE</div>
        <div dir="rtl" style={{ fontFamily: cairo, color: "#9fc7ff", fontSize: 12, marginTop: 4 }}>محرك القرار</div>
      </div>
      <BrandChrome section="DATA ARCHITECTURE" index={index} total={total} />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Outro
// ─────────────────────────────────────────────────────────────
const OutroScene: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sN = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, #0a1530 0%, #04060d 70%)", opacity: fadeIn }}>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div style={{ transform: `scale(${0.9 + sN * 0.1})` }}>
          <div style={{ fontFamily: inter, fontWeight: 900, color: "#fff", fontSize: 90, letterSpacing: -1 }}>NEEXIOS</div>
          <div style={{ fontFamily: inter, fontWeight: 600, color: "#FFD24A", fontSize: 18, letterSpacing: 6, marginTop: 8 }}>
            ENTERPRISE READY
          </div>
          <div dir="rtl" style={{ fontFamily: cairo, color: "#e6f4ff", fontSize: 24, marginTop: 30 }}>
            جاهز للتشغيل المؤسسي
          </div>
          <div style={{ fontFamily: inter, color: "#9fc7ff", fontSize: 16, marginTop: 4, letterSpacing: 1 }}>
            For boards · banks · governments · investors
          </div>
          <div style={{
            display: "inline-block", marginTop: 40, padding: "16px 40px",
            border: "2px solid #FFD24A", borderRadius: 8,
            fontFamily: inter, fontWeight: 800, color: "#FFD24A", fontSize: 24, letterSpacing: 4,
          }}>
            neexios.com
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Root composition
// ─────────────────────────────────────────────────────────────
export const ExecutiveDemo: React.FC = () => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ background: "#04060d" }}>
      {SCENES.map((s, i) => {
        const from = cursor;
        cursor += s.dur;
        const node =
          s.kind === "intro" ? <IntroScene dur={s.dur} /> :
          s.kind === "outro" ? <OutroScene dur={s.dur} /> :
          s.kind === "arch"  ? <ArchScene dur={s.dur} index={i} total={SCENES.length - 2} /> :
          s.kind === "login" ? <LoginScene scene={s} index={i} total={SCENES.length - 2} /> :
          <ShotScene scene={s} index={i} total={SCENES.length - 2} />;
        return (
          <Sequence key={s.id} from={from} durationInFrames={s.dur}>
            {node}
            {s.audio && <Audio src={staticFile(`audio/${s.audio}`)} volume={0.95} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
