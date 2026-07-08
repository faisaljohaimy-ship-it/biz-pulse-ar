import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
  Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { TwinBackground } from "./scenes/TwinBackground";
import { IntroScene } from "./scenes/IntroScene";
import { NavScene } from "./scenes/NavScene";
import { OutroScene } from "./scenes/OutroScene";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

export const FPS = 30;

// Modules to navigate through
export const MODULES = [
  { key: "cockpit", label: "Executive Cockpit" },
  { key: "intelligence", label: "AI Intelligence" },
  { key: "decisions", label: "Board Decisions" },
  { key: "risk", label: "Risk & Resilience" },
  { key: "execution", label: "Execution Engine" },
  { key: "boardroom", label: "Boardroom Mode" },
];

const INTRO = 90; // 3s
const PER_MODULE = 75; // 2.5s each
const OUTRO = 90; // 3s
export const DURATION = INTRO + PER_MODULE * MODULES.length + OUTRO;

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Subtle global vignette pulse
  const pulse = Math.sin((frame / durationInFrames) * Math.PI * 2) * 0.05 + 0.95;
  return (
    <AbsoluteFill style={{ background: "#04060d", fontFamily, color: "#e2f0ff" }}>
      <TwinBackground />
      {/* Vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,10,0.85) 100%)",
          opacity: pulse,
          pointerEvents: "none",
        }}
      />

      <Sequence from={0} durationInFrames={INTRO}>
        <IntroScene />
      </Sequence>

      {MODULES.map((m, i) => (
        <Sequence key={m.key} from={INTRO + i * PER_MODULE} durationInFrames={PER_MODULE}>
          <NavScene index={i} total={MODULES.length} label={m.label} moduleKey={m.key} />
        </Sequence>
      ))}

      <Sequence from={INTRO + PER_MODULE * MODULES.length} durationInFrames={OUTRO}>
        <OutroScene />
      </Sequence>

      {/* Persistent brand badge bottom-right */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 50,
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: 0.85,
          }}
        >
          <Img
            src={staticFile("images/nexus-icon.png")}
            style={{ width: 44, height: 44, borderRadius: 10 }}
          />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>NEXUS</div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#7fb8ff" }}>
              AI OPERATING SYSTEM
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export { interpolate };
