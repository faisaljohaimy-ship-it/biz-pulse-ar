import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { TwinBackground } from "./scenes/TwinBackground";
import { Part5OrbitScene, PART5_ORBIT_DURATION } from "./scenes/Part5OrbitScene";
import { Part5CommandsScene, PART5_CMD_DURATION } from "./scenes/Part5CommandsScene";
import { Part5ExecutionScene, PART5_EXEC_DURATION } from "./scenes/Part5ExecutionScene";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

export const PART5_DURATION = PART5_ORBIT_DURATION + PART5_CMD_DURATION + PART5_EXEC_DURATION;

export const Part5Video: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pulse = Math.sin((frame / durationInFrames) * Math.PI * 2) * 0.05 + 0.95;

  const titleOpacity = interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#04060d", fontFamily, color: "#e2f0ff" }}>
      <TwinBackground />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,10,0.85) 100%)",
          opacity: pulse,
          pointerEvents: "none",
        }}
      />

      <Sequence from={0} durationInFrames={PART5_ORBIT_DURATION}>
        <Part5OrbitScene />
      </Sequence>
      <Sequence from={PART5_ORBIT_DURATION} durationInFrames={PART5_CMD_DURATION}>
        <Part5CommandsScene />
      </Sequence>
      <Sequence
        from={PART5_ORBIT_DURATION + PART5_CMD_DURATION}
        durationInFrames={PART5_EXEC_DURATION}
      >
        <Part5ExecutionScene />
      </Sequence>

      <AbsoluteFill
        style={{
          opacity: titleOpacity,
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            padding: "14px 40px",
            borderRadius: 999,
            background: "rgba(4,8,20,0.7)",
            border: "1px solid rgba(34,211,238,0.4)",
            boxShadow: "0 20px 60px -10px rgba(34,211,238,0.4)",
            marginTop: -380,
          }}
        >
          <span style={{ fontSize: 13, letterSpacing: 8, color: "#7fb8ff" }}>PART 05 · </span>
          <span style={{ fontSize: 13, letterSpacing: 8, color: "#fff", fontWeight: 700 }}>
            FULL SYSTEM · COMMANDS · EXECUTION
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
