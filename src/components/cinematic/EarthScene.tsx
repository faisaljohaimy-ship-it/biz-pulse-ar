import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Intensity = "normal" | "network";

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const atmoRef = useRef<THREE.Mesh>(null);

  const cityTexture = useMemo(() => {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#020410";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = `rgba(245, 180, 84, ${Math.random() * 0.9})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.2, 1.2);
    }
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = `rgba(120, 180, 255, ${Math.random() * 0.5})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (earthRef.current) earthRef.current.rotation.y = t * 0.08;
    if (wireRef.current) wireRef.current.rotation.y = t * 0.08;
    if (atmoRef.current) atmoRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.005);
  });

  return (
    <group>
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
      <mesh ref={wireRef}>
        <sphereGeometry args={[2.41, 32, 24]} />
        <meshBasicMaterial color="#3a8eff" wireframe transparent opacity={0.18} />
      </mesh>
      <mesh ref={atmoRef}>
        <sphereGeometry args={[2.55, 64, 64]} />
        <meshBasicMaterial color="#3a8eff" transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.78, 64, 64]} />
        <meshBasicMaterial color="#7ab8ff" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/** Tiny orbiting satellites with trailing light, on several inclined rings. */
function Satellites({ count = 14 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const sats = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        radius: 3.05 + Math.random() * 1.4,
        tilt: (Math.random() - 0.5) * Math.PI,
        yaw: Math.random() * Math.PI * 2,
        speed: 0.18 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        size: 0.025 + Math.random() * 0.025,
      })),
    [count],
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    sats.forEach((sat, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = sat.phase + t * sat.speed;
      const x = Math.cos(a) * sat.radius;
      const z = Math.sin(a) * sat.radius;
      g.position.set(x, 0, z);
    });
    if (groupRef.current) groupRef.current.rotation.y = t * 0.02;
  });
  return (
    <group ref={groupRef}>
      {sats.map((sat, i) => (
        <group key={i} rotation={[sat.tilt, sat.yaw, 0]}>
          {/* faint orbit ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[sat.radius - 0.004, sat.radius + 0.004, 128]} />
            <meshBasicMaterial color="#9bb6ff" transparent opacity={0.06} side={THREE.DoubleSide} />
          </mesh>
          <group ref={(el) => (refs.current[i] = el)}>
            <mesh>
              <sphereGeometry args={[sat.size, 12, 12]} />
              <meshBasicMaterial color="#f5b454" />
            </mesh>
            {/* glow */}
            <mesh>
              <sphereGeometry args={[sat.size * 2.6, 12, 12]} />
              <meshBasicMaterial color="#f5b454" transparent opacity={0.18} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/** Great-circle arcs between random surface points — pulses traveling along them. */
function NetworkArcs({ count = 16 }: { count?: number }) {
  const arcs = useMemo(() => {
    const make = () => {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      return new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
      );
    };
    return Array.from({ length: count }, () => {
      const start = make().multiplyScalar(2.42);
      const end = make().multiplyScalar(2.42);
      const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(3.4);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const pts = curve.getPoints(48);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      return { geom, curve, speed: 0.4 + Math.random() * 0.7, phase: Math.random() };
    });
  }, [count]);
  const pulseRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    arcs.forEach((a, i) => {
      const m = pulseRefs.current[i];
      if (!m) return;
      const tt = ((t * a.speed + a.phase) % 1 + 1) % 1;
      const p = a.curve.getPoint(tt);
      m.position.copy(p);
    });
  });
  return (
    <group>
      {arcs.map((a, i) => (
        <group key={i}>
          <line>
            <primitive attach="geometry" object={a.geom} />
            <lineBasicMaterial color="#f5b454" transparent opacity={0.32} />
          </line>
          <mesh ref={(el) => (pulseRefs.current[i] = el)}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshBasicMaterial color="#fff3c4" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Stars() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(2400 * 3);
    for (let i = 0; i < 2400; i++) {
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

function CameraOrbit() {
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    s.camera.position.x = Math.sin(t * 0.05) * 0.6;
    s.camera.position.y = Math.sin(t * 0.07) * 0.3;
    s.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function EarthScene({ intensity = "normal" }: { intensity?: Intensity }) {
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
      <Satellites count={intensity === "network" ? 22 : 14} />
      <NetworkArcs count={intensity === "network" ? 26 : 12} />
      <CameraOrbit />
    </Canvas>
  );
}
