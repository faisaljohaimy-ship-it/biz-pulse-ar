/**
 * التوأم السينمائي — **المشهد الثلاثي**.
 *
 * ## من أين تأتي «الواقعية» هنا
 *
 * لا صورة واحدة في هذا الملف، ولا ملفّ HDR يُجلب من شبكة. الواقعية كلّها
 * مصنوعة في المتصفّح من أربعة أشياء:
 *
 * ① **بيئة استوديو إجرائية** (`PMREMGenerator` فوق مشهد ألواح مضيئة):
 *    بغيرها يخرج كل معدن أسودَ ميتًا — المعدن لا لون له، إنما يعكس محيطه.
 *    وألواح هذه البيئة **ملوّنة برموز الطبقة نفسها**، فما ينعكس على
 *    الأعمدة هو ضوء الواجهة لا ضوءٌ غريب عنها.
 * ② **مواد PBR إجرائية**: خشونة الأرضية خريطة ضجيج مولَّدة في الذاكرة
 *    (`DataTexture`) — بغير تفاوت الخشونة يصير الانعكاس مرآةً بلاستيكية.
 * ③ **العمق**: ضباب أسّي بلون السطح + عمق ميدان (`DepthOfField`) على
 *    الشاشات الواسعة + ذرّات غبار أمامية تُقرأ بوكيهًا خارج البؤرة.
 * ④ **إضاءة ثلاثية** (مفتاح محايد + حافة سماوية + ملء بنفسجي) وانعكاس
 *    أرضيّ حقيقي: نسخة معكوسة من الأعمدة تحت المستوى، تُرى من خلال أرضية
 *    نصف شفّافة.
 *
 * ## ما لا يجوز أن يضيع من المشهد المرسوم
 *
 * **الارتفاع هو النسبة** — والفرق بين ٩١٪ و٤٥٪ يُرى قبل أن يُقرأ.
 * **والمنطقة التي لم تُقَس لا عمود لها ولا رقم** (المادة ٢٧): تبقى لها
 * حلقة على الأرض واسمٌ وسطرٌ يقول «لم يُقَس»، فالغياب يُقرأ غيابًا لا صفرًا.
 * **والأنابيب** تحمل التوجيه ذهابًا والإفادة إيابًا كما كانت.
 *
 * ## الحركة
 *
 * كل حركةٍ في المشهد تمرّ بدوالّ `twin-scene-model` الخالصة، وكلّها تأخذ
 * `reduced` وتسكن عندها. فمنع الحركة ليس صنفًا في CSS يُنسى هنا: الكاميرا
 * تقف، والنبض يثبت، والحبّات تسكن في منتصف الأنبوب — والمشهد يبقى مقروءًا
 * كاملًا (WCAG 2.2.2).
 *
 * ملاحظة تركيب: هذا الملف هو الوحيد الذي يستورد `three`، ويُحمَّل كسولًا من
 * `TwinStage` خلف حدّ `Suspense` — فلا يدخل حزمة الدخول ولا حزمة الخادم.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ToneMapping,
  DepthOfField,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { REGIONS, type RegionId } from "@/lib/regions";
import { cappedDpr } from "@/lib/graphics/webgl-capability";
import type { SceneTokens } from "./twin-scene-env";
import {
  TWIN_PADS,
  beadOffset,
  cameraPose,
  hubPulse,
  padAccent,
  towerHeight,
  type TwinReading,
} from "./twin-scene-model";

const UP = new THREE.Vector3(0, 1, 0);
const HUB_Y = 0.62;
const PAD_Y = 0.02;

/* ────────────────────────────────────────────────────────────────────────
   بيئة الاستوديو الإجرائية
   ──────────────────────────────────────────────────────────────────────── */

/**
 * خريطة بيئة مولَّدة من ألواح مضيئة بألوان الرموز.
 *
 * `scene.environment` هي ما يجعل `metalness` مرئيًّا أصلًا. وبناؤها هنا —
 * بدل `Environment preset` — يُلغي جلبًا شبكيًّا لملفّ HDR خارجي (يفشل خلف
 * أي حجب، ويُضيف مئات الكيلوبايتات على الشبكة)، ويربط الانعكاسات بالوضع:
 * تُعاد البيئة عند كل قلبٍ لأن ألوان ألواحها من الرموز المقيسة.
 */
function StudioEnvironment({ tokens }: { tokens: SceneTokens }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new THREE.Scene();
    const disposables: Array<THREE.BufferGeometry | THREE.Material> = [];

    const panel = (
      color: THREE.Color,
      size: readonly [number, number],
      position: readonly [number, number, number],
      lookAt: readonly [number, number, number] = [0, 0, 0],
    ) => {
      const geometry = new THREE.PlaneGeometry(size[0], size[1]);
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.lookAt(lookAt[0], lookAt[1], lookAt[2]);
      room.add(mesh);
      disposables.push(geometry, material);
    };

    const cyan = new THREE.Color().setStyle(tokens.cyan);
    const violet = new THREE.Color().setStyle(tokens.violet);
    const surface = new THREE.Color().setStyle(tokens.surface);
    // مفتاحٌ محايد: لونٌ غير مُمرَّر = أبيض `THREE.Color` الافتراضي — لا قيمة
    // مكتوبة، ولذلك لا ينحرف عند قلب الوضع.
    const key = new THREE.Color().multiplyScalar(tokens.light ? 2.6 : 1.35);

    panel(key, [12, 6], [0, 7.5, 1.5], [0, 0, 0]);
    panel(cyan.clone().multiplyScalar(tokens.light ? 1.1 : 1.9), [9, 7], [-8, 3, -2]);
    panel(violet.clone().multiplyScalar(tokens.light ? 1.0 : 1.6), [9, 7], [8, 2.4, 3]);
    panel(
      surface.clone().multiplyScalar(tokens.light ? 1.4 : 0.5),
      [22, 22],
      [0, -3, 0],
      [0, 1, 0],
    );

    const target = pmrem.fromScene(room, 0.035);
    const previous = scene.environment;
    scene.environment = target.texture;

    return () => {
      scene.environment = previous;
      target.dispose();
      pmrem.dispose();
      for (const item of disposables) item.dispose();
    };
  }, [gl, scene, tokens]);

  return null;
}

/* ────────────────────────────────────────────────────────────────────────
   مواد إجرائية
   ──────────────────────────────────────────────────────────────────────── */

/** خريطة خشونة: ضجيج حتميّ (بذرة ثابتة) فلا يختلف إطارٌ عن إطار. */
function makeRoughnessTexture(size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  let seed = 20260809;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < size * size; i++) {
    const value = 128 + Math.round(random() * 96);
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** غلاف فرينل: الحافّة وحدها تضيء — ما يعطي الزجاج حضوره بلا `transmission`. */
function makeFresnelMaterial(color: THREE.Color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: color }, uPower: { value: 2.4 } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), uPower);
        gl_FragColor = vec4(uColor, fres * 0.85);
      }
    `,
  });
}

/* ────────────────────────────────────────────────────────────────────────
   عناصر المشهد
   ──────────────────────────────────────────────────────────────────────── */

function Floor({ tokens }: { tokens: SceneTokens }) {
  const roughness = useMemo(() => makeRoughnessTexture(), []);
  useEffect(() => () => roughness.dispose(), [roughness]);
  const color = useMemo(() => new THREE.Color().setStyle(tokens.surface), [tokens.surface]);

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0}>
      <circleGeometry args={[17, 96]} />
      <meshStandardMaterial
        color={color}
        roughnessMap={roughness}
        roughness={tokens.light ? 0.38 : 0.22}
        metalness={tokens.light ? 0.45 : 0.86}
        envMapIntensity={tokens.light ? 0.9 : 1.5}
        transparent
        opacity={tokens.light ? 0.94 : 0.86}
      />
    </mesh>
  );
}

/** حلقة المنصّة — تُرسم لكل منطقة: الوصلة التنظيمية قائمة وإن لم يقع قياس. */
function PadRing({
  position,
  accent,
  active,
  measured,
}: {
  position: readonly [number, number];
  accent: THREE.Color;
  active: boolean;
  measured: boolean;
}) {
  return (
    <group position={[position[0], PAD_Y, position[1]]}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.78, 0.94, 64]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={measured ? (active ? 0.95 : 0.6) : 0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.001}>
        <circleGeometry args={[0.76, 48]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={measured ? 0.13 : 0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * عمود الضوء — **يُركَّب فقط حين وقع قياس**.
 *
 * لا فرع «ارتفاع صفر» هنا: من لم تُقَس لا يُستدعى لها هذا المكوّن أصلًا،
 * فلا قاعدة عمودٍ مسطّحة تُقرأ «قيست فكانت صفرًا».
 */
function Tower({
  position,
  height,
  accent,
  active,
  mirrored,
  reduced,
  index,
}: {
  position: readonly [number, number];
  height: number;
  accent: THREE.Color;
  active: boolean;
  mirrored: boolean;
  reduced: boolean;
  index: number;
}) {
  const group = useRef<THREE.Group>(null);
  const cap = useRef<THREE.Mesh>(null);
  const shell = useMemo(() => makeFresnelMaterial(accent), [accent]);
  useEffect(() => () => shell.dispose(), [shell]);

  // النهوض من الأرض: يبدأ منبسطًا ويُخمَد نحو ارتفاعه. وتحت منع الحركة
  // يبدأ عند ارتفاعه النهائي — تسكينٌ عند الحالة النهائية لا عند العدم.
  const raised = useRef(reduced ? 1 : 0.02);
  useLayoutEffect(() => {
    raised.current = reduced ? 1 : 0.02;
  }, [reduced]);

  useFrame((state, delta) => {
    if (group.current) {
      raised.current = THREE.MathUtils.damp(raised.current, 1, 3.2, delta);
      group.current.scale.y = Math.max(raised.current, 0.02);
    }
    if (cap.current) {
      const beat = hubPulse(state.clock.elapsedTime + index * 0.7, reduced);
      cap.current.scale.setScalar(beat);
    }
  });

  const opacity = mirrored ? 0.3 : 1;

  return (
    <group ref={group} position={[position[0], PAD_Y, position[1]]}>
      {/* الغلاف الزجاجي — لكنة المنطقة تُقرأ في حافّته */}
      <mesh position-y={height / 2}>
        <cylinderGeometry args={[0.3, 0.4, height, 40, 1, true]} />
        <meshPhysicalMaterial
          color={accent}
          metalness={0.15}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.12}
          transparent
          opacity={(active ? 0.38 : 0.26) * opacity}
          envMapIntensity={1.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position-y={height / 2} scale={1.04}>
        <cylinderGeometry args={[0.3, 0.4, height, 40, 1, true]} />
        <primitive object={shell} attach="material" />
      </mesh>

      {/* القلب المضيء — مصدر الوهج الذي يلتقطه Bloom */}
      <mesh position-y={height / 2}>
        <cylinderGeometry args={[0.13, 0.17, height * 0.97, 24]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={active ? 3.1 : 2.1}
          roughness={0.35}
          metalness={0}
          transparent={mirrored}
          opacity={opacity}
        />
      </mesh>

      {/* هالة القمة تتنفّس بإيقاع متزحزح لكل عمود */}
      <mesh ref={cap} position-y={height} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.22, 0.46, 48]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.55 * opacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** أنبوب البيانات + حبّتا الضوء: توجيهٌ ذاهب وإفادةٌ عائدة. */
function Conduit({
  position,
  accent,
  index,
  reduced,
}: {
  position: readonly [number, number];
  accent: THREE.Color;
  index: number;
  reduced: boolean;
}) {
  const from = useMemo(() => new THREE.Vector3(0, HUB_Y, 0), []);
  const to = useMemo(() => new THREE.Vector3(position[0], PAD_Y + 0.16, position[1]), [position]);
  const { mid, quaternion, length } = useMemo(() => {
    const direction = to.clone().sub(from);
    return {
      mid: from.clone().add(direction.clone().multiplyScalar(0.5)),
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize()),
      length: direction.length(),
    };
  }, [from, to]);

  const forward = useRef<THREE.Mesh>(null);
  const back = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (forward.current)
      forward.current.position.lerpVectors(from, to, beadOffset(t, index, false, reduced));
    if (back.current)
      back.current.position.lerpVectors(from, to, beadOffset(t, index, true, reduced));
  });

  return (
    <group>
      <mesh position={mid} quaternion={quaternion}>
        <cylinderGeometry args={[0.014, 0.014, length, 8]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={forward}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh ref={back} scale={0.7}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color={accent} transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** القلب النابض وحلقته المدارية. */
function Hub({ tokens, reduced }: { tokens: SceneTokens; reduced: boolean }) {
  const core = useRef<THREE.Mesh>(null);
  const orbit = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color().setStyle(tokens.cyan), [tokens.cyan]);

  useFrame((state, delta) => {
    const beat = hubPulse(state.clock.elapsedTime, reduced);
    if (core.current) core.current.scale.setScalar(beat);
    if (orbit.current && !reduced) orbit.current.rotation.z += delta * 0.24;
  });

  return (
    <group position={[0, HUB_Y, 0]}>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.42, 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.4}
          roughness={0.22}
          metalness={0.4}
          envMapIntensity={1.6}
        />
      </mesh>
      <mesh ref={orbit} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.92, 0.012, 8, 128]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight color={color} intensity={reduced ? 8 : 11} distance={9} decay={2} />
    </group>
  );
}

/** غبار الهواء — أقراص ناعمة تُقرأ بوكيهًا خارج البؤرة، لا نقاطًا حادّة. */
function Dust({
  tokens,
  reduced,
  count = 240,
}: {
  tokens: SceneTokens;
  reduced: boolean;
  count?: number;
}) {
  const points = useRef<THREE.Points>(null);
  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    let seed = 977;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (random() - 0.5) * 16;
      positions[i * 3 + 1] = random() * 5.4;
      positions[i * 3 + 2] = (random() - 0.5) * 16;
      seeds[i] = random() * 6.28;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color().setStyle(tokens.cyan) },
        uTime: { value: 0 },
        uSize: { value: 46 },
        uOpacity: { value: tokens.light ? 0.35 : 0.8 },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uSize;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float t = uTime + aSeed;
          p.x += sin(t * 0.22) * 0.35;
          p.y += cos(t * 0.17) * 0.28;
          vAlpha = 0.25 + 0.75 * (0.5 + 0.5 * sin(t * 0.6));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (1.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.12, d) * vAlpha * uOpacity;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    return { geometry: geo, material: mat };
  }, [count, tokens.cyan, tokens.light]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    if (reduced) return;
    material.uniforms.uTime.value += delta;
    if (points.current) points.current.rotation.y += delta * 0.008;
  });

  return <points ref={points} geometry={geometry} material={material} />;
}

/** الكاميرا: دولّي ومدار بطيئان — وسكونٌ تامّ عند منع الحركة. */
function CameraRig({ reduced }: { reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const pose = cameraPose(state.clock.elapsedTime, reduced);
    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    target.set(pose.target[0], pose.target[1], pose.target[2]);
    camera.lookAt(target);
  });

  return null;
}

/**
 * إسقاط المراسي على طبقة اللافتات.
 *
 * اللافتات نصٌّ في DOM لا رسمٌ في الكانفس: القارئات الشاشية تقرأ اسم
 * المنطقة ورقمها (أو «لم يُقَس») كما تقرأ أي نصّ، والكانفس نفسه مخفيّ عنها.
 * الموضع يُكتب متغيّرًا مخصّصًا على العنصر مباشرة — لا حالة React لكل إطار.
 */
function LabelProjector({
  anchors,
  nodes,
}: {
  anchors: readonly (readonly [number, number, number])[];
  nodes: React.RefObject<Array<HTMLElement | null>>;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const vector = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const list = nodes.current;
    if (!list) return;
    for (let i = 0; i < anchors.length; i++) {
      const node = list[i];
      if (!node) continue;
      vector.set(anchors[i][0], anchors[i][1], anchors[i][2]).project(camera);
      node.style.setProperty("--tw3-x", `${((vector.x + 1) / 2) * size.width}px`);
      node.style.setProperty("--tw3-y", `${((1 - vector.y) / 2) * size.height}px`);
    }
  });

  return null;
}

/* ────────────────────────────────────────────────────────────────────────
   المشهد
   ──────────────────────────────────────────────────────────────────────── */

export interface TwinScene3DProps {
  readonly ar: boolean;
  readonly readings: readonly TwinReading[];
  readonly tokens: SceneTokens;
  readonly reduced: boolean;
  /** الصفحة مخفيّة ⇒ `false` ⇒ حلقة الرسم تتوقّف. */
  readonly animate: boolean;
  readonly activeRegionId?: RegionId;
}

export function TwinScene3D({
  ar,
  readings,
  tokens,
  reduced,
  animate,
  activeRegionId,
}: TwinScene3DProps) {
  const labelNodes = useRef<Array<HTMLElement | null>>([]);

  const nodes = useMemo(
    () =>
      REGIONS.map((region, index) => {
        const pct = readings.find((r) => r.id === region.id)?.pct ?? null;
        const height = towerHeight(pct);
        const position = TWIN_PADS[region.id];
        return {
          region,
          index,
          pct,
          height,
          position,
          accent: new THREE.Color().setStyle(padAccent(region.id)),
          anchor: [position[0], (height ?? 0) + 0.62, position[1]] as const,
        };
      }),
    [readings],
  );

  const anchors = useMemo(() => nodes.map((n) => n.anchor), [nodes]);
  const surface = useMemo(() => new THREE.Color().setStyle(tokens.surface), [tokens.surface]);
  const cyan = useMemo(() => new THREE.Color().setStyle(tokens.cyan), [tokens.cyan]);
  const violet = useMemo(() => new THREE.Color().setStyle(tokens.violet), [tokens.violet]);
  const initial = cameraPose(0, reduced);

  return (
    <div className="relative isolate h-full w-full">
      <Canvas
        aria-hidden
        className="!absolute inset-0"
        dpr={cappedDpr(2)}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{
          fov: 34,
          near: 0.1,
          far: 60,
          position: [initial.position[0], initial.position[1], initial.position[2]],
        }}
        frameloop={animate ? "always" : "demand"}
        onCreated={({ gl }) => {
          // تعيين النغمة يتولّاه `ToneMapping` بعد الرسم — تركُه هنا يطبّقه مرّتين.
          gl.toneMapping = THREE.NoToneMapping;
        }}
      >
        <fogExp2 attach="fog" args={[surface, tokens.light ? 0.028 : 0.052]} />

        <StudioEnvironment tokens={tokens} />
        <CameraRig reduced={reduced} />

        {/* إضاءة ثلاثية: مفتاحٌ محايد (بلا لون مكتوب) + حافّة + ملء */}
        <ambientLight intensity={tokens.light ? 1.3 : 0.32} />
        <directionalLight position={[5, 8, 4]} intensity={tokens.light ? 2.5 : 1.5} />
        <directionalLight position={[-6, 2.6, -4]} intensity={1.6} color={cyan} />
        <pointLight
          position={[0, 2.6, 6]}
          intensity={tokens.light ? 14 : 26}
          color={violet}
          distance={26}
          decay={2}
        />

        {/* الانعكاس الأرضيّ: نسخة معكوسة تحت المستوى، تُرى عبر أرضية شفّافة */}
        <group scale={[1, -1, 1]}>
          {nodes.map((n) =>
            n.height === null ? null : (
              <Tower
                key={`m-${n.region.id}`}
                position={n.position}
                height={n.height}
                accent={n.accent}
                active={n.region.id === activeRegionId}
                mirrored
                reduced={reduced}
                index={n.index}
              />
            ),
          )}
        </group>

        <Floor tokens={tokens} />

        {nodes.map((n) => (
          <Conduit
            key={`c-${n.region.id}`}
            position={n.position}
            accent={n.accent}
            index={n.index}
            reduced={reduced}
          />
        ))}

        {nodes.map((n) => (
          <PadRing
            key={`p-${n.region.id}`}
            position={n.position}
            accent={n.accent}
            active={n.region.id === activeRegionId}
            measured={n.height !== null}
          />
        ))}

        {nodes.map((n) =>
          n.height === null ? null : (
            <Tower
              key={n.region.id}
              position={n.position}
              height={n.height}
              accent={n.accent}
              active={n.region.id === activeRegionId}
              mirrored={false}
              reduced={reduced}
              index={n.index}
            />
          ),
        )}

        <Hub tokens={tokens} reduced={reduced} />
        <Dust tokens={tokens} reduced={reduced} />
        <LabelProjector anchors={anchors} nodes={labelNodes} />

        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            intensity={tokens.light ? 0.5 : 1.05}
            luminanceThreshold={tokens.light ? 0.5 : 0.22}
            luminanceSmoothing={0.65}
            mipmapBlur
          />
          <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={2.6} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette
            eskil={false}
            offset={0.28}
            darkness={tokens.light ? 0.35 : 0.72}
            blendFunction={BlendFunction.NORMAL}
          />
        </EffectComposer>
      </Canvas>

      {/* لافتات المناطق — نصٌّ مقروء فوق المشهد، لا رسمٌ داخله */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {nodes.map((n, i) => (
          <div
            key={n.region.id}
            ref={(el) => {
              labelNodes.current[i] = el;
            }}
            className="absolute start-0 top-0 will-change-transform"
            style={{ translate: "var(--tw3-x, 50%) var(--tw3-y, 50%)" }}
          >
            <div className="-translate-x-1/2 -translate-y-full">
              <div className="flex min-h-8 items-center gap-2 whitespace-nowrap rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip-strong)] px-3 py-1 text-[12px] font-bold text-[color:var(--ink)] backdrop-blur-sm">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--tw3-accent)]"
                  style={{ ["--tw3-accent" as string]: padAccent(n.region.id) }}
                />
                <span>{ar ? n.region.shortAr : n.region.shortEn}</span>
                <span
                  className="font-black tabular-nums text-[color:var(--ink)] data-[empty]:font-normal data-[empty]:text-[color:var(--ink-3)]"
                  data-empty={n.pct === null || undefined}
                >
                  {n.pct === null ? (ar ? "لم يُقَس" : "not measured") : `${Math.round(n.pct)}%`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TwinScene3D;
