import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { ArrowLeft, CornerDownLeft, Search, Sparkles } from "lucide-react";

type Cmd = { keys: string; q: string; route: string; hue: string; result: string };
const CMDS: Cmd[] = [
  {
    keys: "G D",
    q: "افتح لوحة القيادة",
    route: "/cockpit",
    hue: "#22d3ee",
    result: "قمرة القيادة التنفيذية",
  },
  {
    keys: "G I",
    q: "افتح الذكاء الاصطناعي",
    route: "/intelligence",
    hue: "#a78bfa",
    result: "طبقة الذكاء الاصطناعي",
  },
  {
    keys: "G B",
    q: "قرارات المجلس",
    route: "/board",
    hue: "#f0abfc",
    result: "قرارات مجلس الإدارة",
  },
  { keys: "G R", q: "لوحة المخاطر", route: "/risk", hue: "#fbbf24", result: "المخاطر والصلابة" },
  {
    keys: "N W",
    q: "سير عمل جديد · إدخال عميل",
    route: "/workflows/new",
    hue: "#34d399",
    result: "تم إنشاء سير العمل",
  },
  {
    keys: "N A",
    q: "إطلاق وكيل ذكاء جديد",
    route: "/agents/new",
    hue: "#67e8f9",
    result: "تم تجهيز الوكيل",
  },
  {
    keys: "F R",
    q: "ابحث: إيرادات Q3 الشرق الأوسط",
    route: "/search?…",
    hue: "#7fb8ff",
    result: "١٢ نتيجة",
  },
  {
    keys: "⌘ M",
    q: "افتح المتجر",
    route: "/marketplace",
    hue: "#f43f5e",
    result: "المتجر · ١٢٠ وحدة",
  },
];

const BEAT = 70;
export const PART6_CMD_DURATION = BEAT * CMDS.length + 50;

export const Part6CommandsSceneAR: React.FC = () => {
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

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 13,
          letterSpacing: 4,
          color: "#7fb8ff",
        }}
      >
        لوحة الأوامر · ⌘K
      </div>

      <div
        style={{
          width: 820,
          padding: 26,
          borderRadius: 22,
          direction: "rtl",
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
          <div style={{ fontSize: 22, fontWeight: 600, color: "#fff", flex: 1 }}>
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
              fontFamily: "monospace",
              direction: "ltr",
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
              background: `linear-gradient(270deg, ${cmd.hue}22, transparent)`,
              border: `1px solid ${cmd.hue}66`,
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: spring({ frame: localF - 36, fps, config: { damping: 18 } }),
              transform: `translateX(${interpolate(spring({ frame: localF - 36, fps }), [0, 1], [-12, 0])}px)`,
            }}
          >
            <Sparkles size={18} color={cmd.hue} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{cmd.result}</div>
              <div
                style={{
                  fontSize: 12,
                  color: "#7fb8ff",
                  fontFamily: "monospace",
                  marginTop: 3,
                  direction: "ltr",
                  textAlign: "right",
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
            fontSize: 11,
            color: "#5a7494",
            letterSpacing: 1,
            textAlign: "left",
          }}
        >
          {idx + 1} / {CMDS.length} · ↑↓ تنقل · ↵ تنفيذ
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          top: 200,
          width: 300,
          direction: "rtl",
          opacity: 0.75,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#7fb8ff", marginBottom: 10 }}>
          قائمة الاختصارات
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
                  direction: "ltr",
                }}
              >
                {c.keys}
              </span>
              <span style={{ fontSize: 12, color: "#9bb6d6", flex: 1 }}>{c.q}</span>
              {done && <ArrowLeft size={10} color="#34d399" />}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
