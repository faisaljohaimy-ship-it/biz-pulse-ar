import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  staticFile,
  Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Cairo";
import { TwinBackground } from "./scenes/TwinBackground";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["arabic"],
});

export const STEPS_AR_FPS = 30;

const STEPS = [
  {
    dur: 305,
    num: "٠٠",
    tag: "المشكلة",
    title: "فوضى الأنظمة · كثرة البيانات · ضعف القرار",
    ai: "تشخيص بالذكاء الاصطناعي",
  },
  {
    dur: 398,
    num: "٠١",
    tag: "الخطوة ١",
    title: "ربط كل الأنظمة في سطح واحد",
    ai: "بيانات حيّة بـ AI",
  },
  {
    dur: 373,
    num: "٠٢",
    tag: "الخطوة ٢",
    title: "نسيج الذكاء يكشف الأنماط الخفيّة",
    ai: "تحليل لحظي بـ AI",
  },
  {
    dur: 342,
    num: "٠٣",
    tag: "الخطوة ٣",
    title: "التوأم الرقمي · حاكِ قراراتك قبل تنفيذها",
    ai: "محاكاة بـ AI",
  },
  {
    dur: 405,
    num: "٠٤",
    tag: "الخطوة ٤",
    title: "آريا · مساعد تنفيذي بالعربية والإنجليزية",
    ai: "Copilot · AI",
  },
  {
    dur: 348,
    num: "٠٥",
    tag: "الخطوة ٥",
    title: "ذكاءٌ تنبّؤي يكشف المخاطر قبل وقوعها",
    ai: "Predictive AI",
  },
  {
    dur: 406,
    num: "٠٦",
    tag: "الخطوة ٦",
    title: "حوكمة ذكية · سياسةٌ مرتبطةٌ بنتيجة",
    ai: "Governance · AI",
  },
  {
    dur: 369,
    num: "٠٧",
    tag: "الخطوة ٧",
    title: "تقرير مجلس الإدارة جاهز قبل الاجتماع",
    ai: "Boardroom · AI",
  },
  {
    dur: 365,
    num: "٠٨",
    tag: "الخطوة ٨",
    title: "ذاكرة تنفيذية · لا قرار يضيع",
    ai: "Memory · AI",
  },
  {
    dur: 353,
    num: "٠٩",
    tag: "الخلاصة",
    title: "نظامٌ رقميٌّ شامل لحلّ مشكلات المؤسسات بالـ AI",
    ai: "Nexus · Full Stack AI",
  },
];

export const STEPS_AR_DURATION = STEPS.reduce((a, s) => a + s.dur, 0);

const Crosshair: React.FC = () => {
  const f = useCurrentFrame();
  const r = 220 + Math.sin(f / 18) * 12;
  return (
    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <g transform="translate(960, 540)" stroke="#22d3ee" fill="none" opacity={0.5}>
        <circle r={r} strokeWidth={1.2} strokeDasharray="3 8" />
        <circle r={r * 0.7} strokeWidth={1} strokeDasharray="2 6" opacity={0.6} />
      </g>
    </svg>
  );
};

const RingPulse: React.FC<{ color?: string }> = ({ color = "#a78bfa" }) => {
  const f = useCurrentFrame();
  return (
    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <g transform="translate(960, 540)" fill="none">
        {[0, 25, 50, 75].map((d, i) => {
          const t = ((f - d) % 100) / 100;
          if (t < 0) return null;
          const r = interpolate(t, [0, 1], [40, 520]);
          const op = interpolate(t, [0, 1], [0.55, 0]);
          return <circle key={i} r={r} stroke={color} strokeWidth={2} opacity={op} />;
        })}
      </g>
    </svg>
  );
};

const Stream: React.FC<{ color: string; offset: number; y: number }> = ({ color, offset, y }) => {
  const f = useCurrentFrame();
  const path = `M -200 ${y} Q 480 ${y - 80 + Math.sin((f + offset) / 22) * 60} 960 ${y} T 2200 ${y}`;
  return (
    <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%">
      <path
        d={path}
        stroke={color}
        strokeWidth={2}
        fill="none"
        opacity={0.6}
        strokeDasharray="6 14"
        strokeDashoffset={-((f * 4 + offset) % 200)}
      />
    </svg>
  );
};

const AiBadge: React.FC<{ label: string }> = ({ label }) => {
  const f = useCurrentFrame();
  const p = spring({ frame: f - 20, fps: STEPS_AR_FPS, config: { damping: 14, stiffness: 110 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        right: 56,
        direction: "ltr",
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [-12, 0])}px)`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 18px",
        borderRadius: 999,
        background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(167,139,250,0.18))",
        border: "1px solid rgba(34,211,238,0.5)",
        boxShadow: "0 12px 40px -8px rgba(34,211,238,0.45)",
        color: "#e2f0ff",
        fontSize: 13,
        letterSpacing: 3,
        fontWeight: 800,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: "#22d3ee",
          boxShadow: "0 0 14px #22d3ee",
        }}
      />
      {label}
    </div>
  );
};

const StepTitleCard: React.FC<{ step: (typeof STEPS)[number] }> = ({ step }) => {
  const f = useCurrentFrame();
  const inP = spring({ frame: f, fps: STEPS_AR_FPS, config: { damping: 18, stiffness: 90 } });
  const outP = interpolate(f, [step.dur - 30, step.dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = inP * (1 - outP);
  const ty = interpolate(inP, [0, 1], [40, 0]);
  const lineW = interpolate(inP, [0, 1], [0, 320]);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        padding: "0 110px 150px 110px",
        direction: "rtl",
        transform: `translateY(${ty}px)`,
        opacity,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
        <div
          style={{
            width: lineW,
            height: 2,
            background: "linear-gradient(90deg, transparent, #22d3ee)",
          }}
        />
        <span style={{ color: "#7fb8ff", fontSize: 16, letterSpacing: 6, fontWeight: 800 }}>
          {step.tag} · {step.num}
        </span>
      </div>
      <h1
        style={{
          color: "#fff",
          fontSize: 70,
          lineHeight: 1.2,
          margin: 0,
          fontWeight: 800,
          letterSpacing: -1,
          textShadow: "0 8px 40px rgba(34,211,238,0.35), 0 2px 0 rgba(0,0,0,0.5)",
          maxWidth: 1500,
          textAlign: "right",
        }}
      >
        {step.title}
      </h1>
    </div>
  );
};

const ProgressRail: React.FC<{ idx: number; total: number }> = ({ idx, total }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 110,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 10,
        direction: "ltr",
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const active = i === idx;
        const done = i < idx;
        const pulse = active ? 0.6 + Math.sin(f / 6) * 0.4 : 1;
        return (
          <div
            key={i}
            style={{
              width: active ? 44 : 22,
              height: 4,
              borderRadius: 4,
              background: done ? "#22d3ee" : active ? "#22d3ee" : "rgba(127,184,255,0.25)",
              opacity: active ? pulse : 1,
              transition: "all 0.3s",
            }}
          />
        );
      })}
    </div>
  );
};

const Step: React.FC<{ step: (typeof STEPS)[number]; idx: number }> = ({ step, idx }) => {
  const f = useCurrentFrame();
  let motif: React.ReactNode = null;
  if (idx === 0)
    motif = (
      <>
        <Stream color="#f43f5e" offset={0} y={420} />
        <Stream color="#f59e0b" offset={40} y={520} />
        <Stream color="#a78bfa" offset={80} y={620} />
      </>
    );
  else if (idx === 1)
    motif = (
      <>
        <Stream color="#22d3ee" offset={0} y={400} />
        <Stream color="#34d399" offset={50} y={560} />
        <RingPulse color="#22d3ee" />
      </>
    );
  else if (idx === 2)
    motif = (
      <>
        <Stream color="#22d3ee" offset={0} y={380} />
        <Stream color="#34d399" offset={30} y={500} />
        <Stream color="#a78bfa" offset={60} y={620} />
        <Crosshair />
      </>
    );
  else if (idx === 3) motif = <Crosshair />;
  else if (idx === 4) motif = <RingPulse color="#22d3ee" />;
  else if (idx === 5)
    motif = (
      <>
        <Stream color="#f59e0b" offset={0} y={460} />
        <Stream color="#22d3ee" offset={50} y={580} />
        <RingPulse />
      </>
    );
  else if (idx === 6)
    motif = (
      <>
        <Crosshair />
        <Stream color="#34d399" offset={20} y={620} />
      </>
    );
  else if (idx === 7) motif = <RingPulse color="#22d3ee" />;
  else if (idx === 8)
    motif = (
      <>
        <Stream color="#a78bfa" offset={0} y={460} />
        <Stream color="#22d3ee" offset={50} y={620} />
      </>
    );
  else
    motif = (
      <>
        <RingPulse />
        <Crosshair />
      </>
    );

  const vig = Math.sin(f / 30) * 0.05 + 0.95;
  return (
    <AbsoluteFill style={{ background: "#04060d", color: "#e2f0ff", fontFamily }}>
      <TwinBackground />
      {motif}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,10,0.85) 100%)",
          opacity: vig,
          pointerEvents: "none",
        }}
      />
      <AiBadge label={step.ai} />
      <StepTitleCard step={step} />
      <ProgressRail idx={idx} total={STEPS.length} />
      <div
        style={{
          position: "absolute",
          bottom: 36,
          right: 50,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: 0.85,
          direction: "ltr",
        }}
      >
        <Img
          src={staticFile("images/nexus-icon.png")}
          style={{ width: 40, height: 40, borderRadius: 8 }}
        />
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, color: "#fff" }}>
            NEXUS
          </div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#7fb8ff" }}>AI OPERATING SYSTEM</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const StepsAR: React.FC = () => {
  let acc = 0;
  return (
    <AbsoluteFill style={{ background: "#04060d" }}>
      <Audio src={staticFile("audio/steps-ar.mp3")} volume={1} />
      {STEPS.map((s, i) => {
        const from = acc;
        acc += s.dur;
        return (
          <Sequence key={i} from={from} durationInFrames={s.dur}>
            <Step step={s} idx={i} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
