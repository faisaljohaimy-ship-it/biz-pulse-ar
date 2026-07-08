/**
 * AriaScene — R3F canvas hosting the Executive Digital Human. Provider-
 * abstracted: renders any registered DigitalHumanSpec (ARIA + 10 specialists)
 * using the procedural bust, with HDR-style lighting and a soft halo that
 * tracks the live AliveState.
 *
 * SSR-safe: only ever rendered inside AriaDock, which mounts client-side.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { ProceduralBust } from "./ProceduralBust";
import { HologramShell, NeuralParticles, ScanRing } from "./HologramFX";
import type { DigitalHumanSpec, DigitalHumanState } from "@/lib/digital-humans/registry";
import { ALIVE_PRESETS, toAliveState, type AliveState } from "@/lib/digital-humans/alive-states";

interface Props {
  spec: DigitalHumanSpec;
  state: DigitalHumanState;
  mouthAmplitude?: number;
  size: number;
  severity?: "low" | "medium" | "high" | "critical" | null;
  /** When set, ARIA gazes toward this normalised target (-1..1) instead of the pointer. */
  gaze?: { x: number; y: number } | null;
}

function HaloRing({ color, intensity }: { color: string; intensity: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.15 + intensity * 0.55;
  }, [intensity]);
  return (
    <mesh ref={ref} position={[0, -0.05, -0.6]}>
      <ringGeometry args={[0.85, 1.05, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function AriaScene({ spec, state, mouthAmplitude = 0, size, severity, gaze }: Props) {
  const alive: AliveState = useMemo(() => toAliveState(state, severity), [state, severity]);
  const preset = ALIVE_PRESETS[alive];
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (gaze) return; // gaze override takes priority over pointer
    const onMove = (e: PointerEvent) => {
      setPointer({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [gaze]);

  const effectivePointer = gaze ?? pointer;

  return (
    <div
      style={{ width: size, height: size }}
      className="relative rounded-full overflow-hidden shrink-0"
    >
      {/* Ambient glow shell — CSS, cheap, no extra draw call */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 ${24 + preset.ringIntensity * 36}px ${spec.palette.glow}`,
          background: `radial-gradient(circle at 50% 35%, ${spec.palette.glow} 0%, rgba(6,26,46,0) 70%)`,
        }}
      />
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.05, preset.cameraZ], fov: 28 }}
        frameloop="always"
      >
        <color attach="background" args={["#04111f"]} />
        <fog attach="fog" args={["#04111f", 3, 6]} />
        {/* 3-point executive lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 3, 3]} intensity={1.2} color="#ffffff" castShadow />
        <directionalLight position={[-3, 1, 1]} intensity={0.45} color={spec.palette.accent} />
        <pointLight position={[0, -2, 2]} intensity={0.3} color={spec.palette.accent} />

        <Suspense fallback={null}>
          <Environment preset="city" environmentIntensity={0.55} />
        </Suspense>

        <ProceduralBust
          spec={spec}
          preset={preset}
          mouthAmplitude={mouthAmplitude}
          pointer={effectivePointer}
        />

        {/* Holographic crystal shell — Fresnel rim glow over the head */}
        <HologramShell color={spec.palette.accent} intensity={0.6 + preset.ringIntensity * 0.8} />

        {/* GPU neural particles — soft blue motes orbiting the bust */}
        <NeuralParticles
          color={spec.palette.accent}
          count={200}
          radius={1.0}
          speed={0.6 + preset.ringIntensity}
        />

        {/* Pulsing scan ring around the head — louder when listening / speaking */}
        <ScanRing color={spec.palette.accent} intensity={preset.ringIntensity} />

        <HaloRing color={spec.palette.accent} intensity={preset.ringIntensity} />

        <ContactShadows
          position={[0, -0.85, 0]}
          opacity={0.5}
          scale={3}
          blur={2.5}
          far={1.2}
          color="#000000"
        />

        {/* Post-processing: bloom + film tone mapping + soft vignette */}
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom intensity={0.85} luminanceThreshold={0.18} luminanceSmoothing={0.6} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette
            eskil={false}
            offset={0.25}
            darkness={0.7}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
