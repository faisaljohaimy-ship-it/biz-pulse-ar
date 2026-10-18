/**
 * BrandWater — «حركة مائية سينمائية» فوق لوحتَي الهوية كما هما (أمر المالك ٢٠٢٦/١٠/١٧).
 *
 * الصورة تبقى **بذاتها**: لا قصّ ولا إعادة تلوين. فوقها سطحُ ماءٍ محسوب في
 * مظلِّل WebGL يُعاد رسمه كل إطار:
 *   • انكسارٌ خفيف — ميلُ سطحِ الماء (تدرّج حقل الارتفاع) يزيح أخذَ العيّنات
 *     من الصورة بضعة بكسلات، مع فصلٍ لوني طفيف (الأحمر دون الأزرق) فيبدو
 *     الزجاج زجاجًا؛
 *   • تموّجاتٌ كاوية — حيث يتقعّر السطح تتركّز الإضاءة (لابلاسيان الارتفاع)
 *     فتلمع بقعٌ سماوية بيضاء تجري على اللوحة؛
 *   • بريقٌ على القمم — انعكاسٌ مرآتي يجري مع الموج كما على ماءٍ حقيقي.
 *
 * **ولا لمعة ماسحة** (حُذفت ٢٠٢٦/١٠/١٨): الشريط القطري العابر كل دورة هو «الهايلايت
 * انميشن» الذي أزاله المالك من النظام كلّه (٢٠٢٦/٠٨/٢٠)، وأمر الماء لم يطلبه.
 *
 * **الدورة مغلقة:** كل حدٍّ زمني فيه عددٌ صحيح من الدورات على طول المقطع
 * (`2π·n·t`، و`t = frame / durationInFrames`) — فالإطار الأخير يسبق الأوّل بلا
 * قفزة، ويُعاد الفيلم بلا وصلة.
 *
 * ولا صوت: لا `<Audio>` هنا — لكنّ Remotion إن صيّر MP4 مباشرةً كتب مسار AAC
 * صامتًا افتراضًا؛ فالحلقات تُرمَّز من تسلسل PNG بلا مسارٍ سمعي أصلًا (RENDER.md)،
 * ويحرس عقدُ الواجهة بايتات الملفّ.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export type BrandWaterProps = {
  /** اسم الملفّ في `public-dir` (الأصل بدقّته الكاملة). */
  readonly src: string;
  /** شدّة الحركة: 1.4 = المعتمد (RENDER.md)؛ أقلّ أهدأ، أكثر أجرأ. */
  readonly strength: number;
};

const VERT = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  // مثلّث يغطّي الشاشة: ثلاثة رؤوس بلا مخزن.
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uT;        // طور الدورة 0..1
uniform float uStrength;
uniform float uAspect;   // العرض / الارتفاع
in vec2 vUv;
out vec4 outColor;
const float TAU = 6.28318530718;

// موجةٌ واحدة: اتجاهٌ وترددٌ مكاني وعددُ دوراتٍ صحيح في المقطع.
float wave(vec2 p, vec2 dir, float freq, float cycles, float phase) {
  return sin(dot(p, dir) * freq + TAU * cycles * uT + phase);
}

// حقل ارتفاع الماء: أربع موجات متقاطعة بسرعات مختلفة — لا نمطَ شبكيّ.
float height(vec2 p) {
  float h = 0.0;
  h += 0.50 * wave(p, normalize(vec2( 1.00, 0.35)),  9.0, 1.0, 0.0);
  h += 0.35 * wave(p, normalize(vec2(-0.60, 1.00)), 14.0, 2.0, 1.7);
  h += 0.25 * wave(p, normalize(vec2( 0.20,-1.00)), 21.0, 3.0, 3.1);
  h += 0.18 * wave(p, normalize(vec2( 1.00, 1.00)), 33.0, 2.0, 0.9);
  return h;
}

void main() {
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * uAspect, uv.y);
  float e = 0.004;
  float hc = height(p);
  float hx1 = height(p + vec2(e, 0.0)), hx0 = height(p - vec2(e, 0.0));
  float hy1 = height(p + vec2(0.0, e)), hy0 = height(p - vec2(0.0, e));
  // الميل مُعايَرٌ على أقصاه النظري (Σ سعة×تردّد ≈ 20) فيصير في [-1, 1].
  vec2 grad = vec2(hx1 - hx0, hy1 - hy0) / (2.0 * e) / 20.0;

  // تلاشٍ عند الحوافّ: لا تلطيخ ولا ارتجاف على إطار اللوحة.
  float edge = smoothstep(0.0, 0.06, uv.x) * smoothstep(0.0, 0.06, 1.0 - uv.x)
             * smoothstep(0.0, 0.10, uv.y) * smoothstep(0.0, 0.10, 1.0 - uv.y);

  // بوّابة الحبر: الماء يحرّك الضوء على الزجاج لا الحروف. الحبر الكحلي داكن
  // والزجاج والسماء فاتحان، فتُقاس إضاءة البكسل في موضعه الأصلي: على الحبر
  // تهبط الإزاحة إلى ربعها (≈ 1.6px عند الشدّة 1.4) ويُحجب التوهّج كلّه (كان يغشّي الحروف
  // بغلالةٍ حليبية ويهبط تباينها — تحكيم ٢٠٢٦/١٠/١٧).
  vec3 base = texture(uTex, uv).rgb;
  float luma = dot(base, vec3(0.299, 0.587, 0.114));
  float gate = smoothstep(0.30, 0.62, luma);

  // الانكسار: إزاحةٌ صغيرة بميل السطح — أقصاها ≈ 0.0028 × الشدّة من العرض (عند
  // 1.4 ≈ 0.004، أي ≈ 6.5px على 1608) على الزجاج، وربعها على الحبر — بفصلٍ لونيٍّ
  // طفيف (≈ ±0.3px عند 1.4).
  vec2 off = grad * (0.0028 * uStrength * edge) * mix(0.25, 1.0, gate);
  vec2 lo = vec2(0.0015), hi = vec2(0.9985);
  vec3 c;
  c.r = texture(uTex, clamp(uv + off * 0.95, lo, hi)).r;
  c.g = texture(uTex, clamp(uv + off,        lo, hi)).g;
  c.b = texture(uTex, clamp(uv + off * 1.05, lo, hi)).b;

  // التموّجات الكاوية: تركُّز الضوء حيث يتقعّر السطح.
  // (الانحناء مُعايَر كذلك: Σ سعة×تردّد² ≈ 415، فالقيمة في [-1, 1].)
  float lap = (hx1 + hx0 + hy1 + hy0 - 4.0 * hc) / (e * e) / 415.0;
  float caustic = pow(clamp(-lap, 0.0, 1.0), 2.5);

  // بريق القمم: انعكاسٌ مرآتي لضوءٍ علويّ على العمود الناظم لسطح الماء —
  // نقاطٌ لامعة تجري مع الموج كما على ماءٍ حقيقي.
  vec3 n = normalize(vec3(-grad * 0.9, 1.0));
  vec3 l = normalize(vec3(-0.35, 0.55, 0.75));
  vec3 v = vec3(0.0, 0.0, 1.0);
  float spec = pow(max(dot(reflect(-l, n), v), 0.0), 48.0);

  // تنفّسٌ بطيء: موجةٌ عريضة واحدة تعبر اللوحة في الدورة فيتبدّل ضوؤها برفق.
  float swell = 0.5 + 0.5 * sin(TAU * uT - (uv.x * 1.6 + uv.y * 0.6) * TAU * 0.5);

  // الضوء يُمزج مزجَ «شاشة» لا جمعًا: لا يقصّ البياض ولا يسطّح تدرّج الزجاج
  // (الجمع كان يرفع البكسلات المقصوصة من 8% إلى 14% عند ذروة اللمعة).
  vec3 glow = vec3(0.72, 0.90, 1.0);
  vec3 light = glow * (caustic * 0.16 + spec * 0.14 + swell * 0.04)
             * uStrength * edge * gate;
  c = 1.0 - (1.0 - c) * (1.0 - clamp(light, 0.0, 1.0));
  outColor = vec4(c, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`shader: ${gl.getShaderInfoLog(shader) ?? "?"}`);
  }
  return shader;
}

type Scene = {
  gl: WebGL2RenderingContext;
  uT: WebGLUniformLocation | null;
  uStrength: WebGLUniformLocation | null;
  uAspect: WebGLUniformLocation | null;
};

export const BrandWater: React.FC<BrandWaterProps> = ({ src, strength }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [handle] = useState(() => delayRender("BrandWater: image + GL"));
  const [ready, setReady] = useState(false);

  // التهيئة مرّةً: السياق والمظلِّل والنسيج من الصورة.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL2 غير متاح في متصفّح التصيير");
    const program = gl.createProgram();
    if (!program) throw new Error("createProgram failed");
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`link: ${gl.getProgramInfoLog(program) ?? "?"}`);
    }
    gl.useProgram(program);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const img = new Image();
    img.decoding = "sync";
    img.onload = () => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program, "uTex"), 0);
      sceneRef.current = {
        gl,
        uT: gl.getUniformLocation(program, "uT"),
        uStrength: gl.getUniformLocation(program, "uStrength"),
        uAspect: gl.getUniformLocation(program, "uAspect"),
      };
      setReady(true);
      continueRender(handle);
    };
    img.onerror = () => {
      throw new Error(`تعذّر تحميل ${src}`);
    };
    img.src = staticFile(src);
  }, [handle, src]);

  // الرسم كل إطار — بعد الجاهزية؛ `preserveDrawingBuffer` يُبقي الإطار للقطة.
  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    if (!ready || !scene || !canvas) return;
    const { gl } = scene;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(scene.uT, frame / durationInFrames);
    gl.uniform1f(scene.uStrength, strength);
    gl.uniform1f(scene.uAspect, width / height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.finish();
  }, [ready, frame, durationInFrames, strength, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width, height, display: "block", background: "#eef3fa" }}
    />
  );
};
