import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import {
  LayoutDashboard, Brain, Vote, ShieldAlert, Workflow, Presentation,
  Activity, Cpu, Network, Sparkles
} from "lucide-react";

const ICONS: Record<string, React.FC<{ size: number; color: string; strokeWidth: number }>> = {
  cockpit: LayoutDashboard,
  intelligence: Brain,
  decisions: Vote,
  risk: ShieldAlert,
  execution: Workflow,
  boardroom: Presentation,
};

const TONES: Record<string, string> = {
  cockpit: "#22d3ee",
  intelligence: "#a78bfa",
  decisions: "#fbbf24",
  risk: "#f43f5e",
  execution: "#34d399",
  boardroom: "#f0abfc",
};

const METRICS: Record<string, Array<{ l: string; v: string }>> = {
  cockpit:      [{ l: "Health", v: "96%" }, { l: "Active KPIs", v: "184" }, { l: "Live Streams", v: "23" }],
  intelligence: [{ l: "Signals", v: "4.2K" }, { l: "Confidence", v: "94%" }, { l: "Models", v: "12" }],
  decisions:    [{ l: "Pending", v: "14" }, { l: "Approved", v: "47" }, { l: "Avg Time", v: "2.1d" }],
  risk:         [{ l: "Critical", v: "2" }, { l: "Mitigated", v: "31" }, { l: "Coverage", v: "94%" }],
  execution:    [{ l: "Workflows", v: "86" }, { l: "On-Track", v: "78%" }, { l: "Automations", v: "240" }],
  boardroom:    [{ l: "Decks", v: "12" }, { l: "KPIs Live", v: "ALL" }, { l: "Next Review", v: "Q3" }],
};

type Props = { index: number; total: number; label: string; moduleKey: string };

export const NavScene: React.FC<Props> = ({ index, total, label, moduleKey }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const Icon = ICONS[moduleKey] ?? Activity;
  const tone = TONES[moduleKey] ?? "#22d3ee";
  const metrics = METRICS[moduleKey] ?? [];

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 130 } });
  const exit = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = enter * (1 - exit);
  const translateX = interpolate(enter, [0, 1], [80, 0]) + interpolate(exit, [0, 1], [0, -80]);

  // Crosshair sweep on the twin
  const sweep = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Crosshair target on background — fades in/out */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: opacity * 0.8, pointerEvents: "none" }}>
        <div style={{
          width: 320 * sweep + 40, height: 320 * sweep + 40, borderRadius: "50%",
          border: `2px solid ${tone}`, opacity: 0.5,
          boxShadow: `0 0 60px ${tone}55, inset 0 0 40px ${tone}33`,
        }} />
      </AbsoluteFill>

      {/* Left rail: module list */}
      <div style={{
        position: "absolute", top: 120, left: 70, opacity,
        display: "flex", flexDirection: "column", gap: 14, width: 360,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: "#7fb8ff", marginBottom: 12 }}>SYSTEM MODULES</div>
        {Object.keys(ICONS).map((k, i) => {
          const active = i === index;
          const ItemIcon = ICONS[k];
          return (
            <div key={k} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 16px", borderRadius: 14,
              background: active ? `linear-gradient(90deg, ${TONES[k]}22, transparent)` : "rgba(255,255,255,0.02)",
              border: `1px solid ${active ? TONES[k] + "88" : "rgba(255,255,255,0.06)"}`,
              transform: active ? "translateX(8px)" : "translateX(0)",
              transition: "none",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: active ? TONES[k] + "33" : "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${active ? TONES[k] : "rgba(255,255,255,0.08)"}`,
              }}>
                <ItemIcon size={18} color={active ? TONES[k] : "#7892b4"} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: active ? "#fff" : "#7892b4", letterSpacing: 1 }}>
                  {labelOf(k)}
                </div>
              </div>
              {active && (
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: TONES[k],
                  boxShadow: `0 0 12px ${TONES[k]}`,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Right panel: active module detail */}
      <div style={{
        position: "absolute", top: 120, right: 70, width: 560,
        opacity, transform: `translateX(${translateX}px)`,
      }}>
        <div style={{
          padding: 32, borderRadius: 24,
          background: "linear-gradient(180deg, rgba(10,20,40,0.85), rgba(4,8,20,0.7))",
          border: `1px solid ${tone}55`,
          boxShadow: `0 30px 80px -20px ${tone}66, inset 0 1px 0 rgba(255,255,255,0.05)`,
          backdropFilter: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: `${tone}22`, border: `1px solid ${tone}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 30px ${tone}66`,
            }}>
              <Icon size={32} color={tone} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 5, color: tone }}>
                MODULE {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: 1, marginTop: 4 }}>
                {label}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 24 }}>
            {metrics.map((m, i) => {
              const mEnter = spring({ frame: frame - 8 - i * 4, fps, config: { damping: 18 } });
              return (
                <div key={m.l} style={{
                  padding: 16, borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  opacity: mEnter,
                  transform: `translateY(${interpolate(mEnter, [0, 1], [12, 0])}px)`,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "#7892b4" }}>{m.l.toUpperCase()}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: tone, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{m.v}</div>
                </div>
              );
            })}
          </div>

          {/* Status bar */}
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "#34d399",
              boxShadow: "0 0 10px #34d399",
            }} />
            <div style={{ fontSize: 11, color: "#9bb6d6", letterSpacing: 2 }}>LIVE · STREAMING · SECURE</div>
            <div style={{ flex: 1 }} />
            <Sparkles size={14} color={tone} />
          </div>
        </div>
      </div>

      {/* Top progress strip */}
      <div style={{
        position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 10, opacity,
      }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i === index ? 40 : 16, height: 4, borderRadius: 2,
            background: i <= index ? tone : "rgba(255,255,255,0.12)",
            boxShadow: i === index ? `0 0 10px ${tone}` : "none",
          }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

function labelOf(k: string) {
  const map: Record<string, string> = {
    cockpit: "Executive Cockpit",
    intelligence: "AI Intelligence",
    decisions: "Board Decisions",
    risk: "Risk & Resilience",
    execution: "Execution Engine",
    boardroom: "Boardroom Mode",
  };
  return map[k] ?? k;
}
