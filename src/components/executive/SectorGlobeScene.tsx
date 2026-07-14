/**
 * SectorGlobeScene — transparent glass 3D globe for the corner region control.
 *
 * The sphere uses physical transmission rather than an opaque Earth texture.
 * Its atmosphere, grid, arcs and active marker inherit the selected region's
 * canonical colour and pulse gently while the globe eases toward that region.
 */
import { Line } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { REGION_ACCENT_HEX } from "@/lib/regions";
import { REGION_MARKERS } from "./region-markers";

const RADIUS = 1;

function toVector3(lat: number, lng: number, radius = RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function facingRotation(lng: number): number {
  return -((lng + 180) * Math.PI) / 180 + Math.PI;
}

function RegionMarker({
  position,
  active,
  color,
}: {
  readonly position: THREE.Vector3;
  readonly active: boolean;
  readonly color: string;
}) {
  const haloRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!active) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 3.1) * 0.2;
    haloRef.current?.scale.setScalar(pulse);
    if (ringRef.current) {
      ringRef.current.scale.setScalar(0.88 + ((state.clock.elapsedTime * 0.34) % 1) * 0.8);
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.44 * (1 - ((state.clock.elapsedTime * 0.34) % 1));
    }
  });

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[active ? 0.045 : 0.027, 20, 20]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[active ? 0.115 : 0.055, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.28 : 0.13}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {active && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.075, 0.095, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.42}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

function ConnectionArc({
  start,
  end,
  color,
}: {
  readonly start: THREE.Vector3;
  readonly end: THREE.Vector3;
  readonly color: string;
}) {
  const points = useMemo(() => {
    const middle = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(1.29);
    return new THREE.QuadraticBezierCurve3(start, middle, end).getPoints(30);
  }, [start, end]);

  return <Line points={points} color={color} lineWidth={1} transparent opacity={0.3} />;
}

function GlassGlobe({
  animate,
  activeIndex,
  activeColor,
}: {
  readonly animate: boolean;
  readonly activeIndex: number;
  readonly activeColor: string;
}) {
  const globeRef = useRef<THREE.Group>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);

  const markers = useMemo(
    () => REGION_MARKERS.map((marker) => toVector3(marker.lat, marker.lng, 1.025)),
    [],
  );
  const arcs = useMemo(() => {
    const connections: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let first = 0; first < markers.length; first += 1) {
      for (let second = first + 1; second < markers.length; second += 1) {
        connections.push([markers[first], markers[second]]);
      }
    }
    return connections;
  }, [markers]);

  const baseRotation = useMemo(() => {
    const marker = REGION_MARKERS[activeIndex] ?? REGION_MARKERS[0];
    return facingRotation(marker.lng);
  }, [activeIndex]);

  useFrame((state, delta) => {
    if (!globeRef.current) return;
    const drift = animate ? Math.sin(state.clock.elapsedTime * 0.17) * 0.24 : 0;
    const target = baseRotation + drift;
    const easing = Math.min(1, delta * 2.25);
    globeRef.current.rotation.y += (target - globeRef.current.rotation.y) * easing;

    if (animate && orbitRef.current) {
      orbitRef.current.rotation.z += delta * 0.11;
      orbitRef.current.rotation.y += delta * 0.045;
    }
    if (atmosphereRef.current) {
      const scale = animate ? 1 + Math.sin(state.clock.elapsedTime * 1.8) * 0.025 : 1;
      atmosphereRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={globeRef} rotation={[0.3, baseRotation, -0.04]}>
      {/* Living atmospheric shell. */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[RADIUS * 1.15, 48, 48]} />
        <meshBasicMaterial
          color={activeColor}
          transparent
          opacity={0.075}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Transparent physical glass sphere. */}
      <mesh renderOrder={1}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshPhysicalMaterial
          color="#071827"
          emissive={activeColor}
          emissiveIntensity={0.07}
          transparent
          opacity={0.2}
          transmission={0.88}
          thickness={0.55}
          ior={1.35}
          roughness={0.08}
          metalness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Inner refraction tint and dual holographic grids. */}
      <mesh>
        <sphereGeometry args={[RADIUS * 0.97, 40, 40]} />
        <meshBasicMaterial
          color={activeColor}
          transparent
          opacity={0.028}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh renderOrder={2}>
        <sphereGeometry args={[RADIUS * 1.006, 28, 20]} />
        <meshBasicMaterial
          color={activeColor}
          wireframe
          transparent
          opacity={0.24}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh renderOrder={2} rotation={[0, Math.PI / 12, Math.PI / 10]}>
        <sphereGeometry args={[RADIUS * 1.025, 16, 12]} />
        <meshBasicMaterial
          color="#FFFFFF"
          wireframe
          transparent
          opacity={0.045}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Two thin, independently drifting orbital rings. */}
      <group ref={orbitRef} rotation={[0.7, 0.2, -0.38]}>
        <mesh>
          <torusGeometry args={[1.22, 0.006, 8, 96]} />
          <meshBasicMaterial
            color={activeColor}
            transparent
            opacity={0.48}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2.4, 0, Math.PI / 5]}>
          <torusGeometry args={[1.29, 0.004, 8, 96]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.2}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {arcs.map(([start, end], index) => (
        <ConnectionArc key={index} start={start} end={end} color={activeColor} />
      ))}
      {markers.map((position, index) => {
        const marker = REGION_MARKERS[index];
        return (
          <RegionMarker
            key={marker.id}
            position={position}
            active={index === activeIndex}
            color={REGION_ACCENT_HEX[marker.id]}
          />
        );
      })}
    </group>
  );
}

export default function SectorGlobeScene({
  animate,
  activeIndex,
  activeColor,
}: {
  readonly animate: boolean;
  readonly activeIndex: number;
  readonly activeColor: string;
}) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 3.25], fov: 41 }}
      frameloop={animate ? "always" : "demand"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <pointLight position={[3.2, 2.4, 4]} intensity={1.55} color="#FFFFFF" />
      <pointLight position={[-3, -1.3, -2]} intensity={0.9} color={activeColor} />
      <GlassGlobe animate={animate} activeIndex={activeIndex} activeColor={activeColor} />
    </Canvas>
  );
}
