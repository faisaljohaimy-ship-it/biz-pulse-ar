/**
 * FinnLiveHologram — live WebGL holographic FINN presence.
 *
 * Technique: 2.5D WebGL scene built with React Three Fiber.
 *  - Character plane textured with the transparent full-body cutout and
 *    driven by a custom hologram shader (scanlines, fresnel edge glow,
 *    flicker, subtle chromatic offset, state-driven tint).
 *  - Real 3D geometry for the pedestal rings, vertical arcs, light beam,
 *    scanning sweep, and particle field around the character.
 *  - State-driven micro-motion: breathing, tilt, listening zoom, thinking
 *    scan sweep, speaking pulse; all pausable via reduced-motion and
 *    IntersectionObserver so the render loop stops off-screen.
 *
 * Fallback: static <img> only if WebGL cannot initialize.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import finnCharacter from "@/assets/finn-character.png.asset.json";

export type FinnLiveState = "idle" | "listening" | "thinking" | "speaking" | "offline";

export interface FinnLiveHologramProps {
  state?: FinnLiveState;
  ariaLabel: string;
}

// ---------- Hologram shader (character plane) ----------

const HOLO_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HOLO_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uListen;   // 0..1
  uniform float uThink;    // 0..1 — sweep progress
  uniform float uSpeak;    // 0..1 — audio-driven pulse
  uniform float uOffline;  // 0..1
  uniform vec3  uEdge;     // edge glow color
  uniform vec3  uTint;     // subtle body tint
  varying vec2 vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }

  void main(){
    // Chromatic split — very small, cyan bias
    float ca = 0.0015 + uSpeak * 0.002;
    vec4 cr = texture2D(uMap, vUv + vec2(ca, 0.0));
    vec4 cg = texture2D(uMap, vUv);
    vec4 cb = texture2D(uMap, vUv - vec2(ca, 0.0));
    vec4 col = vec4(cr.r, cg.g, cb.b, cg.a);

    if (col.a < 0.02) discard;

    // Subtle cool tint on body
    col.rgb = mix(col.rgb, col.rgb * uTint, 0.35);

    // Scanlines
    float sl = 0.5 + 0.5 * sin((vUv.y * 900.0) + uTime * 2.2);
    col.rgb *= mix(1.0, 0.86 + sl * 0.14, 0.55);

    // Thinking sweep — bright horizontal band from top to bottom
    float sweepY = 1.0 - uThink;
    float sweep = smoothstep(0.06, 0.0, abs(vUv.y - sweepY));
    col.rgb += uEdge * sweep * (0.6 * uThink);

    // Edge glow via alpha derivative
    float aL = texture2D(uMap, vUv - vec2(0.004, 0.0)).a;
    float aR = texture2D(uMap, vUv + vec2(0.004, 0.0)).a;
    float aU = texture2D(uMap, vUv - vec2(0.0, 0.004)).a;
    float aD = texture2D(uMap, vUv + vec2(0.0, 0.004)).a;
    float edge = clamp(abs(aL - aR) + abs(aU - aD), 0.0, 1.0);
    float edgeBoost = 0.9 + uListen * 0.9 + uSpeak * 0.6;
    col.rgb += uEdge * edge * edgeBoost;

    // Digital noise (very low)
    float n = hash(vUv * vec2(800.0, 1200.0) + uTime);
    col.rgb += (n - 0.5) * 0.035;

    // Occasional flicker
    float flick = step(0.995, fract(sin(uTime * 3.1) * 43.0));
    col.rgb += uEdge * flick * 0.08;

    // Offline desaturation + glitch bands
    if (uOffline > 0.01) {
      float g = smoothstep(0.48, 0.5, fract(vUv.y * 20.0 + uTime * 0.4));
      col.rgb = mix(col.rgb, vec3(dot(col.rgb, vec3(0.3,0.59,0.11))), 0.6 * uOffline);
      col.a *= mix(1.0, 0.55 + g * 0.2, uOffline);
    }

    gl_FragColor = vec4(col.rgb, col.a);
  }
`;

function CharacterPlane({ state }: { state: FinnLiveState }) {
  const texture = useLoader(THREE.TextureLoader, finnCharacter.url);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const reduce = usePrefersReducedMotion();

  // aspect from texture
  const aspect = useMemo(() => {
    const img = texture.image as HTMLImageElement | undefined;
    if (!img?.width || !img?.height) return 0.5;
    return img.width / img.height;
  }, [texture]);

  useEffect(() => {
    texture.anisotropy = 4;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
  }, [texture]);

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uTime: { value: 0 },
      uListen: { value: 0 },
      uThink: { value: 0 },
      uSpeak: { value: 0 },
      uOffline: { value: 0 },
      uEdge: { value: new THREE.Color("#67E8F9") },
      uTint: { value: new THREE.Color("#9FE7FF") },
    }),
    [texture],
  );

  // target values per state
  const targets = useMemo(
    () => ({
      idle: { listen: 0.0, think: 0.0, speak: 0.0, offline: 0.0 },
      listening: { listen: 1.0, think: 0.0, speak: 0.0, offline: 0.0 },
      thinking: { listen: 0.2, think: 1.0, speak: 0.0, offline: 0.0 },
      speaking: { listen: 0.4, think: 0.0, speak: 1.0, offline: 0.0 },
      offline: { listen: 0.0, think: 0.0, speak: 0.0, offline: 1.0 },
    }),
    [],
  );

  useFrame((_, dt) => {
    const m = matRef.current;
    if (!m) return;
    const u = m.uniforms;
    const t = targets[state];
    u.uTime.value += reduce ? dt * 0.3 : dt;

    // smooth toward targets
    const k = Math.min(1, dt * 4);
    u.uListen.value += (t.listen - u.uListen.value) * k;
    u.uOffline.value += (t.offline - u.uOffline.value) * k;
    // thinking sweep loops 0->1
    if (state === "thinking" && !reduce) {
      u.uThink.value = (u.uThink.value + dt * 0.55) % 1.0;
    } else {
      u.uThink.value += (0 - u.uThink.value) * k;
    }
    // speaking pulses
    if (state === "speaking" && !reduce) {
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(u.uTime.value * 6.2));
      u.uSpeak.value += (pulse - u.uSpeak.value) * Math.min(1, dt * 8);
    } else {
      u.uSpeak.value += (t.speak - u.uSpeak.value) * k;
    }

    // Breathing + micro tilt on the group
    const g = groupRef.current;
    if (g) {
      const time = u.uTime.value;
      const breathe = reduce ? 0 : Math.sin(time * 1.1) * 0.008;
      g.scale.y = 1 + breathe;
      const leanTarget =
        state === "listening" ? -0.05 : state === "speaking" ? Math.sin(time * 3.4) * 0.015 : 0;
      g.rotation.x += (leanTarget - g.rotation.x) * Math.min(1, dt * 3);
      const swayTarget = reduce ? 0 : Math.sin(time * 0.6) * 0.01;
      g.rotation.y += (swayTarget - g.rotation.y) * Math.min(1, dt * 2);
      g.position.y = -0.02 + (reduce ? 0 : Math.sin(time * 1.1) * 0.004);
    }
  });

  const height = 2.8;
  const width = height * aspect;

  return (
    <group ref={groupRef} position={[0, -0.02, 0]}>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[width, height, 1, 1]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={HOLO_VERT}
          fragmentShader={HOLO_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ---------- Environment: pedestal rings, arcs, beams, particles ----------

function HoloRing({
  radius,
  y,
  color,
  thickness = 0.02,
  speed = 0.4,
  dashed = false,
  opacity = 0.6,
}: {
  radius: number;
  y: number;
  color: string;
  thickness?: number;
  speed?: number;
  dashed?: boolean;
  opacity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const reduce = usePrefersReducedMotion();
  useFrame((_, dt) => {
    if (ref.current && !reduce) ref.current.rotation.z += dt * speed;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - thickness, radius, dashed ? 64 : 128]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function VerticalArc({ side = 1, color = "#22D3EE" }: { side?: number; color?: string }) {
  // Half-arc rendered as a torus segment rotated to face camera on one side
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const R = 1.9;
    for (let i = 0; i <= 48; i++) {
      const a = -Math.PI / 2 + (i / 48) * Math.PI;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.35 * side, Math.sin(a) * R * 0.55, 0));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [side]);
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 96, 0.012, 8, false), [curve]);
  return (
    <mesh geometry={geo} position={[side * 0.9, 0, -0.2]}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function LightBeam({ state }: { state: FinnLiveState }) {
  const ref = useRef<THREE.Mesh>(null);
  const reduce = usePrefersReducedMotion();
  useFrame((_, dt) => {
    if (!ref.current) return;
    const t = performance.now() * 0.001;
    const base = state === "speaking" ? 0.7 : state === "listening" ? 0.55 : 0.4;
    const pulse = reduce ? base : base + Math.sin(t * 3) * 0.08;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity += (pulse - m.opacity) * Math.min(1, dt * 3);
  });
  return (
    <mesh ref={ref} position={[0, 0.4, -0.05]}>
      <planeGeometry args={[0.9, 3.6]} />
      <meshBasicMaterial
        color="#67E8F9"
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function Pedestal({ state }: { state: FinnLiveState }) {
  const ref = useRef<THREE.Mesh>(null);
  const reduce = usePrefersReducedMotion();
  useFrame((_, dt) => {
    if (!ref.current) return;
    const t = performance.now() * 0.001;
    const target = state === "listening" ? 1.15 : state === "speaking" ? 1.08 : 1.0;
    const pulse = reduce ? target : target + Math.sin(t * 2.4) * 0.02;
    ref.current.scale.x += (pulse - ref.current.scale.x) * Math.min(1, dt * 3);
    ref.current.scale.z = ref.current.scale.x;
  });
  return (
    <group position={[0, -1.75, 0]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.9, 96]} />
        <meshBasicMaterial
          color="#22D3EE"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <HoloRing radius={1.1} y={0} color="#67E8F9" speed={0.35} opacity={0.4} />
      <HoloRing radius={1.3} y={0} color="#0891B2" speed={-0.22} thickness={0.015} opacity={0.35} />
      <HoloRing
        radius={0.75}
        y={0.02}
        color="#67E8F9"
        speed={0.6}
        thickness={0.008}
        dashed
        opacity={0.5}
      />
    </group>
  );
}

/* Rising particle field removed by design directive: the floor area under
   FINN must stay clean and static (a steady holo ring + soft glow only). */

// ---------- Utilities ----------

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 640px)");
    const on = () => setM(q.matches);
    on();
    q.addEventListener?.("change", on);
    return () => q.removeEventListener?.("change", on);
  }, []);
  return m;
}

// ---------- Scene ----------

function Scene({ state }: { state: FinnLiveState; mobile: boolean }) {
  return (
    <>
      {/* LightBeam removed — was leaving a translucent glass column behind FINN */}
      <Suspense fallback={null}>
        <CharacterPlane state={state} />
      </Suspense>
      <Pedestal state={state} />
    </>
  );
}

// ---------- Public component ----------

function InnerLive({ state, ariaLabel }: { state: FinnLiveState; ariaLabel: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const mobile = useIsMobile();
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setPointer({ x: Math.max(-0.5, Math.min(0.5, x)), y: Math.max(-0.5, Math.min(0.5, y)) });
  };
  const onLeave = () => setPointer({ x: 0, y: 0 });

  if (failed) {
    return <StaticFallback ariaLabel={ariaLabel} />;
  }

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={ariaLabel}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: "auto" }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <Canvas
        dpr={mobile ? [1, 1.5] : [1, 2]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 0, 5.6], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        onError={() => setFailed(true)}
        style={{ touchAction: "pan-y" }}
      >
        <group
          rotation={[pointer.y * 0.035, -pointer.x * 0.06, 0]}
          position={[-pointer.x * 0.05, -pointer.y * 0.03, 0]}
        >
          <Scene state={state} mobile={mobile} />
        </group>
      </Canvas>
    </div>
  );
}

function StaticFallback({ ariaLabel }: { ariaLabel: string }) {
  return (
    <img
      src={finnCharacter.url}
      alt={ariaLabel}
      className="pointer-events-none absolute inset-0 h-full w-full object-contain object-bottom"
      draggable={false}
    />
  );
}

export function FinnLiveHologram(props: FinnLiveHologramProps) {
  const state = props.state ?? "idle";
  return (
    <ClientOnly fallback={<StaticFallback ariaLabel={props.ariaLabel} />}>
      <InnerLive state={state} ariaLabel={props.ariaLabel} />
    </ClientOnly>
  );
}

export default FinnLiveHologram;
