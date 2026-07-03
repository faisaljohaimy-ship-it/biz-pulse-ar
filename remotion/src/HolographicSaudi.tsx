/**
 * NexiosFilmF5 — «المملكة تتحول — بالهولوجرام»
 * 68s @ 30fps @ 1920x1080. Procedural holographic wireframes (no bitmap assets).
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import {
  TransitionSeries,
  springTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";
import { loadFont as loadTajawal } from "@remotion/google-fonts/Tajawal";

const { fontFamily: CAIRO } = loadCairo("normal", {
  weights: ["400", "700", "900"],
  subsets: ["arabic"],
});
const { fontFamily: TAJAWAL } = loadTajawal("normal", {
  weights: ["400", "700"],
  subsets: ["arabic"],
});

export const F5_FPS = 30;
export const F5_W = 1920;
export const F5_H = 1080;
export const F5_DURATION = 2040; // 68s

const BG = "#04070F";
const CYAN = "#22d3ee";
const GLOW = "#7dd3fc";
const GOLD = "#f5b041";

// ============ Primitives ============
const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)",
      pointerEvents: "none",
    }}
  />
);

const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(125,211,252,0.06) 0 1px, transparent 1px 3px)",
      mixBlendMode: "screen",
      opacity: 0.4,
      pointerEvents: "none",
    }}
  />
);

const GridFloor: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = (frame % 60) / 60;
  return (
    <AbsoluteFill style={{ perspective: 900, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: 0,
          right: 0,
          height: 700,
          transform: `rotateX(65deg) translateY(${shift * 40}px)`,
          transformOrigin: "center top",
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.35) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0) 80%)",
        }}
      />
    </AbsoluteFill>
  );
};

const ParticleField: React.FC<{ count?: number; seed?: number }> = ({
  count = 60,
  seed = 1,
}) => {
  const frame = useCurrentFrame();
  const parts = React.useMemo(() => {
    const arr = [];
    let s = seed * 9301 + 49297;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < count; i++) {
      arr.push({
        x: rnd() * 1920,
        y: rnd() * 1080,
        size: 1 + rnd() * 2.5,
        speed: 0.2 + rnd() * 0.8,
        phase: rnd() * Math.PI * 2,
      });
    }
    return arr;
  }, [count, seed]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {parts.map((p, i) => {
        const y = (p.y - frame * p.speed) % 1080;
        const opacity = 0.3 + Math.sin(frame * 0.05 + p.phase) * 0.3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: y < 0 ? y + 1080 : y,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: CYAN,
              boxShadow: `0 0 ${p.size * 4}px ${CYAN}`,
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const HoloCaption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 15, 90, 105], [0, 1, 1, 1], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: "clamp" });
  return (
    <div
      dir="rtl"
      style={{
        position: "absolute",
        bottom: 90,
        left: "10%",
        right: "10%",
        textAlign: "center",
        fontFamily: TAJAWAL,
        fontWeight: 400,
        fontSize: 36,
        color: "#fff",
        textShadow: `0 0 20px ${CYAN}88, 0 2px 8px rgba(0,0,0,0.9)`,
        opacity: op,
        transform: `translateY(${y}px)`,
        lineHeight: 1.5,
        letterSpacing: 0.5,
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "18px 32px",
          background: "rgba(4,7,15,0.55)",
          border: `1px solid ${CYAN}55`,
          borderRadius: 8,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const CornerChip: React.FC<{ text: string; position?: "tl" | "tr" | "br" }> = ({
  text,
  position = "tr",
}) => {
  const pos =
    position === "tr"
      ? { top: 40, right: 40 }
      : position === "tl"
      ? { top: 40, left: 40 }
      : { bottom: 40, right: 40 };
  return (
    <div
      style={{
        position: "absolute",
        ...pos,
        fontFamily: "monospace",
        fontSize: 16,
        color: CYAN,
        padding: "6px 14px",
        border: `1px solid ${CYAN}66`,
        background: "rgba(4,7,15,0.6)",
        letterSpacing: 2,
      }}
    >
      {text}
    </div>
  );
};

// ============ Holographic Building Silhouettes ============
type BuildingProps = { width: number; height: number; label?: string };

const KingdomTower: React.FC<BuildingProps> = ({ width, height, label }) => (
  <svg
    viewBox="0 0 200 400"
    width={width}
    height={height}
    style={{ filter: `drop-shadow(0 0 24px ${CYAN})`, overflow: "visible" }}
  >
    {/* main body */}
    <path
      d="M60 400 L60 80 Q60 20 100 20 Q140 20 140 80 L140 400 Z"
      fill="none"
      stroke={CYAN}
      strokeWidth="1.5"
      opacity="0.9"
    />
    {/* arch cutout */}
    <path
      d="M75 130 Q100 60 125 130 L125 260 L75 260 Z"
      fill="none"
      stroke={GLOW}
      strokeWidth="1.2"
    />
    {/* horizontal floor lines */}
    {Array.from({ length: 22 }).map((_, i) => (
      <line
        key={i}
        x1={60 + (i < 8 ? 8 - i : 0)}
        y1={60 + i * 15}
        x2={140 - (i < 8 ? 8 - i : 0)}
        y2={60 + i * 15}
        stroke={CYAN}
        strokeWidth="0.5"
        opacity="0.5"
      />
    ))}
    {label && (
      <text
        x="100"
        y="395"
        textAnchor="middle"
        fill={CYAN}
        fontSize="14"
        fontFamily={CAIRO}
      >
        {label}
      </text>
    )}
  </svg>
);

const FaisaliahTower: React.FC<BuildingProps> = ({ width, height, label }) => (
  <svg
    viewBox="0 0 200 400"
    width={width}
    height={height}
    style={{ filter: `drop-shadow(0 0 24px ${CYAN})`, overflow: "visible" }}
  >
    {/* pyramidal body */}
    <polygon
      points="100,20 130,380 70,380"
      fill="none"
      stroke={CYAN}
      strokeWidth="1.5"
    />
    {/* orb */}
    <circle
      cx="100"
      cy="105"
      r="20"
      fill="none"
      stroke={GLOW}
      strokeWidth="1.3"
    />
    <circle cx="100" cy="105" r="8" fill={CYAN} opacity="0.4" />
    {/* horizontal lines */}
    {Array.from({ length: 15 }).map((_, i) => {
      const y = 130 + i * 17;
      const w = (y - 20) * 0.08;
      return (
        <line
          key={i}
          x1={100 - w}
          y1={y}
          x2={100 + w}
          y2={y}
          stroke={CYAN}
          strokeWidth="0.5"
          opacity="0.5"
        />
      );
    })}
    <line x1="100" y1="20" x2="100" y2="85" stroke={CYAN} strokeWidth="1" />
    {label && (
      <text
        x="100"
        y="395"
        textAnchor="middle"
        fill={CYAN}
        fontSize="14"
        fontFamily={CAIRO}
      >
        {label}
      </text>
    )}
  </svg>
);

const KafdCluster: React.FC<BuildingProps> = ({ width, height, label }) => (
  <svg
    viewBox="0 0 300 400"
    width={width}
    height={height}
    style={{ filter: `drop-shadow(0 0 20px ${CYAN})`, overflow: "visible" }}
  >
    {[
      { x: 20, w: 40, h: 300 },
      { x: 75, w: 55, h: 360 },
      { x: 145, w: 45, h: 320 },
      { x: 205, w: 50, h: 340 },
      { x: 265, w: 30, h: 280 },
    ].map((b, i) => (
      <g key={i}>
        <rect
          x={b.x}
          y={400 - b.h}
          width={b.w}
          height={b.h}
          fill="none"
          stroke={CYAN}
          strokeWidth="1.2"
          opacity={0.85}
        />
        {Array.from({ length: Math.floor(b.h / 20) }).map((_, k) => (
          <line
            key={k}
            x1={b.x}
            y1={400 - b.h + k * 20}
            x2={b.x + b.w}
            y2={400 - b.h + k * 20}
            stroke={CYAN}
            strokeWidth="0.4"
            opacity="0.4"
          />
        ))}
      </g>
    ))}
    {label && (
      <text
        x="150"
        y="395"
        textAnchor="middle"
        fill={CYAN}
        fontSize="14"
        fontFamily={CAIRO}
      >
        {label}
      </text>
    )}
  </svg>
);

const AramcoCampus: React.FC<BuildingProps> = ({ width, height, label }) => (
  <svg
    viewBox="0 0 300 300"
    width={width}
    height={height}
    style={{ filter: `drop-shadow(0 0 20px ${CYAN})`, overflow: "visible" }}
  >
    {/* central tower */}
    <rect
      x="130"
      y="60"
      width="40"
      height="200"
      fill="none"
      stroke={CYAN}
      strokeWidth="1.5"
    />
    {/* wings */}
    <rect
      x="60"
      y="140"
      width="70"
      height="120"
      fill="none"
      stroke={CYAN}
      strokeWidth="1.3"
    />
    <rect
      x="170"
      y="140"
      width="70"
      height="120"
      fill="none"
      stroke={CYAN}
      strokeWidth="1.3"
    />
    {/* horizontal lines */}
    {Array.from({ length: 10 }).map((_, i) => (
      <line
        key={i}
        x1="60"
        y1={150 + i * 12}
        x2="240"
        y2={150 + i * 12}
        stroke={CYAN}
        strokeWidth="0.4"
        opacity="0.5"
      />
    ))}
    {label && (
      <text
        x="150"
        y="290"
        textAnchor="middle"
        fill={CYAN}
        fontSize="14"
        fontFamily={CAIRO}
      >
        {label}
      </text>
    )}
  </svg>
);

const SabicTower: React.FC<BuildingProps> = ({ width, height, label }) => (
  <svg
    viewBox="0 0 220 400"
    width={width}
    height={height}
    style={{ filter: `drop-shadow(0 0 20px ${CYAN})`, overflow: "visible" }}
  >
    {/* twin arches */}
    <path
      d="M40 400 L40 200 Q40 60 110 60 Q180 60 180 200 L180 400"
      fill="none"
      stroke={CYAN}
      strokeWidth="1.5"
    />
    <path
      d="M70 400 L70 220 Q70 90 110 90 Q150 90 150 220 L150 400"
      fill="none"
      stroke={GLOW}
      strokeWidth="1"
      opacity="0.7"
    />
    <line x1="110" y1="60" x2="110" y2="400" stroke={CYAN} strokeWidth="0.5" opacity="0.4" />
    {Array.from({ length: 16 }).map((_, i) => (
      <line
        key={i}
        x1="40"
        y1={120 + i * 18}
        x2="180"
        y2={120 + i * 18}
        stroke={CYAN}
        strokeWidth="0.4"
        opacity="0.4"
      />
    ))}
    {label && (
      <text
        x="110"
        y="395"
        textAnchor="middle"
        fill={CYAN}
        fontSize="14"
        fontFamily={CAIRO}
      >
        {label}
      </text>
    )}
  </svg>
);

const SecTower: React.FC<BuildingProps> = ({ width, height, label }) => (
  <svg
    viewBox="0 0 200 400"
    width={width}
    height={height}
    style={{ filter: `drop-shadow(0 0 20px ${CYAN})`, overflow: "visible" }}
  >
    <polygon
      points="50,400 50,80 100,50 150,80 150,400"
      fill="none"
      stroke={CYAN}
      strokeWidth="1.5"
    />
    {Array.from({ length: 18 }).map((_, i) => (
      <line
        key={i}
        x1="50"
        y1={100 + i * 17}
        x2="150"
        y2={100 + i * 17}
        stroke={CYAN}
        strokeWidth="0.5"
        opacity="0.5"
      />
    ))}
    <line x1="100" y1="50" x2="100" y2="400" stroke={GLOW} strokeWidth="0.6" opacity="0.6" />
    {label && (
      <text
        x="100"
        y="395"
        textAnchor="middle"
        fill={CYAN}
        fontSize="14"
        fontFamily={CAIRO}
      >
        {label}
      </text>
    )}
  </svg>
);

// ============ Holographic UI Panels ============
const HoloPanel: React.FC<{
  title: string;
  children?: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ title, children, width = 380, height = 260 }) => (
  <div
    dir="rtl"
    style={{
      width,
      height,
      background: "rgba(4,7,15,0.55)",
      border: `1px solid ${CYAN}88`,
      boxShadow: `0 0 40px ${CYAN}44, inset 0 0 20px ${CYAN}22`,
      padding: 18,
      fontFamily: CAIRO,
      color: CYAN,
      position: "relative",
    }}
  >
    <div
      style={{
        fontSize: 20,
        fontWeight: 700,
        borderBottom: `1px solid ${CYAN}55`,
        paddingBottom: 8,
        marginBottom: 12,
        color: "#fff",
        textShadow: `0 0 10px ${CYAN}`,
      }}
    >
      {title}
    </div>
    <div style={{ fontSize: 14, color: GLOW }}>{children}</div>
    {/* corner marks */}
    {["tl", "tr", "bl", "br"].map((c) => (
      <div
        key={c}
        style={{
          position: "absolute",
          width: 12,
          height: 12,
          borderColor: CYAN,
          borderStyle: "solid",
          borderWidth: 0,
          borderTopWidth: c.includes("t") ? 2 : 0,
          borderBottomWidth: c.includes("b") ? 2 : 0,
          borderLeftWidth: c.includes("l") ? 2 : 0,
          borderRightWidth: c.includes("r") ? 2 : 0,
          top: c.includes("t") ? -2 : "auto",
          bottom: c.includes("b") ? -2 : "auto",
          left: c.includes("l") ? -2 : "auto",
          right: c.includes("r") ? -2 : "auto",
        }}
      />
    ))}
  </div>
);

const ErpPanel = () => (
  <HoloPanel title="نظام الموارد">
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {["الموارد البشرية", "المشتريات", "المالية", "الأصول", "المخزون", "التخطيط"].map(
        (m) => (
          <div
            key={m}
            style={{
              padding: 8,
              border: `1px solid ${CYAN}44`,
              background: "rgba(34,211,238,0.06)",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {m}
          </div>
        )
      )}
    </div>
    <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
      <span>مؤشرات لحظية</span>
      <span style={{ color: "#fff" }}>▲ 12.4٪</span>
    </div>
  </HoloPanel>
);

const InboxPanel = () => (
  <HoloPanel title="البريد المؤسسي">
    {["مذكرة الميزانية", "تقرير الربع", "طلب توقيع", "اجتماع مجلس"].map((s, i) => (
      <div
        key={i}
        style={{
          padding: "8px 4px",
          borderBottom: `1px dashed ${CYAN}33`,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
        }}
      >
        <span>{s}</span>
        <span style={{ opacity: 0.6 }}>0{i + 8}:0{i * 2 + 3}</span>
      </div>
    ))}
  </HoloPanel>
);

const ChatPanel = () => (
  <HoloPanel title="المحادثات">
    {[
      { t: "اعتمدت التقرير", me: false },
      { t: "شكرًا — بانتظار المراجعة", me: true },
      { t: "الأرقام محدّثة", me: false },
    ].map((b, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          justifyContent: b.me ? "flex-start" : "flex-end",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            maxWidth: "70%",
            padding: "6px 12px",
            background: b.me ? "rgba(34,211,238,0.18)" : "rgba(125,211,252,0.1)",
            border: `1px solid ${CYAN}55`,
            borderRadius: 10,
            fontSize: 13,
            color: "#fff",
          }}
        >
          {b.t}
        </div>
      </div>
    ))}
  </HoloPanel>
);

const DbPanel = () => (
  <HoloPanel title="قاعدة البيانات">
    <svg viewBox="0 0 360 180" width="100%" height="150">
      {[
        { x: 40, y: 30 },
        { x: 180, y: 30 },
        { x: 320, y: 30 },
        { x: 110, y: 130 },
        { x: 250, y: 130 },
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="18" fill="none" stroke={CYAN} strokeWidth="1.2" />
          <text
            x={n.x}
            y={n.y + 4}
            textAnchor="middle"
            fontSize="11"
            fill={CYAN}
            fontFamily="monospace"
          >
            T{i + 1}
          </text>
        </g>
      ))}
      {[
        [40, 30, 110, 130],
        [180, 30, 110, 130],
        [180, 30, 250, 130],
        [320, 30, 250, 130],
      ].map((l, i) => (
        <line
          key={i}
          x1={l[0]}
          y1={l[1]}
          x2={l[2]}
          y2={l[3]}
          stroke={CYAN}
          strokeWidth="0.8"
          opacity="0.6"
        />
      ))}
    </svg>
    <div style={{ fontSize: 12, color: GLOW }}>SELECT * WHERE status = 'live'</div>
  </HoloPanel>
);

// ============ ARIA Holo Avatar ============
const AriaAvatar: React.FC<{ height?: number }> = ({ height = 720 }) => {
  const frame = useCurrentFrame();
  const mouthIdx = Math.floor(frame / 6) % 5;
  const mouthShapes = [
    "M0 0 Q20 0 40 0", // closed
    "M0 0 Q20 12 40 0", // A
    "M0 0 Q20 4 40 0", // E
    "M0 -2 Q20 10 40 -2", // O
    "M0 2 Q20 -4 40 2", // smile
  ];
  const pulse = 0.85 + Math.sin(frame * 0.1) * 0.15;
  return (
    <div style={{ height, width: height * 0.5, position: "relative" }}>
      <svg
        viewBox="0 0 300 720"
        width={height * 0.5}
        height={height}
        style={{ overflow: "visible", filter: `drop-shadow(0 0 40px ${CYAN})` }}
      >
        {/* Aura */}
        <ellipse
          cx="150"
          cy="360"
          rx="140"
          ry="340"
          fill="url(#aura)"
          opacity={pulse * 0.4}
        />
        <defs>
          <radialGradient id="aura">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.5" />
            <stop offset="70%" stopColor={CYAN} stopOpacity="0.05" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={GLOW} stopOpacity="0.9" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {/* head */}
        <ellipse
          cx="150"
          cy="130"
          rx="55"
          ry="70"
          fill="none"
          stroke={CYAN}
          strokeWidth="1.5"
          opacity="0.9"
        />
        {/* hair strands (data particles) */}
        {Array.from({ length: 14 }).map((_, i) => {
          const angle = (i / 14) * Math.PI - Math.PI / 2;
          const len = 60 + Math.sin(frame * 0.08 + i) * 20;
          return (
            <line
              key={i}
              x1={150 + Math.cos(angle) * 50}
              y1={80 + Math.sin(angle) * 30}
              x2={150 + Math.cos(angle) * (50 + len)}
              y2={30 + Math.sin(angle) * (30 + len * 0.3)}
              stroke={CYAN}
              strokeWidth="1"
              opacity={0.4 + Math.sin(frame * 0.1 + i) * 0.3}
            />
          );
        })}
        {/* eyes */}
        <circle cx="130" cy="125" r="3" fill={GLOW} opacity="0.9" />
        <circle cx="170" cy="125" r="3" fill={GLOW} opacity="0.9" />
        {/* mouth */}
        <g transform="translate(130 160)">
          <path
            d={mouthShapes[mouthIdx]}
            fill="none"
            stroke={GLOW}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        {/* neck & shoulders */}
        <path
          d="M130 195 L130 220 L80 260 L60 400 L100 720"
          fill="none"
          stroke={CYAN}
          strokeWidth="1.5"
        />
        <path
          d="M170 195 L170 220 L220 260 L240 400 L200 720"
          fill="none"
          stroke={CYAN}
          strokeWidth="1.5"
        />
        <path
          d="M100 720 L200 720"
          fill="none"
          stroke={CYAN}
          strokeWidth="1"
          opacity="0.4"
        />
        {/* torso lines */}
        {Array.from({ length: 22 }).map((_, i) => (
          <line
            key={i}
            x1={80 - i * 0.5}
            y1={260 + i * 22}
            x2={220 + i * 0.5}
            y2={260 + i * 22}
            stroke={CYAN}
            strokeWidth="0.4"
            opacity="0.3"
          />
        ))}
        {/* body glow fill */}
        <path
          d="M130 195 L130 220 L80 260 L60 400 L100 720 L200 720 L240 400 L220 260 L170 220 L170 195 Z"
          fill="url(#body)"
          opacity="0.15"
        />
      </svg>
    </div>
  );
};

// ============ Scenes ============
const Scene1Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = "المَمْلَكَةُ تَتَحَوَّل";
  const sub = "The Kingdom, Rendered in Light";
  const bar = spring({ frame: frame - 40, fps, config: { damping: 20 } });
  return (
    <AbsoluteFill style={{ background: BG }}>
      <GridFloor />
      <ParticleField count={80} seed={7} />
      <AbsoluteFill
        dir="rtl"
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontFamily: CAIRO,
            fontWeight: 900,
            fontSize: 140,
            color: "#fff",
            textShadow: `0 0 30px ${CYAN}, 0 0 60px ${CYAN}88`,
            display: "flex",
            gap: 24,
            direction: "rtl",
          }}
        >
          {title.split(" ").map((w, i) => {
            const s = spring({
              frame: frame - i * 8 - 5,
              fps,
              config: { damping: 14 },
            });
            return (
              <span
                key={i}
                style={{
                  opacity: s,
                  transform: `translateY(${(1 - s) * 40}px) scale(${
                    0.7 + s * 0.3
                  })`,
                  display: "inline-block",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: TAJAWAL,
            fontSize: 36,
            color: GLOW,
            opacity: interpolate(frame, [30, 60], [0, 1], {
              extrapolateRight: "clamp",
            }),
            letterSpacing: 4,
          }}
        >
          {sub}
        </div>
        <div
          style={{
            marginTop: 40,
            width: 400 * bar,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${CYAN}, transparent)`,
            boxShadow: `0 0 20px ${CYAN}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 60,
            fontFamily: "monospace",
            fontSize: 16,
            color: CYAN,
            letterSpacing: 4,
            opacity: interpolate(frame, [60, 90], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          NEXIOS · FILM 05
        </div>
      </AbsoluteFill>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

const Scene2Riyadh: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rot = interpolate(frame, [0, 240], [0, 8]);
  const s1 = spring({ frame, fps, config: { damping: 15 } });
  const s2 = spring({ frame: frame - 12, fps, config: { damping: 15 } });
  const s3 = spring({ frame: frame - 24, fps, config: { damping: 15 } });
  return (
    <AbsoluteFill style={{ background: BG }}>
      <GridFloor />
      <ParticleField count={60} seed={11} />
      <CornerChip text="الرِّيَاض · 24.71°N · 46.68°E" position="tr" />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-end",
          paddingBottom: 220,
          gap: 60,
          flexDirection: "row",
        }}
      >
        {/* KAFD background */}
        <div
          style={{
            opacity: s3 * 0.6,
            transform: `translateY(${(1 - s3) * 60}px) rotateY(${rot}deg)`,
            perspective: 1000,
          }}
        >
          <KafdCluster width={340} height={420} label="المركز المالي" />
        </div>
        {/* Faisaliah midground */}
        <div
          style={{
            opacity: s2,
            transform: `translateY(${(1 - s2) * 40}px) rotateY(${-rot}deg)`,
          }}
        >
          <FaisaliahTower width={220} height={520} label="الفَيْصَلِيَّة" />
        </div>
        {/* Kingdom foreground */}
        <div
          style={{
            opacity: s1,
            transform: `translateY(${(1 - s1) * 30}px) rotateY(${rot}deg) scale(1.1)`,
          }}
        >
          <KingdomTower width={240} height={560} label="المَمْلَكَة" />
        </div>
      </AbsoluteFill>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

const Scene3Triptych: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springs = [0, 6, 12].map((d) =>
    spring({ frame: frame - d, fps, config: { damping: 15 } })
  );
  const items = [
    { C: SecTower, label: "الكهرباء", badge: "الكهرباء" },
    { C: SabicTower, label: "سابك", badge: "الصناعة" },
    { C: AramcoCampus, label: "أرامكو", badge: "الطاقة" },
  ];
  return (
    <AbsoluteFill style={{ background: BG }} dir="rtl">
      <GridFloor />
      <ParticleField count={50} seed={17} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "flex-end",
          paddingBottom: 200,
          gap: 80,
          flexDirection: "row",
        }}
      >
        {items.map((it, i) => {
          const s = springs[i];
          const C = it.C;
          return (
            <div
              key={i}
              style={{
                opacity: s,
                transform: `translateY(${(1 - s) * 60}px) scale(${0.85 + s * 0.15})`,
                textAlign: "center",
              }}
            >
              <C width={280} height={440} label={it.label} />
              <div
                style={{
                  marginTop: 16,
                  fontFamily: CAIRO,
                  fontWeight: 700,
                  fontSize: 22,
                  color: GOLD,
                  padding: "6px 24px",
                  border: `1px solid ${GOLD}88`,
                  display: "inline-block",
                  background: "rgba(4,7,15,0.6)",
                }}
              >
                {it.badge}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

const Scene4Stack: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const panels = [
    { C: ErpPanel, delay: 0 },
    { C: DbPanel, delay: 10 },
    { C: InboxPanel, delay: 20 },
    { C: ChatPanel, delay: 30 },
  ];
  const beam = spring({ frame: frame - 45, fps, config: { damping: 20 } });
  return (
    <AbsoluteFill style={{ background: BG }} dir="rtl">
      <GridFloor />
      <ParticleField count={45} seed={23} />
      {/* Emitter display */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
          width: 720,
          height: 60,
          background: "rgba(4,7,15,0.9)",
          border: `2px solid ${CYAN}`,
          borderRadius: 8,
          boxShadow: `0 0 60px ${CYAN}88`,
        }}
      />
      {/* Beam */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: "50%",
          transform: "translateX(-50%)",
          width: 600 * beam,
          height: 460,
          background: `linear-gradient(to top, ${CYAN}55, transparent)`,
          filter: "blur(20px)",
          opacity: 0.6,
        }}
      />
      {/* Panels grid */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 100,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          {panels.map((p, i) => {
            const s = spring({
              frame: frame - p.delay,
              fps,
              config: { damping: 18 },
            });
            const clip = `inset(${(1 - s) * 100}% 0 0 0)`;
            const P = p.C;
            return (
              <div
                key={i}
                style={{
                  opacity: s,
                  clipPath: clip,
                  transform: `translateY(${(1 - s) * 30}px)`,
                }}
              >
                <P />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

const Scene5Unify: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const collapse = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const orbPulse = 0.9 + Math.sin(frame * 0.15) * 0.15;
  const landmarks = [
    { icon: "🏛", label: "المملكة", angle: -90 },
    { icon: "△", label: "الفيصلية", angle: -30 },
    { icon: "▤", label: "المركز المالي", angle: 30 },
    { icon: "◈", label: "سابك", angle: 90 },
    { icon: "▥", label: "أرامكو", angle: 150 },
    { icon: "▲", label: "الكهرباء", angle: 210 },
  ];
  const headline = "طَبَقَةٌ ذَكِيَّةٌ وَاحِدَة";
  return (
    <AbsoluteFill style={{ background: BG }} dir="rtl">
      <GridFloor />
      <ParticleField count={70} seed={29} />
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: CAIRO,
          fontWeight: 900,
          fontSize: 72,
          color: "#fff",
          textShadow: `0 0 30px ${CYAN}`,
          opacity: interpolate(frame, [20, 50], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        {headline}
      </div>
      {/* Center orb */}
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <div
          style={{
            width: 240 * orbPulse * collapse,
            height: 240 * orbPulse * collapse,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${GLOW} 0%, ${CYAN} 40%, transparent 80%)`,
            boxShadow: `0 0 120px ${CYAN}, 0 0 200px ${CYAN}88`,
            opacity: 0.9,
          }}
        />
      </AbsoluteFill>
      {/* Radial lines & landmarks */}
      <AbsoluteFill>
        <svg width="1920" height="1080" style={{ overflow: "visible" }}>
          {landmarks.map((l, i) => {
            const rad = (l.angle * Math.PI) / 180;
            const r = 380;
            const cx = 960;
            const cy = 540;
            const x = cx + Math.cos(rad) * r;
            const y = cy + Math.sin(rad) * r;
            const s = spring({
              frame: frame - 30 - i * 4,
              fps,
              config: { damping: 18 },
            });
            return (
              <g key={i} opacity={s}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke={CYAN}
                  strokeWidth="1"
                  opacity="0.6"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="28"
                  fill="rgba(4,7,15,0.9)"
                  stroke={CYAN}
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  fill={GLOW}
                  fontSize="20"
                >
                  {l.icon}
                </text>
                <text
                  x={x}
                  y={y + 60}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="18"
                  fontFamily={CAIRO}
                >
                  {l.label}
                </text>
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

const Scene6Aria: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const aria = spring({ frame, fps, config: { damping: 18 } });
  const dashSprings = [15, 30, 45].map((d) =>
    spring({ frame: frame - d, fps, config: { damping: 18 } })
  );
  const kpis = [
    { title: "المؤشرات", value: "94.2", suffix: "٪" },
    { title: "الحوادث المفتوحة", value: "07", suffix: "" },
    { title: "التوقّع (7 أيام)", value: "▲ 12", suffix: "٪" },
  ];
  return (
    <AbsoluteFill style={{ background: BG }} dir="rtl">
      <GridFloor />
      <ParticleField count={40} seed={41} />
      {/* ARIA on right */}
      <div
        style={{
          position: "absolute",
          right: 120,
          top: 100,
          opacity: aria,
          transform: `translateX(${(1 - aria) * 60}px)`,
        }}
      >
        <AriaAvatar height={820} />
        {/* reflection */}
        <div
          style={{
            transform: "scaleY(-1)",
            opacity: 0.15,
            filter: "blur(6px)",
            marginTop: -40,
            maskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        >
          <AriaAvatar height={160} />
        </div>
      </div>
      {/* Left dashboards */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 160,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {kpis.map((k, i) => (
          <div
            key={i}
            style={{
              opacity: dashSprings[i],
              transform: `translateY(${(1 - dashSprings[i]) * 40}px)`,
              width: 480,
              padding: 20,
              background: "rgba(4,7,15,0.65)",
              border: `1px solid ${CYAN}88`,
              boxShadow: `0 0 30px ${CYAN}44`,
              fontFamily: CAIRO,
            }}
          >
            <div style={{ fontSize: 18, color: GLOW }}>{k.title}</div>
            <div
              style={{
                fontSize: 68,
                fontWeight: 900,
                color: "#fff",
                textShadow: `0 0 20px ${CYAN}`,
                marginTop: 4,
              }}
            >
              {k.value}
              <span style={{ fontSize: 32, color: CYAN, marginRight: 6 }}>
                {k.suffix}
              </span>
            </div>
          </div>
        ))}
      </div>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

const Scene7Vision: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gold = spring({ frame: frame - 20, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ background: BG }} dir="rtl">
      <GridFloor />
      {/* skyline wireframe */}
      <div
        style={{
          position: "absolute",
          bottom: 180,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: 20,
          opacity: 0.85,
        }}
      >
        <SecTower width={140} height={300} />
        <KafdCluster width={280} height={360} />
        <KingdomTower width={160} height={420} />
        <FaisaliahTower width={140} height={380} />
        <SabicTower width={160} height={340} />
      </div>
      {/* Gold rain */}
      <ParticleField count={40} seed={53} />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <div
          style={{
            fontFamily: CAIRO,
            fontWeight: 900,
            fontSize: 200,
            color: GOLD,
            textShadow: `0 0 40px ${GOLD}, 0 0 80px ${GOLD}88`,
            opacity: gold,
            transform: `scale(${0.6 + gold * 0.4})`,
          }}
        >
          رؤية 2030
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: TAJAWAL,
            fontSize: 26,
            color: GLOW,
            opacity: interpolate(frame, [50, 80], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          Vision 2030 · مستهدف استرشادي
        </div>
      </AbsoluteFill>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

const Scene8Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const orb = spring({ frame, fps, config: { damping: 15 } });
  const word = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const orbSize = interpolate(orb, [0, 1], [40, 300]) * (1 - Math.min(1, Math.max(0, (frame - 40) / 30)) * 0.4);
  return (
    <AbsoluteFill style={{ background: "#000" }} dir="rtl">
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            width: orbSize,
            height: orbSize,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${GLOW}, ${CYAN} 50%, transparent 80%)`,
            boxShadow: `0 0 100px ${CYAN}`,
            marginBottom: 40,
            opacity: interpolate(frame, [50, 90], [1, 0.3], {
              extrapolateRight: "clamp",
            }),
          }}
        />
        <div
          style={{
            fontFamily: CAIRO,
            fontWeight: 900,
            fontSize: 220,
            color: "#fff",
            textShadow: `0 0 40px ${CYAN}, 0 0 80px ${CYAN}66`,
            letterSpacing: 8,
            opacity: word,
            transform: `scale(${0.7 + word * 0.3})`,
            marginTop: -80,
          }}
        >
          NEXIOS
        </div>
        <div
          style={{
            width: 300 * word,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
            boxShadow: `0 0 20px ${GOLD}`,
            marginTop: 12,
          }}
        />
        <div
          style={{
            marginTop: 32,
            fontFamily: TAJAWAL,
            fontSize: 40,
            color: GLOW,
            opacity: interpolate(frame, [60, 100], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          نحن نُنِيرُ الأعمال
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 40,
          fontFamily: "monospace",
          fontSize: 14,
          color: CYAN,
          opacity: 0.7,
          letterSpacing: 2,
        }}
      >
        film №05 · duration 01:08 · KSA · 2030
      </div>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

// ============ Master ============
const captions = [
  "مِنْ قَلْبِ الرِّيَاض… نَنْظُرُ إِلَى المُسْتَقْبَل. أَنَا آرِيَا.",
  "هَذِهِ لَيْسَتْ أَبْرَاجًا — هَذِهِ رُمُوزٌ لِاقْتِصَادٍ يَتَحَوَّل. المَمْلَكَة، الفَيْصَلِيَّة، وَبُرُوجُ المَرْكَزِ المَالِيّ.",
  "مِنَ الظَّهْرَان… أَرَامْكُو تُدِيرُ طَاقَةَ العَالَم. وَمِنَ الرِّيَاض… سَابِك وَشَرِكَةُ الكَهْرَبَاء تُشَكِّلَانِ العَمُودَ الصِّنَاعِيّ.",
  "كُلُّ هَذِهِ المُؤَسَّسَات تَعْمَلُ عَلَى أَنْظِمَةٍ عَالَمِيَّة: SAP لِلْمَوَارِد، Oracle لِلْبَيَانَات، Outlook لِلتَّوَاصُل، WhatsApp لِلْفِرَق.",
  "نِيكْسُوس يَجْمَعُهَا كُلَّهَا فِي طَبَقَةٍ وَاحِدَةٍ ذَكِيَّة — حَيْثُ يَتَحَدَّثُ الذَّكَاءُ الاصْطِنَاعِيُّ لُغَةَ مُؤَسَّسَتِك.",
  "شَاشَاتٌ رَقَمِيَّةٌ تَفْتَحُ عَلَى قَرَارَاتٍ لَحْظِيَّة. هُولُوجرَامٌ يَنْقُلُ البَيَانَاتِ مِنَ الأَرْقَامِ إِلَى المَعْنَى.",
  "هَذِهِ رُؤْيَةُ 2030 — لَيْسَتْ شِعَارًا، بَلْ بُنْيَةً تَحْتِيَّةً تَنْبِضُ بِالضَّوْء.",
  "نِيكْسُوس — نَحْنُ لَا نُدِيرُ الأَعْمَال، نَحْنُ نُنِيرُهَا.",
];

// Scene durations in frames (sum with 7 fade overlaps of 18 = 126 subtracted)
// scenes: 180,240,240,300,300,300,240,240 => 2040 target; overlaps subtract 7*18=126 => 1914
// so we need scenes to sum to 2040+126=2166
// distribute: 195, 255, 255, 315, 315, 315, 260, 256 => 2166
const sceneDurations = [195, 255, 255, 315, 315, 315, 260, 256];
const scenes = [
  Scene1Title,
  Scene2Riyadh,
  Scene3Triptych,
  Scene4Stack,
  Scene5Unify,
  Scene6Aria,
  Scene7Vision,
  Scene8Closing,
];

// Compute caption windows aligned to composed sequence timeline.
// Each scene i shows caption i (1:1). Title (scene 0) shows caption 0 (narration 01).
// Closing (scene 7) shows caption 7 (narration 08 signature).
function buildCaptionWindows() {
  const wins: { start: number; end: number; text: string }[] = [];
  let t = 0;
  const fadeF = 18;
  for (let i = 0; i < scenes.length; i++) {
    const dur = sceneDurations[i];
    if (i < captions.length) {
      wins.push({
        start: t + 25,
        end: t + dur - 20,
        text: captions[i],
      });
    }
    t += dur - (i < scenes.length - 1 ? fadeF : 0);
  }
  return wins;
}
const captionWindows = buildCaptionWindows();

export const NexiosFilmF5: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <TransitionSeries>
        {scenes.map((S, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={sceneDurations[i]}>
              <S />
            </TransitionSeries.Sequence>
            {i < scenes.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={springTiming({
                  config: { damping: 200 },
                  durationInFrames: 18,
                })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>
      {/* Caption overlay */}
      {captionWindows.map((c, i) =>
        frame >= c.start && frame <= c.end ? (
          <Sequence
            key={i}
            from={c.start}
            durationInFrames={c.end - c.start}
            layout="none"
          >
            <HoloCaption text={c.text} />
          </Sequence>
        ) : null
      )}
    </AbsoluteFill>
  );
};
