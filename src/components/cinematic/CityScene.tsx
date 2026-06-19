import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Procedural futuristic city — instanced glowing buildings on a dark plane,
 * with golden + blue data streams flowing along the ground. Lightweight,
 * runs at 60fps on mobile because it uses InstancedMesh + simple shaders.
 */
function CityGrid() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { buildings, count } = useMemo(() => {
    const GRID = 22;
    const arr: { x: number; z: number; h: number; hue: number }[] = [];
    for (let i = -GRID; i <= GRID; i++) {
      for (let j = -GRID; j <= GRID; j++) {
        if (Math.random() > 0.55) continue;
        const distance = Math.hypot(i, j);
        if (distance < 2.5) continue;
        const h = 0.4 + Math.pow(Math.random(), 2.2) * (distance < 10 ? 5.5 : 3.2);
        arr.push({ x: i * 0.9, z: j * 0.9, h, hue: Math.random() > 0.7 ? 0.13 : 0.6 });
      }
    }
    return { buildings: arr, count: arr.length };
  }, []);

  // Apply transforms once
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
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.045;
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          emissive={new THREE.Color("#3a6cff")}
          emissiveIntensity={0.35}
          roughness={0.35}
          metalness={0.8}
        />
      </instancedMesh>

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#04060d" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Data stream rings */}
      <DataRings />
    </group>
  );
}

function DataRings() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const rings = useMemo(
    () => [
      { r: 6, color: "#f5b454", speed: 0.5 },
      { r: 9, color: "#3a8eff", speed: -0.35 },
      { r: 12, color: "#f5b454", speed: 0.25 },
      { r: 15, color: "#3a8eff", speed: -0.18 },
    ],
    [],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.rotation.z = t * rings[i].speed;
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
          <ringGeometry args={[r.r - 0.08, r.r, 128]} />
          <meshBasicMaterial color={r.color} transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function CameraDrift() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.08) * 2.2;
    state.camera.position.y = 4.2 + Math.sin(t * 0.12) * 0.4;
    state.camera.lookAt(0, 0.5, 0);
  });
  return null;
}

export default function CityScene() {
  return (
    <Canvas
      camera={{ position: [0, 4.2, 14], fov: 55 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <fog attach="fog" args={["#04060d", 14, 38]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 10, 6]} intensity={0.9} color="#9bb6ff" />
      <pointLight position={[0, 5, 0]} intensity={1.5} color="#f5b454" distance={28} />
      <CityGrid />
      <CameraDrift />
    </Canvas>
  );
}
