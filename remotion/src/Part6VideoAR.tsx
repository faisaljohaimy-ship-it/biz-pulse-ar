import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cairo";
import { TwinBackground } from "./scenes/TwinBackground";
import { Part6OrbitSceneAR, PART6_ORBIT_DURATION } from "./scenes/Part6OrbitSceneAR";
import { Part6CommandsSceneAR, PART6_CMD_DURATION } from "./scenes/Part6CommandsSceneAR";
import { Part6ExecutionSceneAR, PART6_EXEC_DURATION } from "./scenes/Part6ExecutionSceneAR";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["arabic"] });

export const PART6_DURATION = PART6_ORBIT_DURATION + PART6_CMD_DURATION + PART6_EXEC_DURATION;

export const Part6VideoAR: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pulse = Math.sin((frame / durationInFrames) * Math.PI * 2) * 0.05 + 0.95;
  const titleOpacity = interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#04060d", fontFamily, color: "#e2f0ff", direction: "rtl" }}>
      <TwinBackground />
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,10,0.85) 100%)",
        opacity: pulse, pointerEvents: "none",
      }} />

      <Sequence from={0} durationInFrames={PART6_ORBIT_DURATION}>
        <Part6OrbitSceneAR />
      </Sequence>
      <Sequence from={PART6_ORBIT_DURATION} durationInFrames={PART6_CMD_DURATION}>
        <Part6CommandsSceneAR />
      </Sequence>
      <Sequence from={PART6_ORBIT_DURATION + PART6_CMD_DURATION} durationInFrames={PART6_EXEC_DURATION}>
        <Part6ExecutionSceneAR />
      </Sequence>

      <AbsoluteFill style={{ opacity: titleOpacity, alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{
          padding: "14px 40px", borderRadius: 999,
          background: "rgba(4,8,20,0.7)", border: "1px solid rgba(34,211,238,0.4)",
          boxShadow: "0 20px 60px -10px rgba(34,211,238,0.4)",
          marginTop: -380,
        }}>
          <span style={{ fontSize: 14, letterSpacing: 4, color: "#7fb8ff" }}>الجزء ٦ · </span>
          <span style={{ fontSize: 14, letterSpacing: 2, color: "#fff", fontWeight: 800 }}>النظام الكامل · الأوامر · التنفيذ</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
