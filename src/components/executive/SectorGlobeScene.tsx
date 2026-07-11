/**
 * SectorGlobeScene — the Three.js globe used by the corner sector widget
 * (default export, dynamically imported so the heavy 3D bundle loads ONLY on
 * demand). A slowly-drifting navy globe with the four Saudi regions as glowing
 * markers; the ACTIVE sector is pinned: emphasised with a larger pulsing halo
 * and ring, and the globe eases to bring that marker to the front.
 *
 * `animate=false` (prefers-reduced-motion) freezes the cinematic drift AND
 * switches the render loop to on-demand, but the globe still orients to face
 * the active sector so the pin stays meaningful.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { REGION_MARKERS } from "./region-markers";

const EMERALD = "#34D399";
const CYAN = "#3AE8FF";
const R = 1;

/** lat/lng (degrees) → point on a sphere of radius `r`. */
function toVec3(lat: number, lng: number, r = R): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

/** Group-rotation.y that brings a marker at longitude `lng` to the front. */
function facingY(lng: number): number {
  return -((lng + 180) * Math.PI) / 180 + Math.PI;
}

function Marker({ pos, active }: { pos: THREE.Vector3; active: boolean }) {
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!active || !haloRef.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.18;
    haloRef.current.scale.setScalar(s);
  });
  const color = active ? CYAN : EMERALD;
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[active ? 0.042 : 0.026, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[active ? 0.1 : 0.05, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.32 : 0.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Arc({ a, b }: { a: THREE.Vector3; b: THREE.Vector3 }) {
  const points = useMemo(() => {
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(1.28);
    return new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(28);
  }, [a, b]);
  return <Line points={points} color={EMERALD} lineWidth={1} transparent opacity={0.36} />;
}

function GlobeGroup({ animate, activeIndex }: { animate: boolean; activeIndex: number }) {
  const ref = useRef<THREE.Group>(null);
  const markers = useMemo(() => REGION_MARKERS.map((m) => toVec3(m.lat, m.lng, 1.02)), []);
  const arcs = useMemo(() => {
    const out: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i < markers.length; i++)
      for (let j = i + 1; j < markers.length; j++) out.push([markers[i], markers[j]]);
    return out;
  }, [markers]);

  // Base orientation faces the active sector; a gentle sway keeps it cinematic.
  const baseY = useMemo(() => {
    const m = REGION_MARKERS[activeIndex] ?? REGION_MARKERS[0];
    return facingY(m.lng);
  }, [activeIndex]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const sway = animate ? Math.sin(state.clock.elapsedTime * 0.16) * 0.28 : 0;
    const target = baseY + sway;
    // Ease toward the (swaying) target so switching sector glides into view.
    const k = Math.min(1, delta * 2.2);
    ref.current.rotation.y += (target - ref.current.rotation.y) * k;
  });

  return (
    <group ref={ref} rotation={[0.35, baseY, 0]}>
      {/* Atmospheric halo */}
      <mesh>
        <sphereGeometry args={[R * 1.14, 32, 32]} />
        <meshBasicMaterial
          color={EMERALD}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
      {/* Solid navy sphere */}
      <mesh>
        <sphereGeometry args={[R, 48, 48]} />
        <meshStandardMaterial color="#071a2e" roughness={0.85} metalness={0.15} />
      </mesh>
      {/* Wireframe overlay */}
      <mesh>
        <sphereGeometry args={[R * 1.001, 24, 18]} />
        <meshBasicMaterial color="#155e75" wireframe transparent opacity={0.3} />
      </mesh>
      {arcs.map(([a, b], i) => (
        <Arc key={i} a={a} b={b} />
      ))}
      {markers.map((pos, i) => (
        <Marker key={i} pos={pos} active={i === activeIndex} />
      ))}
    </group>
  );
}

export default function SectorGlobeScene({
  animate,
  activeIndex,
}: {
  animate: boolean;
  activeIndex: number;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 3.1], fov: 42 }}
      frameloop={animate ? "always" : "demand"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.65} />
      <pointLight position={[3, 2, 4]} intensity={1.3} color={CYAN} />
      <pointLight position={[-3, -1, -2]} intensity={0.5} color={EMERALD} />
      <GlobeGroup animate={animate} activeIndex={activeIndex} />
    </Canvas>
  );
}
