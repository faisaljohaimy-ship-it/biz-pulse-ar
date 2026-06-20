import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * ARIA Core — a pulsing 3D energy nucleus.
 * Inner sphere with iridescent shader-ish material, two counter-rotating
 * wireframe shells, and a particle halo.
 */
function Core() {
  const coreRef = useRef<THREE.Mesh>(null);
  const shellARef = useRef<THREE.Mesh>(null);
  const shellBRef = useRef<THREE.Mesh>(null);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (coreRef.current) {
      const p = 1 + Math.sin(t * 1.8) * 0.04;
      coreRef.current.scale.setScalar(p);
      (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.3 + Math.sin(t * 2.4) * 0.4;
    }
    if (shellARef.current) {
      shellARef.current.rotation.x = t * 0.25;
      shellARef.current.rotation.y = t * 0.35;
    }
    if (shellBRef.current) {
      shellBRef.current.rotation.x = -t * 0.18;
      shellBRef.current.rotation.z = t * 0.22;
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
        <meshBasicMaterial color="#f5b454" wireframe transparent opacity={0.25} />
      </mesh>
      {/* glow halo */}
      <mesh>
        <sphereGeometry args={[1.25, 32, 32]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.12} />
      </mesh>
    </group>
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
      <pointsMaterial color="#c4b5fd" size={0.035} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

export default function AriaCore() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 45 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 4]} intensity={1.5} color="#a78bfa" />
      <pointLight position={[-4, -2, 3]} intensity={0.8} color="#f5b454" />
      <Halo />
      <Core />
    </Canvas>
  );
}
