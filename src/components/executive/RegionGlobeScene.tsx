/**
 * RegionGlobeScene — the Three.js globe (default export, dynamically imported
 * by RegionGlobe so the heavy 3D bundle loads ONLY on demand and never slows
 * app startup). A slowly-rotating navy globe with the four Saudi regions as
 * glowing emerald markers joined by faint connecting arcs.
 *
 * `animate=false` (prefers-reduced-motion) freezes rotation AND switches the
 * render loop to on-demand so no frames are drawn while idle — cheap and calm.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { REGION_MARKERS } from "./region-markers";

const EMERALD = "#34D399";
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

function Marker({ pos }: { pos: THREE.Vector3 }) {
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.028, 16, 16]} />
        <meshBasicMaterial color={EMERALD} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshBasicMaterial color={EMERALD} transparent opacity={0.22} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Arc({ a, b }: { a: THREE.Vector3; b: THREE.Vector3 }) {
  const points = useMemo(() => {
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(1.28);
    return new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(28);
  }, [a, b]);
  return <Line points={points} color={EMERALD} lineWidth={1} transparent opacity={0.38} />;
}

function GlobeGroup({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.Group>(null);
  // Face Saudi Arabia (~45°E) toward the camera on first paint.
  const initialY = useMemo(() => -((45 + 180) * Math.PI) / 180 + Math.PI, []);
  const markers = useMemo(() => REGION_MARKERS.map((m) => toVec3(m.lat, m.lng, 1.02)), []);
  const arcs = useMemo(() => {
    const out: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i < markers.length; i++)
      for (let j = i + 1; j < markers.length; j++) out.push([markers[i], markers[j]]);
    return out;
  }, [markers]);

  useFrame((_, delta) => {
    if (animate && ref.current) ref.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={ref} rotation={[0.35, initialY, 0]}>
      {/* Solid navy sphere */}
      <mesh>
        <sphereGeometry args={[R, 48, 48]} />
        <meshStandardMaterial color="#071a2e" roughness={0.85} metalness={0.15} />
      </mesh>
      {/* Latitude/longitude wireframe overlay */}
      <mesh>
        <sphereGeometry args={[R * 1.001, 24, 18]} />
        <meshBasicMaterial color="#155e75" wireframe transparent opacity={0.3} />
      </mesh>
      {arcs.map(([a, b], i) => (
        <Arc key={i} a={a} b={b} />
      ))}
      {markers.map((pos, i) => (
        <Marker key={i} pos={pos} />
      ))}
    </group>
  );
}

export default function RegionGlobeScene({ animate }: { animate: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 3.1], fov: 42 }}
      frameloop={animate ? "always" : "demand"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.65} />
      <pointLight position={[3, 2, 4]} intensity={1.3} color="#3AE8FF" />
      <pointLight position={[-3, -1, -2]} intensity={0.5} color={EMERALD} />
      <GlobeGroup animate={animate} />
    </Canvas>
  );
}
