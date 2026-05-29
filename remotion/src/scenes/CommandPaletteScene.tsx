import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import {
  Search, ArrowRight, LayoutDashboard, Brain, ShieldAlert, Workflow,
  Vote, Presentation, Database, Bot, Building2, Sparkles, CornerDownLeft,
} from "lucide-react";

// 3 query beats, each 110 frames (slightly slower than Part 1)
const BEAT = 110;
const QUERIES = [
  { typed: "intel", focus: 0, action: "Open AI Intelligence" },
  { typed: "risk",  focus: 0, action: "Open Risk & Resilience" },
  { typed: "board", focus: 0, action: "Open Boardroom Mode" },
];
export const PALETTE_DURATION = BEAT * QUERIES.length;

const RESULTS_BY_QUERY: Record<string, Array<{ icon: any; label: string; cat: string; route: string; tone: string }>> = {
  intel: [
    { icon: Brain,         label: "AI Intelligence",     cat: "Module",  route: "/intelligence",  tone: "#a78bfa" },
    { icon: Database,      label: "Intelligence Lake",   cat: "Data",    route: "/analytics",     tone: "#22d3ee" },
    { icon: Bot,           label: "Intel Agent · Aria",  cat: "Agent",   route: "/agents",        tone: "#34d399" },
  ],
  risk: [
    { icon: ShieldAlert,   label: "Risk & Resilience",   cat: "Module",  route: "/risk",          tone: "#f43f5e" },
    { icon: Workflow,      label: "Risk Mitigation Flow",cat: "Workflow",route: "/workflows",     tone: "#34d399" },
    { icon: Building2,     label: "Risk Owners · 12",    cat: "People",  route: "/team",          tone: "#7fb8ff" },
  ],
  board: [
    { icon: Presentation,  label: "Boardroom Mode",      cat: "Module",  route: "/boardroom",     tone: "#f0abfc" },
    { icon: Vote,          label: "Board Decisions · 14",cat: "Action",  route: "/decisions",     tone: "#fbbf24" },
    { icon: LayoutDashboard,label:"Board Cockpit",       cat: "View",    route: "/cockpit",       tone: "#22d3ee" },
  ],
};

export const CommandPaletteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const beatIdx = Math.min(QUERIES.length - 1, Math.floor(frame / BEAT));
  const localFrame = frame - beatIdx * BEAT;
  const q = QUERIES[beatIdx];
  const results = RESULTS_BY_QUERY[q.typed];

  // Typing effect: chars revealed over first ~25 frames
  const charsShown = Math.min(q.typed.length, Math.floor(interpolate(localFrame, [5, 30], [0, q.typed.length + 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const typed = q.typed.slice(0, charsShown);
  const caretBlink = Math.floor(localFrame / 8) % 2 === 0;

  // Selection moves down after results appear
  const selection = Math.min(results.length - 1, Math.floor(interpolate(localFrame, [55, 85], [0, results.length - 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));

  // Enter ripple
  const enterT = interpolate(localFrame, [88, 105], [0, 1], { extrapolateRight: "clamp" });

  // Modal enter on first beat, persists
  const modalEnter = spring({ frame, fps, config: { damping: 20, stiffness: 130 } });
  const modalScale = interpolate(modalEnter, [0, 1], [0.9, 1]);

  // Dim backdrop
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(2,4,12,0.55)", opacity: modalEnter }} />

      {/* Palette modal */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: `translate(-50%, -50%) scale(${modalScale})`,
        width: 760, opacity: modalEnter,
        borderRadius: 24,
        background: "linear-gradient(180deg, rgba(12,22,42,0.92), rgba(4,10,22,0.92))",
        border: "1px solid rgba(34,211,238,0.3)",
        boxShadow: "0 60px 160px -40px rgba(34,211,238,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={14} color="#22d3ee" />
            <span style={{ fontSize: 11, letterSpacing: 4, color: "#7fb8ff", fontWeight: 700 }}>NEXUS COMMAND PALETTE</span>
          </div>
          <div style={{
            padding: "3px 10px", borderRadius: 6, fontSize: 10, letterSpacing: 2,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#9bb6d6", fontFamily: "monospace",
          }}>
            ⌘ K
          </div>
        </div>

        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "22px 24px" }}>
          <Search size={22} color="#7fb8ff" strokeWidth={2} />
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <span style={{ fontSize: 26, color: "#fff", letterSpacing: 1, fontWeight: 500 }}>{typed}</span>
            <span style={{
              display: "inline-block", marginLeft: 3,
              width: 2, height: 28, background: caretBlink ? "#22d3ee" : "transparent",
              boxShadow: caretBlink ? "0 0 8px #22d3ee" : "none",
            }} />
            {!typed && (
              <span style={{ fontSize: 22, color: "#5a7494", letterSpacing: 1 }}>
                Search modules, agents, decisions…
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["↑", "↓", "↵"].map((k) => (
              <div key={k} style={{
                width: 26, height: 26, borderRadius: 6,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: "#9bb6d6",
              }}>{k}</div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ padding: "6px 12px 16px", maxHeight: 320, overflow: "hidden" }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#5a7494", padding: "8px 12px" }}>SUGGESTIONS</div>
          {results.map((r, i) => {
            const e = spring({ frame: localFrame - 30 - i * 5, fps, config: { damping: 20 } });
            const active = i === selection;
            const Icon = r.icon;
            return (
              <div key={r.label} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 14px", borderRadius: 12, marginBottom: 4,
                background: active
                  ? `linear-gradient(90deg, ${r.tone}22, ${r.tone}05)`
                  : "transparent",
                border: `1px solid ${active ? r.tone + "55" : "transparent"}`,
                opacity: e,
                transform: `translateX(${interpolate(e, [0, 1], [-16, 0])}px)`,
                boxShadow: active ? `0 0 30px -10px ${r.tone}99` : "none",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${r.tone}22`, border: `1px solid ${r.tone}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={18} color={r.tone} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: "#7892b4", letterSpacing: 1.5, marginTop: 2, fontFamily: "monospace" }}>
                    {r.cat} · nexus://app{r.route}
                  </div>
                </div>
                {active && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: r.tone, fontSize: 11, letterSpacing: 1, fontWeight: 700 }}>
                    <ArrowRight size={14} />
                    OPEN
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 22px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#7892b4" }}>
            {q.action.toUpperCase()}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#9bb6d6", letterSpacing: 1.5 }}>
            <CornerDownLeft size={12} />
            ENTER TO NAVIGATE
          </div>
        </div>

        {/* Enter ripple */}
        {enterT > 0 && (
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(circle at center, rgba(34,211,238,${0.4 * (1 - enterT)}), transparent ${40 + enterT * 60}%)`,
            pointerEvents: "none",
          }} />
        )}
      </div>

      {/* Caption */}
      <div style={{
        position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)",
        padding: "10px 28px", borderRadius: 999,
        background: "rgba(4,8,18,0.7)", border: "1px solid rgba(34,211,238,0.3)",
        fontSize: 11, letterSpacing: 6, color: "#7fb8ff", opacity: modalEnter,
      }}>
        TYPE · SELECT · ENTER — INSTANT NAVIGATION
      </div>
    </AbsoluteFill>
  );
};
