import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Command, ArrowRight, CornerDownLeft, Search, Sparkles } from "lucide-react";

type Cmd = { keys: string; q: string; route: string; hue: string; result: string };
const CMDS: Cmd[] = [
  {
    keys: "G D",
    q: "go dashboard",
    route: "/cockpit",
    hue: "#22d3ee",
    result: "Executive Cockpit",
  },
  {
    keys: "G I",
    q: "open intelligence",
    route: "/intelligence",
    hue: "#a78bfa",
    result: "AI Intelligence Layer",
  },
  { keys: "G B", q: "board decisions", route: "/board", hue: "#f0abfc", result: "Board Decisions" },
  { keys: "G R", q: "risk dashboard", route: "/risk", hue: "#fbbf24", result: "Risk & Resilience" },
  {
    keys: "N W",
    q: "new workflow · onboard",
    route: "/workflows/new",
    hue: "#34d399",
    result: "Workflow created",
  },
  {
    keys: "N A",
    q: "deploy ai agent",
    route: "/agents/new",
    hue: "#67e8f9",
    result: "Agent provisioned",
  },
  {
    keys: "F R",
    q: "find revenue Q3 EMEA",
    route: "/search?…",
    hue: "#7fb8ff",
    result: "12 results",
  },
  {
    keys: "⌘ M",
    q: "open marketplace",
    route: "/marketplace",
    hue: "#f43f5e",
    result: "Marketplace · 120 modules",
  },
];

const BEAT = 70;
export const PART5_CMD_DURATION = BEAT * CMDS.length + 50;

export const Part5CommandsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const idx = Math.min(CMDS.length - 1, Math.floor(frame / BEAT));
  const localF = frame - idx * BEAT;
  const cmd = CMDS[idx];

  const typed = cmd.q.slice(
    0,
    Math.floor(interpolate(localF, [0, 32], [0, cmd.q.length], { extrapolateRight: "clamp" })),
  );
  const showResult = localF > 36;
  const enter = spring({ frame: localF, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 11,
          letterSpacing: 6,
          color: "#7fb8ff",
        }}
      >
        COMMAND PALETTE · ⌘K
      </div>

      <div
        style={{
          width: 760,
          padding: 26,
          borderRadius: 22,
          background: "linear-gradient(180deg, rgba(10,18,36,0.95), rgba(4,8,18,0.9))",
          border: `1px solid ${cmd.hue}55`,
          boxShadow: `0 40px 100px -20px ${cmd.hue}66`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 18px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Search size={20} color={cmd.hue} />
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: 0.4,
              flex: 1,
              fontFamily: "monospace",
            }}
          >
            {typed}
            <span style={{ opacity: Math.sin(frame / 4) > 0 ? 1 : 0, color: cmd.hue }}>▌</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 8,
              background: `${cmd.hue}22`,
              border: `1px solid ${cmd.hue}55`,
              fontSize: 11,
              fontWeight: 700,
              color: cmd.hue,
              letterSpacing: 2,
            }}
          >
            {cmd.keys}
          </div>
        </div>

        {showResult && (
          <div
            style={{
              marginTop: 18,
              padding: "16px 18px",
              borderRadius: 14,
              background: `linear-gradient(90deg, ${cmd.hue}22, transparent)`,
              border: `1px solid ${cmd.hue}66`,
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: spring({ frame: localF - 36, fps, config: { damping: 18 } }),
              transform: `translateX(${interpolate(spring({ frame: localF - 36, fps }), [0, 1], [12, 0])}px)`,
            }}
          >
            <Sparkles size={18} color={cmd.hue} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{cmd.result}</div>
              <div
                style={{
                  fontSize: 11,
                  color: "#7fb8ff",
                  fontFamily: "monospace",
                  letterSpacing: 1,
                  marginTop: 3,
                }}
              >
                {cmd.route}
              </div>
            </div>
            <CornerDownLeft size={16} color={cmd.hue} />
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            fontSize: 10,
            color: "#5a7494",
            letterSpacing: 2,
            textAlign: "right",
          }}
        >
          {idx + 1} / {CMDS.length} · ↑↓ navigate · ↵ execute
        </div>
      </div>

      {/* Side list of upcoming */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 200,
          width: 280,
          opacity: 0.7,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 4, color: "#7fb8ff", marginBottom: 10 }}>
          SHORTCUTS QUEUE
        </div>
        {CMDS.map((c, i) => {
          const active = i === idx;
          const done = i < idx;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                marginBottom: 4,
                borderRadius: 8,
                opacity: done ? 0.3 : 1,
                background: active ? `${c.hue}22` : "transparent",
                border: `1px solid ${active ? c.hue + "55" : "transparent"}`,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  color: c.hue,
                  fontWeight: 700,
                  minWidth: 32,
                }}
              >
                {c.keys}
              </span>
              <span style={{ fontSize: 11, color: "#9bb6d6", flex: 1 }}>{c.q}</span>
              {done && <ArrowRight size={10} color="#34d399" />}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
