import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 110 } });
  const scale = interpolate(s, [0, 1], [0.7, 1]);
  const lineW = interpolate(s, [0, 1], [0, 360]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, transform: `scale(${scale})` }}>
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", inset: -40, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,211,238,0.4), transparent 70%)",
            filter: "blur(30px)",
          }} />
          <Img src={staticFile("images/nexus-icon.png")} style={{ width: 140, height: 140, borderRadius: 32 }} />
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", letterSpacing: 4 }}>ONE SYSTEM</div>
        <div style={{ width: lineW, height: 2, background: "linear-gradient(90deg, transparent, #22d3ee, transparent)" }} />
        <div style={{ fontSize: 18, letterSpacing: 8, color: "#7fb8ff" }}>SIX MODULES · INFINITE CLARITY</div>
      </div>
    </AbsoluteFill>
  );
};
