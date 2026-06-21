import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/* ───────────────────────── CITY GRID — Districts & Buildings ───────────────────────── */
function CityGrid() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { buildings, count } = useMemo(() => {
    const GRID = 24;
    const arr: { x: number; z: number; h: number; hue: number; district: number }[] = [];
    for (let i = -GRID; i <= GRID; i++) {
      for (let j = -GRID; j <= GRID; j++) {
        if (Math.random() > 0.55) continue;
        const distance = Math.hypot(i, j);
        if (distance < 2.5) continue;
        // 4 districts by quadrant, with central spire cluster
        const district = i > 0 ? (j > 0 ? 0 : 1) : j > 0 ? 2 : 3;
        const central = distance < 8;
        const h = 0.4 + Math.pow(Math.random(), 2.2) * (central ? 6.5 : 3.4);
        const hue = central ? 0.13 : district === 0 ? 0.58 : district === 1 ? 0.5 : district === 2 ? 0.62 : 0.55;
        arr.push({ x: i * 0.9, z: j * 0.9, h, hue, district });
      }
    }
    return { buildings: arr, count: arr.length };
  }, []);

  useMemo(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    buildings.forEach((b, i) => {
      dummy.position.set(b.x, b.h / 2, b.z);
      dummy.scale.set(0.55, b.h, 0.55);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      color.setHSL(b.hue, 0.85, b.hue < 0.3 ? 0.55 : 0.45);
      meshRef.current!.setColorAt(i, color);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [buildings]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.035;
  });

  // Beacon picks for risk / opportunity / data
  const beacons = useMemo(() => {
    const picks = buildings.filter((_, i) => i % 6 === 0).slice(0, 26);
    return picks.map((b, i) => ({
      x: b.x,
      z: b.z,
      h: b.h,
      kind: i % 5 === 0 ? "risk" : i % 3 === 0 ? "opp" : "data",
      phase: Math.random() * Math.PI * 2,
    }));
  }, [buildings]);

  // Knowledge libraries — larger, distinct glowing blocks
  const libraries = useMemo(
    () => [
      { x: -10, z: 6, h: 4.5 },
      { x: 8, z: -7, h: 5.2 },
      { x: -6, z: -10, h: 3.8 },
    ],
    [],
  );

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          emissive={new THREE.Color("#3a6cff")}
          emissiveIntensity={0.45}
          roughness={0.3}
          metalness={0.85}
        />
      </instancedMesh>

      {/* reflective ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#04060d" metalness={0.85} roughness={0.25} />
      </mesh>

      <StreetGrid />
      <Traffic />
      <DataRings />
      <DataBeams beacons={beacons} />
      <GroundPulses />
      <Drones count={8} />
      <Libraries items={libraries} />
      <Spotlights />
    </group>
  );
}

/* ───────────────────────── STREET GRID (animated traffic veins) ───────────────────────── */
function StreetGrid() {
  const lines = useMemo(() => {
    const arr: { from: [number, number]; to: [number, number] }[] = [];
    for (let i = -20; i <= 20; i += 5) {
      arr.push({ from: [-20, i], to: [20, i] });
      arr.push({ from: [i, -20], to: [i, 20] });
    }
    return arr;
  }, []);
  return (
    <group>
      {lines.map((l, i) => {
        const geom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(l.from[0], 0.03, l.from[1]),
          new THREE.Vector3(l.to[0], 0.03, l.to[1]),
        ]);
        return (
          <line key={i}>
            <primitive attach="geometry" object={geom} />
            <lineBasicMaterial color="#3a8eff" transparent opacity={0.18} />
          </line>
        );
      })}
    </group>
  );
}

function Traffic() {
  // moving light dots traveling along street segments
  const N = 60;
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const cars = useMemo(
    () =>
      Array.from({ length: N }, () => {
        const horizontal = Math.random() > 0.5;
        const lane = (Math.floor(Math.random() * 9) - 4) * 5;
        return {
          horizontal,
          lane,
          phase: Math.random(),
          speed: 0.18 + Math.random() * 0.32,
          dir: Math.random() > 0.5 ? 1 : -1,
          color: Math.random() > 0.7 ? "#f5b454" : "#5cbdff",
        };
      }),
    [],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    cars.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const tt = (((c.phase + t * c.speed * c.dir) % 1) + 1) % 1;
      const p = -20 + tt * 40;
      if (c.horizontal) m.position.set(p, 0.08, c.lane);
      else m.position.set(c.lane, 0.08, p);
    });
  });
  return (
    <group>
      {cars.map((c, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={c.color} />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────────────────── HALO RINGS ───────────────────────── */
function DataRings() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const rings = useMemo(
    () => [
      { r: 6, color: "#f5b454", speed: 0.5 },
      { r: 9, color: "#3a8eff", speed: -0.35 },
      { r: 12, color: "#f5b454", speed: 0.25 },
      { r: 15, color: "#3a8eff", speed: -0.18 },
      { r: 18, color: "#a78bfa", speed: 0.12 },
    ],
    [],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (m) m.rotation.z = t * rings[i].speed;
    });
  });
  return (
    <>
      {rings.map((r, i) => (
        <mesh
          key={i}
          ref={(el) => (refs.current[i] = el)}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02 + i * 0.005, 0]}
        >
          <ringGeometry args={[r.r - 0.08, r.r, 160]} />
          <meshBasicMaterial color={r.color} transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

/* ───────────────────────── DATA BEAMS — risk / opportunity / data ───────────────────────── */
function DataBeams({
  beacons,
}: {
  beacons: { x: number; z: number; h: number; kind: string; phase: number }[];
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    beacons.forEach((b, i) => {
      const m = refs.current[i];
      if (!m) return;
      const pulse = 0.55 + Math.sin(t * 2 + b.phase) * 0.45;
      m.scale.y = 6 + pulse * 8;
      m.position.y = m.scale.y / 2 + b.h;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.5;
    });
  });
  const colorFor = (k: string) =>
    k === "risk" ? "#ff4d57" : k === "opp" ? "#f5b454" : "#5cbdff";
  return (
    <>
      {beacons.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => (refs.current[i] = el)}
          position={[b.x, b.h + 3, b.z]}
        >
          <cylinderGeometry args={[0.05, 0.05, 1, 8, 1, true]} />
          <meshBasicMaterial
            color={colorFor(b.kind)}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

function GroundPulses() {
  const N = 8;
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const pulses = useMemo(
    () =>
      Array.from({ length: N }, () => ({
        x: (Math.random() - 0.5) * 28,
        z: (Math.random() - 0.5) * 28,
        speed: 0.4 + Math.random() * 0.7,
        phase: Math.random(),
        color: Math.random() > 0.5 ? "#f5b454" : "#5cbdff",
      })),
    [],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    pulses.forEach((p, i) => {
      const m = refs.current[i];
      if (!m) return;
      const tt = (((t * p.speed + p.phase) % 1) + 1) % 1;
      const r = 0.2 + tt * 6;
      m.scale.set(r, r, r);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - tt) * 0.6;
    });
  });
  return (
    <>
      {pulses.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => (refs.current[i] = el)}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[p.x, 0.03, p.z]}
        >
          <ringGeometry args={[0.92, 1, 64]} />
          <meshBasicMaterial color={p.color} transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

/* ───────────────────────── DRONES — autonomous AI agents ───────────────────────── */
function Drones({ count = 8 }: { count?: number }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const drones = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        radius: 4 + (i % 3) * 2.5,
        altitude: 4 + Math.random() * 3,
        speed: 0.35 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        color: i % 3 === 0 ? "#f5b454" : "#5cbdff",
      })),
    [count],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    drones.forEach((d, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = d.phase + t * d.speed;
      g.position.set(
        Math.cos(a) * d.radius,
        d.altitude + Math.sin(t * 1.2 + i) * 0.4,
        Math.sin(a) * d.radius,
      );
      g.rotation.y = -a;
    });
  });
  return (
    <group>
      {drones.map((d, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          {/* body */}
          <mesh>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial color={d.color} />
          </mesh>
          {/* glow */}
          <mesh>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshBasicMaterial color={d.color} transparent opacity={0.25} />
          </mesh>
          {/* downward light cone */}
          <mesh position={[0, -1.2, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.45, 2.2, 24, 1, true]} />
            <meshBasicMaterial
              color={d.color}
              transparent
              opacity={0.12}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ───────────────────────── KNOWLEDGE LIBRARIES ───────────────────────── */
function Libraries({ items }: { items: { x: number; z: number; h: number }[] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.2 + Math.sin(t * 1.4 + i) * 0.4;
    });
  });
  return (
    <>
      {items.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]}>
          <mesh
            ref={(el) => (refs.current[i] = el)}
            position={[0, l.h / 2, 0]}
          >
            <boxGeometry args={[1.4, l.h, 1.4]} />
            <meshStandardMaterial
              color="#7a5cff"
              emissive="#a78bfa"
              emissiveIntensity={1.4}
              roughness={0.2}
              metalness={0.7}
            />
          </mesh>
          {/* halo */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[1.4, 1.7, 64]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={0.55} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ───────────────────────── DISTRICT SPOTLIGHTS (volumetric fog cones) ───────────────────────── */
function Spotlights() {
  const positions: [number, number, number][] = [
    [8, 8, 8],
    [-8, 9, 8],
    [8, 8, -8],
    [-8, 9, -8],
    [0, 12, 0],
  ];
  const colors = ["#5cbdff", "#a78bfa", "#f5b454", "#5cbdff", "#ffffff"];
  return (
    <group>
      {positions.map((p, i) => (
        <mesh key={i} position={[p[0], p[1] / 2, p[2]]}>
          <coneGeometry args={[2.2, p[1], 28, 1, true]} />
          <meshBasicMaterial
            color={colors[i]}
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────────────────── CAMERA — cinematic sweep ───────────────────────── */
function CameraDrift() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // sweeping arc + breathing altitude — fly-through feel
    const radius = 14 + Math.sin(t * 0.07) * 3;
    state.camera.position.x = Math.cos(t * 0.06) * radius * 0.4;
    state.camera.position.y = 4.5 + Math.sin(t * 0.11) * 1.4;
    state.camera.position.z = radius + Math.sin(t * 0.05) * 2;
    state.camera.lookAt(0, 1.2, 0);
  });
  return null;
}

import { useIsMobile } from "@/hooks/use-mobile";

export default function CityScene() {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0 }}
        className="bg-[linear-gradient(180deg,#04060d_0%,#0a1530_45%,#1a0a1f_100%)]"
      />
    );
  }
  return (
    <Canvas
      camera={{ position: [0, 4.5, 16], fov: 55 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <fog attach="fog" args={["#04060d", 16, 44]} />
      <ambientLight intensity={0.32} />
      <directionalLight position={[8, 12, 6]} intensity={1.0} color="#9bb6ff" />
      <pointLight position={[0, 8, 0]} intensity={2.0} color="#f5b454" distance={36} />
      <pointLight position={[-12, 4, -10]} intensity={0.8} color="#ff5566" distance={22} />
      <pointLight position={[12, 4, 10]} intensity={0.8} color="#a78bfa" distance={22} />
      <CityGrid />
      <CameraDrift />
    </Canvas>
  );
}
