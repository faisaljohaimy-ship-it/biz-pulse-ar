import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const iconScale = interpolate(s, [0, 1], [0.6, 1]);
  const titleY = interpolate(s, [0, 1], [40, 0]);
  const sub = spring({ frame: frame - 20, fps, config: { damping: 22 } });
  const fadeOut = interpolate(frame, [70, 90], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fadeOut }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div style={{ transform: `scale(${iconScale})`, position: "relative" }}>
          <div style={{
            position: "absolute", inset: -30, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,211,238,0.35), transparent 70%)",
            filter: "blur(20px)",
          }} />
          <Img src={staticFile("images/nexus-icon.png")} style={{ width: 180, height: 180, borderRadius: 36, boxShadow: "0 30px 80px -10px rgba(34,211,238,0.5)" }} />
        </div>
        <div style={{ transform: `translateY(${titleY}px)`, opacity: s, textAlign: "center" }}>
          <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: 4, color: "#fff" }}>NEXUS AI OS</div>
          <div style={{ marginTop: 10, fontSize: 18, letterSpacing: 8, color: "#7fb8ff", opacity: sub }}>
            ENTERPRISE INTELLIGENCE · DIGITAL TWIN
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
