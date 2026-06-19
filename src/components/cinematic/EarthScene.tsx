import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const atmoRef = useRef<THREE.Mesh>(null);

  // Generate a simple "city lights" texture procedurally
  const cityTexture = useMemo(() => {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#020410";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 2400; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const intensity = Math.random();
      ctx.fillStyle = `rgba(245, 180, 84, ${intensity * 0.9})`;
      ctx.fillRect(x, y, 1.2, 1.2);
    }
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillStyle = `rgba(120, 180, 255, ${Math.random() * 0.5})`;
      ctx.fillRect(x, y, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (earthRef.current) earthRef.current.rotation.y = t * 0.08;
    if (wireRef.current) wireRef.current.rotation.y = t * 0.08;
    if (atmoRef.current) {
      const s = 1 + Math.sin(t * 1.2) * 0.005;
      atmoRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      {/* Earth body */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2.4, 64, 64]} />
        <meshStandardMaterial
          map={cityTexture}
          emissive={new THREE.Color("#f5b454")}
          emissiveMap={cityTexture}
          emissiveIntensity={1.4}
          roughness={0.95}
          metalness={0.1}
        />
      </mesh>
      {/* Wireframe intelligence grid */}
      <mesh ref={wireRef}>
        <sphereGeometry args={[2.41, 32, 24]} />
        <meshBasicMaterial color="#3a8eff" wireframe transparent opacity={0.18} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh ref={atmoRef}>
        <sphereGeometry args={[2.55, 64, 64]} />
        <meshBasicMaterial color="#3a8eff" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function Stars() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      const r = 30 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.005;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.06} sizeAttenuation transparent opacity={0.85} />
    </points>
  );
}

export default function EarthScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 45 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#9bb6ff" />
      <pointLight position={[-6, -2, 4]} intensity={0.6} color="#f5b454" />
      <Stars />
      <Earth />
    </Canvas>
  );
}
