import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { CheckCircle2, Circle, Loader2, Workflow, Bot, ShieldCheck, GitBranch, Bell } from "lucide-react";

const STEPS = [
  { l: "Parse intent · NLU",            i: Workflow,    hue: "#7fb8ff" },
  { l: "Resolve policy · RBAC + SOC2",  i: ShieldCheck, hue: "#fbbf24" },
  { l: "Plan steps · 4 sub-tasks",      i: GitBranch,   hue: "#a78bfa" },
  { l: "Dispatch AI agents (3)",         i: Bot,         hue: "#34d399" },
  { l: "Run integrations · ERP + CRM",  i: GitBranch,   hue: "#67e8f9" },
  { l: "Validate output · governance",  i: ShieldCheck, hue: "#f0abfc" },
  { l: "Commit · notify stakeholders",  i: Bell,        hue: "#22d3ee" },
];

const STEP = 38;
export const PART5_EXEC_DURATION = STEP * STEPS.length + 90;

export const Part5ExecutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: "#7fb8ff" }}>EXECUTION ENGINE</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginTop: 8, letterSpacing: 1 }}>
          One command → end-to-end orchestration
        </div>
      </div>

      <div style={{
        width: 820, padding: 28, borderRadius: 22,
        background: "linear-gradient(180deg, rgba(10,18,36,0.92), rgba(4,8,18,0.85))",
        border: "1px solid rgba(34,211,238,0.35)",
        boxShadow: "0 40px 100px -20px rgba(34,211,238,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "8px 12px", borderRadius: 10, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)" }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#22d3ee" }}>$ nexus run "onboard new client · Acme Holdings"</span>
        </div>

        {STEPS.map((s, i) => {
          const enter = spring({ frame: frame - i * STEP, fps, config: { damping: 18 } });
          const done = frame > (i + 1) * STEP + 8;
          const running = frame > i * STEP && !done;
          const Icon = s.i;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 14px", marginBottom: 6, borderRadius: 12,
              background: running ? `${s.hue}1a` : "rgba(255,255,255,0.03)",
              border: `1px solid ${running ? s.hue + "66" : done ? "#34d39955" : "rgba(255,255,255,0.05)"}`,
              opacity: enter,
              transform: `translateX(${interpolate(enter, [0, 1], [16, 0])}px)`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${s.hue}22`, border: `1px solid ${s.hue}66`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={16} color={s.hue} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>{s.l}</div>
                <div style={{ fontSize: 10, color: "#7892b4", letterSpacing: 1, marginTop: 2, fontFamily: "monospace" }}>
                  step.{String(i + 1).padStart(2, "0")} · {done ? "OK" : running ? "running…" : "pending"}
                </div>
              </div>
              {done ? <CheckCircle2 size={20} color="#34d399" />
                : running ? <Loader2 size={18} color={s.hue} style={{ animation: "none", transform: `rotate(${(frame * 12) % 360}deg)` }} />
                : <Circle size={18} color="#3a4a64" />}
            </div>
          );
        })}

        <div style={{
          marginTop: 16, padding: "14px 16px", borderRadius: 12,
          background: "linear-gradient(90deg, rgba(52,211,153,0.18), transparent)",
          border: "1px solid rgba(52,211,153,0.55)",
          display: "flex", alignItems: "center", gap: 12,
          opacity: spring({ frame: frame - STEPS.length * STEP, fps, config: { damping: 18 } }),
        }}>
          <CheckCircle2 size={22} color="#34d399" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Execution complete · 4.2s end-to-end</div>
            <div style={{ fontSize: 10, color: "#9bb6d6", letterSpacing: 1, marginTop: 2 }}>7 steps · 3 agents · 4 integrations · 0 errors</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
