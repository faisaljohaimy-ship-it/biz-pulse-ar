import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";

export const PART2_OUTRO_DURATION = 100;

export const Part2Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const fade = interpolate(frame, [80, 100], [1, 0], { extrapolateRight: "clamp" });
  const lineW = interpolate(s, [0, 1], [0, 420]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fade }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})` }}>
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", inset: -40, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,211,238,0.4), transparent 70%)",
            filter: "blur(30px)",
          }} />
          <Img src={staticFile("images/nexus-icon.png")} style={{ width: 120, height: 120, borderRadius: 28 }} />
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", letterSpacing: 4 }}>NAVIGATE THE TWIN</div>
        <div style={{ width: lineW, height: 2, background: "linear-gradient(90deg, transparent, #22d3ee, transparent)" }} />
        <div style={{ fontSize: 16, letterSpacing: 8, color: "#7fb8ff" }}>3D STAGE · COMMAND PALETTE · ZERO LATENCY</div>
      </div>
    </AbsoluteFill>
  );
};
