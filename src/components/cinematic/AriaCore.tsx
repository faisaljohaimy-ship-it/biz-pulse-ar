import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Core() {
  const coreRef = useRef<THREE.Mesh>(null);
  const shellARef = useRef<THREE.Mesh>(null);
  const shellBRef = useRef<THREE.Mesh>(null);
  const scanRef = useRef<THREE.Mesh>(null);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (coreRef.current) {
      const p = 1 + Math.sin(t * 1.8) * 0.05;
      coreRef.current.scale.setScalar(p);
      (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.4 + Math.sin(t * 2.4) * 0.5;
    }
    if (shellARef.current) {
      shellARef.current.rotation.x = t * 0.25;
      shellARef.current.rotation.y = t * 0.35;
    }
    if (shellBRef.current) {
      shellBRef.current.rotation.x = -t * 0.18;
      shellBRef.current.rotation.z = t * 0.22;
    }
    if (scanRef.current) {
      scanRef.current.rotation.x = Math.PI / 2;
      scanRef.current.position.y = Math.sin(t * 0.7) * 1.8;
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.05, 4]} />
        <meshStandardMaterial
          color="#7a5cff"
          emissive="#a78bfa"
          emissiveIntensity={1.6}
          roughness={0.15}
          metalness={0.7}
        />
      </mesh>
      <mesh ref={shellARef}>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshBasicMaterial color="#a78bfa" wireframe transparent opacity={0.55} />
      </mesh>
      <mesh ref={shellBRef}>
        <icosahedronGeometry args={[2.05, 1]} />
        <meshBasicMaterial color="#f5b454" wireframe transparent opacity={0.28} />
      </mesh>
      {/* horizontal scan disc */}
      <mesh ref={scanRef}>
        <ringGeometry args={[1.7, 2.2, 96]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      {/* glow halo */}
      <mesh>
        <sphereGeometry args={[1.25, 32, 32]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.14} />
      </mesh>
    </group>
  );
}

/** Volumetric light cones — soft additive beams piercing through the core. */
function Volumetric() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const cones = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        rot: (i / 6) * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 0.4,
        color: i % 2 === 0 ? "#a78bfa" : "#f5b454",
      })),
    [],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.rotation.z = cones[i].rot + t * 0.08;
      const breath = 0.6 + Math.sin(t * 1.4 + i) * 0.25;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.08 + breath * 0.1;
    });
  });
  return (
    <group>
      {cones.map((c, i) => (
        <mesh
          key={i}
          ref={(el) => (refs.current[i] = el)}
          rotation={[c.tilt, 0, c.rot]}
        >
          <coneGeometry args={[1.4, 7, 32, 1, true]} />
          <meshBasicMaterial
            color={c.color}
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Particle streams flowing into the core — data converging into ARIA. */
function DataStreams() {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 800;
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = 3 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      speeds[i] = 0.004 + Math.random() * 0.012;
    }
    return { positions, speeds };
  }, []);
  useFrame(() => {
    if (!ref.current) return;
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const ix = i * 3;
      const x = arr[ix];
      const y = arr[ix + 1];
      const z = arr[ix + 2];
      const d = Math.hypot(x, y, z);
      if (d < 1.2) {
        // respawn far out
        const r = 5 + Math.random() * 2.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        arr[ix] = r * Math.sin(phi) * Math.cos(theta);
        arr[ix + 1] = r * Math.sin(phi) * Math.sin(theta);
        arr[ix + 2] = r * Math.cos(phi);
      } else {
        const k = speeds[i] / d;
        arr[ix] = x - x * k;
        arr[ix + 1] = y - y * k;
        arr[ix + 2] = z - z * k;
      }
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#c4b5fd"
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function Halo() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200; i++) {
      const r = 2.6 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);
  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.y = s.clock.elapsedTime * 0.06;
      ref.current.rotation.x = s.clock.elapsedTime * 0.03;
    }
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#c4b5fd" size={0.035} sizeAttenuation transparent opacity={0.6} />
    </points>
  );
}

import { useIsMobile } from "@/hooks/use-mobile";

export default function AriaCore() {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div aria-hidden style={{ position: "absolute", inset: 0 }} className="flex items-center justify-center">
        <div
          className="h-48 w-48 rounded-full animate-pulse"
          style={{
            background:
              "radial-gradient(circle, rgba(167,139,250,0.6) 0%, rgba(245,180,84,0.25) 45%, transparent 70%)",
            filter: "blur(8px)",
          }}
        />
      </div>
    );
  }
  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 45 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.6} color="#a78bfa" />
      <pointLight position={[-4, -2, 3]} intensity={0.9} color="#f5b454" />
      <Volumetric />
      <Halo />
      <DataStreams />
      <Core />
    </Canvas>
  );
}
