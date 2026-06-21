import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Intensity = "normal" | "network";

// Centered on the Arabian Peninsula (~45°E, 25°N) — NASA Black Marble night map.
const EARTH_NIGHT_URL = "https://unpkg.com/three-globe/example/img/earth-night.jpg";
const ARABIA_LON = 45 * (Math.PI / 180);
const ARABIA_LAT = 25 * (Math.PI / 180);

function Earth() {
  const earthRef = useRef<THREE.Group>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const atmoRef = useRef<THREE.Mesh>(null);

  const nightTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const tex = loader.load(EARTH_NIGHT_URL);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

  // Default Three sphere maps texture u=0 to +X; texture center (Greenwich, lon 0) ends at -X.
  // To bring longitude L to face camera (+Z), rotate Y by (π/2 - L).
  const baseYaw = Math.PI / 2 - ARABIA_LON;

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const yaw = baseYaw + Math.sin(t * 0.08) * 0.06;
    if (earthRef.current) {
      earthRef.current.rotation.y = yaw;
      earthRef.current.rotation.x = -ARABIA_LAT + Math.sin(t * 0.05) * 0.02;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y = yaw;
      wireRef.current.rotation.x = -ARABIA_LAT;
    }
    if (atmoRef.current) atmoRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.005);
  });

  return (
    <group>
      <group ref={earthRef}>
        <mesh>
          <sphereGeometry args={[2.4, 96, 96]} />
          <meshStandardMaterial
            map={nightTexture}
            emissive={new THREE.Color("#f5b454")}
            emissiveMap={nightTexture}
            emissiveIntensity={1.25}
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>
      </group>
      <mesh ref={wireRef}>
        <sphereGeometry args={[2.41, 32, 24]} />
        <meshBasicMaterial color="#3a8eff" wireframe transparent opacity={0.14} />
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

import { useIsMobile } from "@/hooks/use-mobile";

export default function EarthScene({ intensity = "normal" }: { intensity?: Intensity }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    // Lightweight CSS fallback to avoid WebGL OOM crashes on mobile Safari
    return (
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0 }}
        className="bg-[radial-gradient(circle_at_50%_50%,rgba(58,142,255,0.35),rgba(4,6,13,0.95)_60%,#04060d_100%)]"
      />
    );
  }
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
      <CityHubs />
      <Satellites count={intensity === "network" ? 22 : 14} />
      <NetworkArcs count={intensity === "network" ? 26 : 12} />
      <CameraOrbit />
    </Canvas>
  );
}

/** Glowing markers + ground pulses at major executive hubs. */
function CityHubs() {
  // [lon°, lat°, color]
  const hubs: [number, number, string][] = [
    [46.7, 24.7, "#f5b454"],   // Riyadh
    [55.3, 25.2, "#f5b454"],   // Dubai
    [-0.1, 51.5, "#9bb6ff"],   // London
    [-74.0, 40.7, "#9bb6ff"],  // New York
    [139.7, 35.7, "#a78bfa"],  // Tokyo
    [103.8, 1.35, "#a78bfa"],  // Singapore
    [116.4, 39.9, "#a78bfa"],  // Beijing
    [13.4, 52.5, "#9bb6ff"],   // Berlin
    [31.2, 30.0, "#f5b454"],   // Cairo
  ];
  const baseYaw = Math.PI / 2 - ARABIA_LON;
  const group = useRef<THREE.Group>(null);
  const pulseRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const yaw = baseYaw + Math.sin(t * 0.08) * 0.06;
    if (group.current) {
      group.current.rotation.y = yaw;
      group.current.rotation.x = -ARABIA_LAT + Math.sin(t * 0.05) * 0.02;
    }
    pulseRefs.current.forEach((m, i) => {
      if (!m) return;
      const tt = ((t * 0.6 + i * 0.17) % 1 + 1) % 1;
      const sc = 1 + tt * 3.2;
      m.scale.setScalar(sc);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - tt) * 0.55;
    });
  });
  return (
    <group ref={group}>
      {hubs.map(([lon, lat, color], i) => {
        const lonR = lon * (Math.PI / 180);
        const latR = lat * (Math.PI / 180);
        const r = 2.42;
        const x = r * Math.cos(latR) * Math.cos(lonR);
        const y = r * Math.sin(latR);
        const z = -r * Math.cos(latR) * Math.sin(lonR);
        const normal = new THREE.Vector3(x, y, z).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        return (
          <group key={i} position={[x, y, z]} quaternion={quat}>
            {/* hub dot */}
            <mesh>
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* glow */}
            <mesh>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshBasicMaterial color={color} transparent opacity={0.28} />
            </mesh>
            {/* ground pulse ring (tangent to surface) */}
            <mesh ref={(el) => (pulseRefs.current[i] = el)} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.05, 0.07, 48]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} />
            </mesh>
            {/* uplink beam */}
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.36, 6]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
