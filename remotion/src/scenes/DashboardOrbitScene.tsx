import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import {
  Building2,
  Database,
  GitBranch,
  Bot,
  ShieldCheck,
  Workflow,
  Brain,
  Activity,
  MousePointer2,
  TrendingUp,
} from "lucide-react";

// Mirrors the real dashboard orbit nodes (positions in % of the stage)
const NODES = [
  {
    id: "dept",
    label: "DEPARTMENTS",
    meta: "24 Active",
    icon: Building2,
    x: 22,
    y: 26,
    hue: "#7fb8ff",
    status: "healthy",
  },
  {
    id: "data",
    label: "DATA LAKE",
    meta: "1.4 TB",
    icon: Database,
    x: 78,
    y: 26,
    hue: "#22d3ee",
    status: "healthy",
  },
  {
    id: "int",
    label: "INTEGRATIONS",
    meta: "18 Connected",
    icon: GitBranch,
    x: 14,
    y: 60,
    hue: "#a78bfa",
    status: "warning",
  },
  {
    id: "agents",
    label: "AI AGENTS",
    meta: "48 Active",
    icon: Bot,
    x: 50,
    y: 50,
    hue: "#34d399",
    status: "healthy",
  },
  {
    id: "gov",
    label: "GOVERNANCE",
    meta: "ISO · SOC2",
    icon: ShieldCheck,
    x: 86,
    y: 60,
    hue: "#fbbf24",
    status: "healthy",
  },
  {
    id: "flow",
    label: "WORKFLOWS",
    meta: "86 running",
    icon: Workflow,
    x: 36,
    y: 80,
    hue: "#f0abfc",
    status: "healthy",
  },
  {
    id: "intel",
    label: "INTELLIGENCE",
    meta: "4.2k signals",
    icon: Brain,
    x: 64,
    y: 80,
    hue: "#f43f5e",
    status: "healthy",
  },
];

// Navigation script: which node is "selected", and where the cursor sits.
// Slightly slower than Part 1 — each beat is 110 frames (~3.7s).
const BEAT = 110;
const BEATS = [
  { node: 0, openDrawer: false },
  { node: 1, openDrawer: true },
  { node: 3, openDrawer: true },
  { node: 4, openDrawer: false },
  { node: 6, openDrawer: true },
];
export const ORBIT_DURATION = BEAT * BEATS.length; // 550

const KPIS: Record<string, Array<{ l: string; v: string; d: string }>> = {
  dept: [
    { l: "Efficiency", v: "92%", d: "+3.4%" },
    { l: "Utilization", v: "87%", d: "+1.1%" },
    { l: "OKR", v: "78%", d: "-2.0%" },
  ],
  data: [
    { l: "Throughput", v: "12.4k/s", d: "+8.7%" },
    { l: "Quality", v: "98.2%", d: "+0.3%" },
    { l: "Latency", v: "42ms", d: "-6ms" },
  ],
  int: [
    { l: "Links", v: "18/20", d: "+2" },
    { l: "Failure", v: "1.3%", d: "+0.4%" },
    { l: "Sync", v: "842k/d", d: "+11%" },
  ],
  agents: [
    { l: "Active", v: "48", d: "+4" },
    { l: "Tasks/h", v: "1.2k", d: "+18%" },
    { l: "Success", v: "97.4%", d: "+0.6%" },
  ],
  gov: [
    { l: "Audits", v: "12/12", d: "PASS" },
    { l: "Findings", v: "0", d: "clean" },
    { l: "Score", v: "A+", d: "+1" },
  ],
  flow: [
    { l: "Running", v: "86", d: "+9" },
    { l: "Automated", v: "92%", d: "+4pp" },
    { l: "Saved/wk", v: "340h", d: "+22%" },
  ],
  intel: [
    { l: "Signals", v: "4.2k", d: "+340" },
    { l: "Confidence", v: "94%", d: "+2pp" },
    { l: "Models", v: "12", d: "+1" },
  ],
};

export const DashboardOrbitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Stage is offset so left rail can live separately
  const stageLeft = 360;
  const stageWidth = width - stageLeft - 60;
  const stageTop = 110;
  const stageHeight = height - stageTop - 90;

  // Beat indexing
  const beatIdx = Math.min(BEATS.length - 1, Math.floor(frame / BEAT));
  const localFrame = frame - beatIdx * BEAT;
  const beat = BEATS[beatIdx];
  const target = NODES[beat.node];

  // Cursor position interpolation: travel from previous node to current node
  const prevIdx = BEATS[Math.max(0, beatIdx - 1)].node;
  const prev = NODES[prevIdx];
  const travel = interpolate(localFrame, [0, 35], [0, 1], { extrapolateRight: "clamp" });
  const easedTravel = 1 - Math.pow(1 - travel, 3); // easeOutCubic
  const px = (prev.x + (target.x - prev.x) * easedTravel) / 100;
  const py = (prev.y + (target.y - prev.y) * easedTravel) / 100;
  const cursorX = stageLeft + px * stageWidth;
  const cursorY = stageTop + py * stageHeight;

  // Click pulse when cursor arrives
  const clickT = interpolate(localFrame, [38, 60], [0, 1], { extrapolateRight: "clamp" });
  const clickPulse = Math.sin(clickT * Math.PI);

  return (
    <AbsoluteFill>
      {/* Stage frame */}
      <div
        style={{
          position: "absolute",
          left: stageLeft,
          top: stageTop,
          width: stageWidth,
          height: stageHeight,
          borderRadius: 28,
          border: "1px solid rgba(34,211,238,0.18)",
          background: "linear-gradient(180deg, rgba(8,16,32,0.55), rgba(4,8,18,0.35))",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.04), 0 40px 100px -30px rgba(34,211,238,0.25)",
        }}
      >
        {/* Stage label */}
        <div
          style={{
            position: "absolute",
            top: 18,
            left: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: "#34d399",
              boxShadow: "0 0 10px #34d399",
            }}
          />
          <span style={{ fontSize: 11, letterSpacing: 4, color: "#9bb6d6" }}>
            3D ENTERPRISE COMMAND VIEW · LIVE
          </span>
        </div>

        {/* Orbit rings */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {[18, 28, 38].map((r) => (
            <ellipse
              key={r}
              cx={50}
              cy={53}
              rx={r * 1.5}
              ry={r * 0.6}
              fill="none"
              stroke="rgba(34,211,238,0.18)"
              strokeWidth={0.1}
              strokeDasharray="0.5 1"
            />
          ))}
          {/* Connections from active node to siblings */}
          {NODES.map((n, i) => {
            if (i === beat.node) return null;
            const op = 0.08 + clickPulse * 0.25;
            return (
              <line
                key={n.id}
                x1={target.x}
                y1={target.y}
                x2={n.x}
                y2={n.y}
                stroke={target.hue}
                strokeOpacity={op}
                strokeWidth={0.15}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {NODES.map((n, i) => {
          const active = i === beat.node;
          const Icon = n.icon;
          const enter = spring({ frame: frame - i * 4, fps, config: { damping: 18 } });
          const scale = (active ? 1.12 + clickPulse * 0.08 : 1) * enter;
          const halo = active ? 0.6 + clickPulse * 0.4 : 0.15;
          return (
            <div
              key={n.id}
              style={{
                position: "absolute",
                left: `${n.x}%`,
                top: `${n.y}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                transition: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: -22,
                  borderRadius: 28,
                  background: `radial-gradient(circle, ${n.hue}55, transparent 70%)`,
                  opacity: halo,
                  filter: "blur(10px)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  width: 132,
                  padding: "14px 16px",
                  borderRadius: 20,
                  background: active
                    ? `linear-gradient(180deg, ${n.hue}33, rgba(8,16,32,0.85))`
                    : "linear-gradient(180deg, rgba(20,32,55,0.85), rgba(8,16,32,0.75))",
                  border: `1px solid ${active ? n.hue : "rgba(120,180,255,0.18)"}`,
                  boxShadow: active
                    ? `0 20px 50px -15px ${n.hue}99, inset 0 1px 0 rgba(255,255,255,0.08)`
                    : "0 10px 30px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: `${n.hue}33`,
                      border: `1px solid ${n.hue}88`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={16} color={n.hue} strokeWidth={2.2} />
                  </div>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      marginLeft: "auto",
                      background: n.status === "healthy" ? "#34d399" : "#fbbf24",
                      boxShadow: `0 0 8px ${n.status === "healthy" ? "#34d399" : "#fbbf24"}`,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    fontWeight: 800,
                    color: "#fff",
                    marginTop: 10,
                  }}
                >
                  {n.label}
                </div>
                <div style={{ fontSize: 9, letterSpacing: 1, color: "#9bb6d6", marginTop: 2 }}>
                  {n.meta}
                </div>
              </div>
            </div>
          );
        })}

        {/* Drill drawer for the active node */}
        {beat.openDrawer && (
          <DrillDrawer node={target} kpis={KPIS[target.id]} localFrame={localFrame} />
        )}
      </div>

      {/* Left rail · "system commands" */}
      <LeftRail activeKey={target.id} frame={frame} />

      {/* Top breadcrumb / route */}
      <TopBar
        route={`/${target.id === "intel" ? "intelligence" : target.id}`}
        label={target.label}
      />

      {/* Animated cursor */}
      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          pointerEvents: "none",
          transform: "translate(-6px, -4px)",
          filter: "drop-shadow(0 4px 12px rgba(34,211,238,0.7))",
        }}
      >
        <MousePointer2 size={28} color="#fff" strokeWidth={1.5} fill="rgba(34,211,238,0.9)" />
        {/* Click ripple */}
        {clickPulse > 0 && (
          <div
            style={{
              position: "absolute",
              left: -20,
              top: -20,
              width: 40 + clickPulse * 60,
              height: 40 + clickPulse * 60,
              borderRadius: "50%",
              border: `2px solid ${target.hue}`,
              opacity: 1 - clickPulse,
              transform: "translate(-50%, -50%)",
              marginLeft: 8,
              marginTop: 6,
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

const LeftRail: React.FC<{ activeKey: string; frame: number }> = ({ activeKey, frame }) => {
  const items = [
    { k: "dept", l: "Departments", i: Building2 },
    { k: "data", l: "Data Lake", i: Database },
    { k: "int", l: "Integrations", i: GitBranch },
    { k: "agents", l: "AI Agents", i: Bot },
    { k: "gov", l: "Governance", i: ShieldCheck },
    { k: "flow", l: "Workflows", i: Workflow },
    { k: "intel", l: "Intelligence", i: Brain },
  ];
  return (
    <div
      style={{
        position: "absolute",
        top: 110,
        left: 60,
        width: 280,
        padding: 20,
        borderRadius: 24,
        background: "linear-gradient(180deg, rgba(10,18,36,0.7), rgba(4,8,18,0.4))",
        border: "1px solid rgba(120,180,255,0.12)",
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 5, color: "#7fb8ff", marginBottom: 14 }}>
        SYSTEM COMMANDS
      </div>
      {items.map((it) => {
        const active = it.k === activeKey;
        const Icon = it.i;
        return (
          <div
            key={it.k}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              marginBottom: 6,
              borderRadius: 12,
              background: active
                ? "linear-gradient(90deg, rgba(34,211,238,0.18), transparent)"
                : "transparent",
              border: `1px solid ${active ? "rgba(34,211,238,0.5)" : "transparent"}`,
              transform: active ? "translateX(6px)" : "translateX(0)",
            }}
          >
            <Icon size={16} color={active ? "#22d3ee" : "#7892b4"} strokeWidth={2} />
            <div
              style={{
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? "#fff" : "#8aa4c4",
              }}
            >
              {it.l}
            </div>
            {active && (
              <div
                style={{
                  marginLeft: "auto",
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: "#22d3ee",
                  boxShadow: "0 0 8px #22d3ee",
                }}
              />
            )}
          </div>
        );
      })}

      {/* Hint */}
      <div
        style={{
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(167,139,250,0.08)",
          border: "1px solid rgba(167,139,250,0.25)",
          fontSize: 10,
          letterSpacing: 1,
          color: "#c7b6ff",
        }}
      >
        ⌘K · OPEN COMMAND PALETTE
      </div>
    </div>
  );
};

const TopBar: React.FC<{ route: string; label: string }> = ({ route, label }) => {
  const frame = useCurrentFrame();
  // Simulate route changing — quick fade between
  const op = interpolate(frame % BEAT, [0, 10, 100, BEAT], [0.4, 1, 1, 0.4]);
  return (
    <div
      style={{
        position: "absolute",
        top: 50,
        left: 360,
        right: 60,
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          background: "rgba(34,211,238,0.1)",
          border: "1px solid rgba(34,211,238,0.3)",
          fontSize: 11,
          color: "#7fb8ff",
          letterSpacing: 2,
          fontFamily: "monospace",
          opacity: op,
        }}
      >
        nexus://app{route}
      </div>
      <div style={{ fontSize: 13, color: "#9bb6d6", letterSpacing: 1, opacity: op }}>→ {label}</div>
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 10, color: "#5a7494", letterSpacing: 3 }}>
        LIVE PULSE · 14:32:08 UTC
      </div>
    </div>
  );
};

const DrillDrawer: React.FC<{
  node: (typeof NODES)[number];
  kpis: (typeof KPIS)[string];
  localFrame: number;
}> = ({ node, kpis, localFrame }) => {
  const frame = useCurrentFrame();
  const fps = 30;
  const enter = spring({ frame: localFrame - 30, fps, config: { damping: 20, stiffness: 140 } });
  const Icon = node.icon;
  // Position drawer near the node but always visible on right side
  const onLeftSide = node.x > 55;
  return (
    <div
      style={{
        position: "absolute",
        [onLeftSide ? "left" : "right"]: 30,
        top: 90,
        width: 380,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [20, 0])}px)`,
        padding: 22,
        borderRadius: 20,
        background: "linear-gradient(180deg, rgba(10,20,40,0.92), rgba(4,8,18,0.85))",
        border: `1px solid ${node.hue}66`,
        boxShadow: `0 30px 80px -20px ${node.hue}88`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${node.hue}33`,
            border: `1px solid ${node.hue}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={22} color={node.hue} strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>
            {node.label}
          </div>
          <div style={{ fontSize: 10, color: "#9bb6d6", letterSpacing: 1.5, marginTop: 2 }}>
            {node.meta}
          </div>
        </div>
      </div>
      {kpis.map((k, i) => {
        const e = spring({ frame: localFrame - 40 - i * 6, fps, config: { damping: 18 } });
        return (
          <div
            key={k.l}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 10,
              marginBottom: 6,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              opacity: e,
              transform: `translateX(${interpolate(e, [0, 1], [12, 0])}px)`,
            }}
          >
            <div style={{ fontSize: 11, color: "#9bb6d6", letterSpacing: 1 }}>{k.l}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: node.hue,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {k.v}
              </div>
              <div style={{ fontSize: 10, color: "#34d399", letterSpacing: 1 }}>{k.d}</div>
            </div>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderRadius: 10,
          background: `${node.hue}1a`,
          border: `1px solid ${node.hue}44`,
          fontSize: 10,
          letterSpacing: 2,
          color: node.hue,
          fontWeight: 700,
        }}
      >
        <span>OPEN MODULE</span>
        <Activity size={12} />
      </div>
    </div>
  );
};
