/**
 * HologramFX — premium R3F building blocks used by AriaScene:
 *
 *  - HologramShell:   semi-transparent Fresnel sphere around the head,
 *                     gives the "neural crystal" rim glow.
 *  - NeuralParticles: GPU points field of soft blue motes that drift
 *                     and pulse around the bust.
 *  - ScanRing:        thin emissive ring that pulses on listening /
 *                     speaking states (ear-side holographic wave).
 *
 * All meshes are additive / transparent and write nothing meaningful
 * to the depth buffer, so they layer cleanly over ProceduralBust
 * without z-fighting and add only a few hundred extra draw ops.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function HologramShell({ color, intensity = 1 }: { color: string; intensity?: number }) {
  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTime: { value: 0 },
        uIntensity: { value: intensity },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView   = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3  uColor;
        uniform float uTime;
        uniform float uIntensity;
        varying vec3  vNormal;
        varying vec3  vView;
        void main() {
          float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
          float pulse = 0.85 + 0.15 * sin(uTime * 1.8);
          float scan  = 0.35 + 0.65 * smoothstep(0.0, 1.0,
                          0.5 + 0.5 * sin(vNormal.y * 18.0 + uTime * 2.0));
          float a = fres * pulse * uIntensity * (0.55 + 0.45 * scan);
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    return m;
  }, [color, intensity]);

  useFrame((_, dt) => {
    const u = mat.uniforms;
    u.uTime.value += dt;
    (u.uIntensity.value as number) = THREE.MathUtils.damp(
      u.uIntensity.value as number,
      intensity,
      4,
      dt,
    );
  });

  return (
    <mesh scale={1.06} position={[0, 0.4, 0]}>
      <sphereGeometry args={[0.5, 64, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export function NeuralParticles({
  color,
  count = 220,
  radius = 1.1,
  speed = 0.18,
}: {
  color: string;
  count?: number;
  radius?: number;
  speed?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const { geom, mat, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seedsArr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = Math.random(),
        v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.55 + Math.random() * 0.55);
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6 + 0.35;
      positions[i * 3 + 2] = r * Math.cos(phi) * 0.6;
      seedsArr[i] = Math.random() * 6.28;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seedsArr, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTime: { value: 0 },
        uSize: { value: 22 },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uSize;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float t = uTime + aSeed;
          p.x += sin(t * 0.7) * 0.05;
          p.y += cos(t * 0.5) * 0.05;
          p.z += sin(t * 0.6) * 0.05;
          vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(t * 1.6));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (1.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    return { geom: g, mat: m, seeds: seedsArr };
  }, [color, count, radius]);

  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt * speed * 3.5;
    if (ref.current) ref.current.rotation.y += dt * speed * 0.25;
  });

  return <points ref={ref} geometry={geom} material={mat} />;
}

export function ScanRing({
  color,
  intensity = 0,
  radius = 0.62,
}: {
  color: string;
  intensity?: number;
  radius?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = THREE.MathUtils.damp(m.opacity, 0.15 + intensity * 0.7, 6, dt);
    ref.current.rotation.z += dt * (0.6 + intensity * 1.4);
  });
  return (
    <mesh ref={ref} position={[0, 0.42, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.006, 8, 96]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.2}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
