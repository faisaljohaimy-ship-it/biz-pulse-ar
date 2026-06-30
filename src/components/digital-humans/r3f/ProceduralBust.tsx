/**
 * Procedural 3D bust — stylised executive head/shoulders rendered with
 * primitive Three.js geometry. Used as the always-available fallback
 * when no GLTF/Ready Player Me avatar URL is configured.
 *
 * The bust is intentionally restrained: stylised but professional. Real
 * production deployments swap this for a configured GLTF (Ready Player
 * Me, custom scan) via `VITE_ARIA_AVATAR_URL`. The animation contract
 * (breath, blink, jaw viseme, head tracking) is identical so the swap
 * is mechanical.
 */
import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import type { DigitalHumanSpec } from "@/lib/digital-humans/registry";
import type { AlivePreset } from "@/lib/digital-humans/alive-states";

interface Props {
  spec: DigitalHumanSpec;
  preset: AlivePreset;
  /** 0..1 mouth amplitude (audio-driven viseme). */
  mouthAmplitude: number;
  /** Normalised pointer position -1..1 used for head tracking. */
  pointer: { x: number; y: number };
}

export function ProceduralBust({ spec, preset, mouthAmplitude, pointer }: Props) {
  const group  = useRef<THREE.Group>(null);
  const head   = useRef<THREE.Group>(null);
  const chest  = useRef<THREE.Mesh>(null);
  const jaw    = useRef<THREE.Mesh>(null);
  const lidL   = useRef<THREE.Mesh>(null);
  const lidR   = useRef<THREE.Mesh>(null);
  const blinkT = useRef({ closing: false, t: 0, next: 2.5 });

  const skin = useMemo(() => new THREE.MeshStandardMaterial({
    color: spec.palette.base, roughness: 0.42, metalness: 0.04,
    // faux subsurface — accent tint glows softly through skin
    emissive: new THREE.Color(spec.palette.accent),
    emissiveIntensity: 0.06,
  }), [spec.palette.base, spec.palette.accent]);
  const suit = useMemo(() => new THREE.MeshStandardMaterial({
    color: spec.palette.suit, roughness: 0.55, metalness: 0.35,
  }), [spec.palette.suit]);
  const accent = useMemo(() => new THREE.MeshStandardMaterial({
    color: spec.palette.accent, roughness: 0.25, metalness: 0.5,
    emissive: spec.palette.accent, emissiveIntensity: 0.9,
  }), [spec.palette.accent]);
  // Bright additive seam material — for the glowing executive collar seam
  const seamMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: spec.palette.accent, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }), [spec.palette.accent]);
  const hair = useMemo(() => new THREE.MeshStandardMaterial({
    color: spec.features.hairColor, roughness: 0.78, metalness: 0.08,
  }), [spec.features.hairColor]);
  const lidMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: spec.palette.base, roughness: 0.55,
  }), [spec.palette.base]);
  // Crystal iris — emissive ring around the pupil
  const irisRingMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: spec.palette.accent, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }), [spec.palette.accent]);

  useFrame((_, dt) => {
    const t = performance.now() / 1000;
    const speakingBoost = THREE.MathUtils.clamp(mouthAmplitude * 3, 0, 1);

    // Breathing — chest scale + tiny vertical body bob
    if (chest.current) {
      const s = 1 + Math.sin(t * preset.breathHz * Math.PI * 2) * 0.025;
      chest.current.scale.set(s, s, s);
      // Subtle shoulder lift while speaking — executive presence cue
      const lift = 0.18 + speakingBoost * 0.015;
      chest.current.position.y = THREE.MathUtils.damp(chest.current.position.y, lift, 6, dt);
    }
    if (group.current) {
      group.current.position.y = Math.sin(t * preset.breathHz * Math.PI * 2) * 0.015;
      // Body weight shifting — slow lateral sway, calm and executive
      group.current.position.x = Math.sin(t * 0.18) * 0.025;
      const sway = THREE.MathUtils.degToRad(preset.swayDeg);
      group.current.rotation.z = Math.sin(t * 0.4) * sway * 0.3;
    }

    // Head tracking — easing toward pointer/gaze; adds a tiny nod while speaking
    if (head.current) {
      const targetY = THREE.MathUtils.clamp(pointer.x, -1, 1) * 0.35;
      const baseX = THREE.MathUtils.clamp(-pointer.y, -1, 1) * 0.2;
      const nod = speakingBoost > 0.05 ? Math.sin(t * 2.4) * 0.04 : 0;
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, targetY, 4, dt);
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, baseX + nod, 4, dt);
    }

    // Jaw viseme — driven by audio amplitude with smoothing
    if (jaw.current) {
      const target = THREE.MathUtils.clamp(mouthAmplitude, 0, 1) * 0.18;
      jaw.current.position.y = THREE.MathUtils.damp(jaw.current.position.y, -0.05 - target, 18, dt);
      const sx = 1 + target * 0.6;
      jaw.current.scale.x = THREE.MathUtils.damp(jaw.current.scale.x, sx, 14, dt);
    }

    // Blink loop
    const b = blinkT.current;
    b.next -= dt;
    if (b.next <= 0 && !b.closing) { b.closing = true; b.t = 0; }
    if (b.closing) {
      b.t += dt;
      const phase = b.t / 0.12;
      const closeAmount = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      const sy = Math.max(0.05, 1 - closeAmount);
      if (lidL.current) lidL.current.scale.y = sy;
      if (lidR.current) lidR.current.scale.y = sy;
      if (b.t > 0.12) {
        b.closing = false;
        b.next = (2.0 + Math.random() * 3.0) / Math.max(0.5, preset.blinkBoost);
      }
    }
  });

  return (
    <group ref={group} position={[0, -0.55, 0]}>
      {/* Shoulders / chest */}
      <mesh ref={chest} position={[0, 0.18, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.55, 0.45, 6, 14]} />
        <primitive object={suit} attach="material" />
      </mesh>
      {/* Neckline / accent */}
      <mesh position={[0, 0.55, 0.18]}>
        <torusGeometry args={[0.13, 0.025, 8, 24]} />
        <primitive object={accent} attach="material" />
      </mesh>
      {/* Glowing executive collar seam — additive, no shadow */}
      <mesh position={[0, 0.42, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.008, 8, 64, Math.PI]} />
        <primitive object={seamMat} attach="material" />
      </mesh>
      {/* Lapel light line */}
      <mesh position={[0, 0.32, 0.34]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.32, 0.006, 0.004]} />
        <primitive object={seamMat} attach="material" />
      </mesh>

      {/* Head */}
      <group ref={head} position={[0, 0.95, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.42, 48, 48]} />
          <primitive object={skin} attach="material" />
        </mesh>

        {/* Hair / hijab cap */}
        {spec.features.hasHijab ? (
          <group>
            <mesh position={[0, 0.05, -0.02]}>
              <sphereGeometry args={[0.48, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
              <primitive object={hair} attach="material" />
            </mesh>
            {/* Forehead accent trim — subtle executive band */}
            <mesh position={[0, 0.32, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.4, 0.012, 8, 32, Math.PI * 1.1]} />
              <primitive object={accent} attach="material" />
            </mesh>
            {/* Drape over shoulders */}
            <mesh position={[0, -0.35, -0.08]} rotation={[0.1, 0, 0]}>
              <sphereGeometry args={[0.55, 24, 24, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.35]} />
              <primitive object={hair} attach="material" />
            </mesh>
          </group>
        ) : (
          <mesh position={[0, 0.12, -0.02]}>
            <sphereGeometry args={[0.44, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <primitive object={hair} attach="material" />
          </mesh>
        )}

        {/* Eyes */}
        <mesh position={[-0.13, 0.04, 0.36]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        <mesh position={[0.13, 0.04, 0.36]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        {/* Irises (accent color for personality cue) */}
        <mesh position={[-0.13, 0.04, 0.405]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshStandardMaterial color={spec.palette.accent} emissive={spec.palette.accent} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0.13, 0.04, 0.405]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshStandardMaterial color={spec.palette.accent} emissive={spec.palette.accent} emissiveIntensity={0.4} />
        </mesh>
        {/* Eyelids (close on blink) */}
        <mesh ref={lidL} position={[-0.13, 0.04, 0.37]}>
          <sphereGeometry args={[0.062, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <primitive object={lidMat} attach="material" />
        </mesh>
        <mesh ref={lidR} position={[0.13, 0.04, 0.37]}>
          <sphereGeometry args={[0.062, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <primitive object={lidMat} attach="material" />
        </mesh>

        {/* Glasses */}
        {spec.features.hasGlasses && (
          <group position={[0, 0.04, 0.4]}>
            <mesh position={[-0.13, 0, 0]}>
              <torusGeometry args={[0.08, 0.008, 8, 24]} />
              <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0.13, 0, 0]}>
              <torusGeometry args={[0.08, 0.008, 8, 24]} />
              <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
            </mesh>
          </group>
        )}

        {/* Beard */}
        {spec.features.hasBeard && (
          <mesh position={[0, -0.18, 0.28]}>
            <sphereGeometry args={[0.28, 24, 24, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4]} />
            <primitive object={hair} attach="material" />
          </mesh>
        )}

        {/* Mouth / jaw */}
        <mesh ref={jaw} position={[0, -0.16, 0.36]}>
          <boxGeometry args={[0.18, 0.04, 0.05]} />
          <meshStandardMaterial color="#4b1d24" roughness={0.4} />
        </mesh>

        {/* Headset */}
        {spec.features.hasHeadset && (
          <group>
            <mesh position={[0, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.36, 0.018, 8, 24, Math.PI]} />
              <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[-0.42, 0.05, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0.42, 0.05, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}
