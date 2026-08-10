/**
 * كاميرا مجسّمة صغيرة — إسقاط منظوري حقيقي بدل التزييف متساوي القياس.
 *
 * الصفحة الحيّة (`src/routes/-nx-twin-page.tsx`) ترسم المشهد بإسقاط
 * ثابت لأنّها ساكنة؛ الفيلم يحتاج كاميرا تتحرّك، فالمعنى نفسه — ارتفاع
 * العمود هو النسبة — يبقى صادقًا من كل زاوية ما دام الإسقاط واحدًا
 * لكل العناصر. لذلك يمرّ **كل** رأس في المشهد عبر `project` وحدها.
 *
 * الاصطلاح: الأرض مستوى z=0، والكاميرا على مسافة `dist` من المركز
 * بارتفاع زاويّ `el` فوق الأفق، وتدور حول المشهد بزاوية `az`.
 */

export interface V3 {
  x: number;
  y: number;
  z: number;
}

export interface Camera {
  /** سمت الدوران حول المحور الرأسي (راديان). */
  az: number;
  /** الارتفاع الزاويّ فوق الأفق (راديان). */
  el: number;
  /** بُعد الكاميرا عن المركز (وحدات عالم). */
  dist: number;
  /** البُعد البؤري بالبكسل — يحدّد شدّة المنظور. */
  focal: number;
  /** مركز الإسقاط على الشاشة (بكسل). */
  cx: number;
  cy: number;
}

export interface P2 {
  x: number;
  y: number;
  /** معامل التصغير المنظوري عند هذه النقطة — يُستعمل لسمك الخطوط. */
  k: number;
  /** العمق في فضاء الكاميرا — يُرتَّب به الرسم من الخلف للأمام. */
  depth: number;
}

export function project(p: V3, cam: Camera): P2 {
  const ca = Math.cos(cam.az);
  const sa = Math.sin(cam.az);
  const px = p.x * ca - p.y * sa;
  const py = p.x * sa + p.y * ca;

  const ce = Math.cos(cam.el);
  const se = Math.sin(cam.el);

  // فضاء الكاميرا: X يمينًا، Y أعلى، Z للأمام (العمق).
  const X = px;
  const Y = py * se + p.z * ce;
  const Z = py * ce - p.z * se + cam.dist;

  const depth = Math.max(Z, 0.25);
  const k = cam.focal / depth;
  return { x: cam.cx + X * k, y: cam.cy - Y * k, k, depth };
}

/**
 * الاتجاه في العالم الذي يُسقَط أفقيًّا خالصًا على الشاشة.
 * يُستعمل لتعريض الأعمدة نحو الكاميرا دائمًا (عمود الضوء لوح رأسي
 * يواجه الناظر، لا صندوق له جوانب).
 */
export function screenRight(cam: Camera): V3 {
  return { x: Math.cos(cam.az), y: -Math.sin(cam.az), z: 0 };
}

export function add(p: V3, d: V3, s: number): V3 {
  return { x: p.x + d.x * s, y: p.y + d.y * s, z: p.z + d.z * s };
}

/** حلقة أفقية على الأرض (أو على ارتفاع z) كمسار SVG مغلق. */
export function ringPath(radius: number, z: number, cam: Camera, steps = 96): string {
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    const q = project({ x: Math.cos(a) * radius, y: Math.sin(a) * radius, z }, cam);
    d += `${i === 0 ? "M" : "L"}${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
  }
  return `${d}Z`;
}

/* ── مساعدات التوقيت: كلّها دوريّة بدورة كاملة واحدة ─────────────────
   الفيلم حلقة متّصلة، فكل دالة هنا تُرجع القيمة نفسها عند t=0 وt=1،
   وبمشتقّة متطابقة عند الطرفين حيث تحتاج الحركة ألّا تُرى وصلتها. */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const smoothstep = (x: number): number => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

/** تدرّج خطّي محصور بين علامتين زمنيّتين. */
export const win = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));

/** موجة دوريّة ناعمة: 0 عند الطرفين، 1 في الوسط، بمشتقّة صفريّة عند 0 و1. */
export const breathe = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * 2 * t);

/** الجزء الكسري — يُنتج سريانًا متكرّرًا بعدد دورات صحيح داخل الحلقة. */
export const frac = (x: number): number => x - Math.floor(x);

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** نهوضٌ بتجاوز طفيف ثم استقرار — منحنى «نهوض العمود». */
export const outBack = (x: number): number => {
  const c1 = 1.24;
  const c3 = c1 + 1;
  const u = clamp01(x) - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};
