import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { CheckCircle2, Circle, Loader2, Workflow, Bot, ShieldCheck, GitBranch, Bell } from "lucide-react";

const STEPS = [
  { l: "تحليل الأمر · فهم اللغة الطبيعية",     i: Workflow,    hue: "#7fb8ff" },
  { l: "السياسات والصلاحيات · RBAC + SOC2",     i: ShieldCheck, hue: "#fbbf24" },
  { l: "تخطيط الخطوات · ٤ مهام فرعية",          i: GitBranch,   hue: "#a78bfa" },
  { l: "إرسال وكلاء الذكاء (٣)",                i: Bot,         hue: "#34d399" },
  { l: "تشغيل التكاملات · ERP + CRM",            i: GitBranch,   hue: "#67e8f9" },
  { l: "التحقق من المخرجات · الحوكمة",           i: ShieldCheck, hue: "#f0abfc" },
  { l: "اعتماد · إشعار أصحاب العلاقة",            i: Bell,        hue: "#22d3ee" },
];

const STEP = 38;
export const PART6_EXEC_DURATION = STEP * STEPS.length + 90;

export const Part6ExecutionSceneAR: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 13, letterSpacing: 4, color: "#7fb8ff" }}>محرك التنفيذ</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginTop: 8 }}>
          أمر واحد ← تنفيذ كامل من البداية للنهاية
        </div>
      </div>

      <div style={{
        width: 880, padding: 28, borderRadius: 22, direction: "rtl",
        background: "linear-gradient(180deg, rgba(10,18,36,0.92), rgba(4,8,18,0.85))",
        border: "1px solid rgba(34,211,238,0.35)",
        boxShadow: "0 40px 100px -20px rgba(34,211,238,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "8px 12px", borderRadius: 10, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)", direction: "ltr" }}>
          <span style={{ fontFamily: "monospace", fontSize: 13, color: "#22d3ee" }}>$ nexus run "إدخال عميل جديد · شركة أكمي القابضة"</span>
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
              transform: `translateX(${interpolate(enter, [0, 1], [-16, 0])}px)`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${s.hue}22`, border: `1px solid ${s.hue}66`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={16} color={s.hue} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{s.l}</div>
                <div style={{ fontSize: 11, color: "#7892b4", marginTop: 2, fontFamily: "monospace", direction: "ltr", textAlign: "right" }}>
                  step.{String(i + 1).padStart(2, "0")} · {done ? "OK" : running ? "running…" : "pending"}
                </div>
              </div>
              {done ? <CheckCircle2 size={20} color="#34d399" />
                : running ? <Loader2 size={18} color={s.hue} style={{ transform: `rotate(${(frame * 12) % 360}deg)` }} />
                : <Circle size={18} color="#3a4a64" />}
            </div>
          );
        })}

        <div style={{
          marginTop: 16, padding: "14px 16px", borderRadius: 12,
          background: "linear-gradient(270deg, rgba(52,211,153,0.18), transparent)",
          border: "1px solid rgba(52,211,153,0.55)",
          display: "flex", alignItems: "center", gap: 12,
          opacity: spring({ frame: frame - STEPS.length * STEP, fps, config: { damping: 18 } }),
        }}>
          <CheckCircle2 size={22} color="#34d399" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>اكتمل التنفيذ · ٤٫٢ ثانية كاملة</div>
            <div style={{ fontSize: 11, color: "#9bb6d6", marginTop: 2 }}>٧ خطوات · ٣ وكلاء · ٤ تكاملات · ٠ أخطاء</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
