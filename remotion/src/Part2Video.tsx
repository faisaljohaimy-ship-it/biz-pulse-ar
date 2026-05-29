import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { TwinBackground } from "./scenes/TwinBackground";
import { DashboardOrbitScene, ORBIT_DURATION } from "./scenes/DashboardOrbitScene";
import { CommandPaletteScene, PALETTE_DURATION } from "./scenes/CommandPaletteScene";
import { Part2Outro, PART2_OUTRO_DURATION } from "./scenes/Part2Outro";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

export const PART2_DURATION = ORBIT_DURATION + PALETTE_DURATION + PART2_OUTRO_DURATION;

export const Part2Video: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pulse = Math.sin((frame / durationInFrames) * Math.PI * 2) * 0.05 + 0.95;

  // Intro title overlay (3s)
  const titleOpacity = interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#04060d", fontFamily, color: "#e2f0ff" }}>
      <TwinBackground />
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,10,0.85) 100%)",
        opacity: pulse, pointerEvents: "none",
      }} />

      <Sequence from={0} durationInFrames={ORBIT_DURATION}>
        <DashboardOrbitScene />
      </Sequence>
      <Sequence from={ORBIT_DURATION} durationInFrames={PALETTE_DURATION}>
        <CommandPaletteScene />
      </Sequence>
      <Sequence from={ORBIT_DURATION + PALETTE_DURATION} durationInFrames={PART2_OUTRO_DURATION}>
        <Part2Outro />
      </Sequence>

      {/* "PART 02" title overlay */}
      <AbsoluteFill style={{ opacity: titleOpacity, alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{
          padding: "14px 40px", borderRadius: 999,
          background: "rgba(4,8,20,0.7)", border: "1px solid rgba(34,211,238,0.4)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 20px 60px -10px rgba(34,211,238,0.4)",
          marginTop: -380,
        }}>
          <span style={{ fontSize: 13, letterSpacing: 8, color: "#7fb8ff" }}>PART 02 · </span>
          <span style={{ fontSize: 13, letterSpacing: 8, color: "#fff", fontWeight: 700 }}>NAVIGATING THE TWIN</span>
        </div>
      </AbsoluteFill>

      {/* Persistent brand badge */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ position: "absolute", bottom: 40, right: 50, display: "flex", alignItems: "center", gap: 14, opacity: 0.85 }}>
          <Img src={staticFile("images/nexus-icon.png")} style={{ width: 44, height: 44, borderRadius: 10 }} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>NEXUS</div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#7fb8ff" }}>AI OPERATING SYSTEM</div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
