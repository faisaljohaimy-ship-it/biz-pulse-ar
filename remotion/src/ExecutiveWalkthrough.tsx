import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import durationsJson from "../public/audio/wt-durations.json";

export const WT_FPS = 30;
const PAD = 0.25; // seconds gap between segments
const SEG_FRAMES = (durationsJson as number[]).map((d) => Math.round((d + PAD) * WT_FPS));
const STARTS: number[] = SEG_FRAMES.reduce<number[]>((acc, f, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + SEG_FRAMES[i - 1]);
  return acc;
}, []);
export const WT_DURATION = STARTS[STARTS.length - 1] + SEG_FRAMES[SEG_FRAMES.length - 1] + 30;

type Step = {
  num: number | null;
  title: string;
  subtitle: string;
  image: string;
  // click hotspot in % of frame
  hotspot: { x: number; y: number; w: number; h: number; label: string };
};

const STEPS: Step[] = [
  {
    num: null,
    title: "جولة نِكسَس التنفيذية",
    subtitle: "Executive Walkthrough · 60s",
    image: "tour/02-cockpit.png",
    hotspot: { x: 50, y: 50, w: 0, h: 0, label: "" },
  },
  {
    num: 1,
    title: "تسجيل الدخول",
    subtitle: "Secure Sign-In · 2FA",
    image: "tour/01-login.png",
    hotspot: { x: 50, y: 62, w: 24, h: 7, label: "Sign in" },
  },
  {
    num: 2,
    title: "إضافة البيانات",
    subtitle: "Connect SAP · M365 · ERP",
    image: "tour/06-integrations.png",
    hotspot: { x: 28, y: 38, w: 22, h: 14, label: "Connect" },
  },
  {
    num: 3,
    title: "مراجعة المؤشرات",
    subtitle: "Live Executive KPIs",
    image: "tour/02-cockpit.png",
    hotspot: { x: 25, y: 35, w: 50, h: 22, label: "KPIs" },
  },
  {
    num: 4,
    title: "مساعد آريا الذكي",
    subtitle: "ARIA AI Assistant",
    image: "tour/03-intelligence.png",
    hotspot: { x: 70, y: 78, w: 22, h: 9, label: "Ask ARIA" },
  },
  {
    num: 5,
    title: "إصدار التقارير",
    subtitle: "Board-Ready Report",
    image: "tour/11-briefing.png",
    hotspot: { x: 72, y: 14, w: 22, h: 8, label: "Generate Report" },
  },
  {
    num: 6,
    title: "المراقبة اللحظية",
    subtitle: "Real-Time Operations",
    image: "tour/05-risk.png",
    hotspot: { x: 30, y: 45, w: 40, h: 30, label: "Live" },
  },
  {
    num: 7,
    title: "اتخاذ القرار",
    subtitle: "AI-Driven Decision",
    image: "tour/04-decisions.png",
    hotspot: { x: 55, y: 55, w: 30, h: 12, label: "Approve" },
  },
  {
    num: null,
    title: "من البيانات إلى القرار في ثوانٍ",
    subtitle: "Data → Decision in Seconds",
    image: "tour/08-boardroom.png",
    hotspot: { x: 50, y: 50, w: 0, h: 0, label: "" },
  },
];

const cairo = `'Cairo','Tajawal','Noto Sans Arabic',sans-serif`;
const inter = `'Inter','SF Pro Display',sans-serif`;

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)",
      pointerEvents: "none",
    }}
  />
);

const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px)",
      mixBlendMode: "overlay",
      pointerEvents: "none",
    }}
  />
);

const ClickPulse: React.FC<{ hotspot: Step["hotspot"]; frame: number }> = ({ hotspot, frame }) => {
  if (hotspot.w === 0) return null;
  const pulse = (frame % 60) / 60;
  const ringScale = interpolate(pulse, [0, 1], [1, 1.35]);
  const ringOpacity = interpolate(pulse, [0, 1], [0.9, 0]);
  return (
    <>
      {/* Highlight box */}
      <div
        style={{
          position: "absolute",
          left: `${hotspot.x - hotspot.w / 2}%`,
          top: `${hotspot.y - hotspot.h / 2}%`,
          width: `${hotspot.w}%`,
          height: `${hotspot.h}%`,
          border: "3px solid #FFD24A",
          borderRadius: 14,
          boxShadow: "0 0 0 4px rgba(255,210,74,0.18), 0 0 60px rgba(255,210,74,0.35)",
          background: "rgba(255,210,74,0.08)",
        }}
      />
      {/* Click ring */}
      <div
        style={{
          position: "absolute",
          left: `${hotspot.x}%`,
          top: `${hotspot.y}%`,
          width: 70,
          height: 70,
          marginLeft: -35,
          marginTop: -35,
          border: "3px solid #FFD24A",
          borderRadius: "50%",
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
        }}
      />
      {/* Cursor */}
      <div
        style={{
          position: "absolute",
          left: `${hotspot.x}%`,
          top: `${hotspot.y}%`,
          marginLeft: 4,
          marginTop: 4,
          fontSize: 36,
          color: "#fff",
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
        }}
      >
        ▲
      </div>
      {/* Label */}
      {hotspot.label && (
        <div
          style={{
            position: "absolute",
            left: `${hotspot.x + hotspot.w / 2 + 1}%`,
            top: `${hotspot.y - hotspot.h / 2}%`,
            background: "rgba(8,12,24,0.92)",
            border: "1px solid rgba(255,210,74,0.5)",
            color: "#FFD24A",
            padding: "8px 14px",
            borderRadius: 8,
            fontFamily: inter,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          {hotspot.label}
        </div>
      )}
    </>
  );
};

const StepCard: React.FC<{ step: Step; segFrame: number; segDur: number }> = ({
  step,
  segFrame,
  segDur,
}) => {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: segFrame, fps, config: { damping: 18, stiffness: 120 } });
  const exit = interpolate(segFrame, [segDur - 12, segDur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = enter * (1 - exit);
  const y = interpolate(enter, [0, 1], [40, 0]);

  // Ken Burns
  const kb = interpolate(segFrame, [0, segDur], [1.03, 1.1]);

  return (
    <AbsoluteFill style={{ background: "#05070D" }}>
      <AbsoluteFill style={{ transform: `scale(${kb})`, transformOrigin: "center" }}>
        <Img
          src={staticFile(step.image)}
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,7,13,0.55) 0%, rgba(5,7,13,0.15) 30%, rgba(5,7,13,0.2) 60%, rgba(5,7,13,0.85) 100%)",
        }}
      />
      <Vignette />
      <Scanlines />

      <ClickPulse hotspot={step.hotspot} frame={segFrame} />

      {/* Step number badge */}
      {step.num !== null && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            display: "flex",
            alignItems: "center",
            gap: 20,
            transform: `translateY(${y}px)`,
            opacity,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "linear-gradient(135deg, #FFD24A 0%, #E8A93C 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: inter,
              fontWeight: 800,
              fontSize: 52,
              color: "#0A0E1A",
              boxShadow: "0 12px 40px rgba(255,210,74,0.35)",
            }}
          >
            {step.num}
          </div>
          <div>
            <div
              style={{
                fontFamily: inter,
                color: "#FFD24A",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              Step {String(step.num).padStart(2, "0")}
            </div>
            <div
              style={{
                fontFamily: inter,
                color: "rgba(255,255,255,0.7)",
                fontSize: 15,
                letterSpacing: 2,
                marginTop: 4,
              }}
            >
              EXECUTIVE WALKTHROUGH
            </div>
          </div>
        </div>
      )}

      {/* Title block bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 80,
          left: 80,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          transform: `translateY(${y}px)`,
          opacity,
        }}
      >
        <div
          dir="rtl"
          style={{
            fontFamily: cairo,
            color: "#fff",
            fontSize: 78,
            fontWeight: 800,
            lineHeight: 1.1,
            textShadow: "0 4px 24px rgba(0,0,0,0.8)",
          }}
        >
          {step.title}
        </div>
        <div
          style={{
            fontFamily: inter,
            color: "#FFD24A",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: 3,
            marginTop: 14,
            textShadow: "0 2px 12px rgba(0,0,0,0.7)",
          }}
        >
          {step.subtitle}
        </div>
      </div>

      {/* Progress dots */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {STEPS.slice(1, 8).map((s, i) => {
          const active = step.num === s.num;
          return (
            <div
              key={i}
              style={{
                width: active ? 36 : 10,
                height: 6,
                borderRadius: 3,
                background: active ? "#FFD24A" : "rgba(255,255,255,0.25)",
                transition: "all 0.3s",
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const ExecutiveWalkthrough: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#05070D" }}>
      {STEPS.map((step, i) => {
        const start = STARTS[i];
        const dur = SEG_FRAMES[i];
        if (frame < start || frame >= start + dur) return null;
        return (
          <Sequence key={i} from={start} durationInFrames={dur} layout="none">
            <StepCard step={step} segFrame={frame - start} segDur={dur} />
            <Audio src={staticFile(`audio/wt-${String(i).padStart(2, "0")}.mp3`)} />
          </Sequence>
        );
      })}
      {/* Persistent corner brand */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 60,
          fontFamily: inter,
          fontSize: 22,
          fontWeight: 700,
          color: "rgba(255,255,255,0.85)",
          letterSpacing: 6,
        }}
      >
        NEEXIOS
      </div>
    </AbsoluteFill>
  );
};
