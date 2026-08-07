/**
 * أصول Lottie — حارس بنية إطارات المفاتيح.
 *
 * ## العطل الذي أنشأ هذا الملف
 *
 * كُتب الأصلان برمجيًّا ثم «تُحقّق» منهما بفحص الحقول العليا وحدها
 * (`v` · `fr` · `ip` · `op` · `w` · `h` · `layers`) — وكلّها كانت سليمة.
 * ومرّ الأصلان، ومرّ اختبار حيّ على متصفّح أثبت أن الأيقونة **صُيِّرت**
 * وأن **لونها يتبع الوضعين**. وكلا الإثباتين صحيح.
 *
 * ولم تكن تتحرّك.
 *
 * إطارات المفاتيح أحاديّة البُعد (الشفافية · الدوران) كُتبت
 * `{"i":{"x":[0.4]},"o":{"x":[0.6]}}` — بلا `y`. بينما ثلاثيّة البُعد
 * (المقياس) كُتبت كاملة `{"x":[…],"y":[…]}`. فيقرأ `interpolateValue`
 * القيمة `o.y[0]` من `undefined` ويرمي `renderFrameError` عند الإطار
 * الأوّل، فتتجمّد الأيقونة إطارًا واحدًا إلى الأبد — ويُحمَّل ١٦٥ كيلوبايت
 * من المشغّل لرسم صورة ساكنة.
 *
 * ## الدرس المكتوب هنا
 *
 * **«صُيِّر» ليست «يتحرّك».** كل ما قِيس آنذاك كان صحيحًا وأجاب عن سؤالٍ
 * آخر. والحارس يسأل السؤال الذي فات: هل بنية الإطارات صالحة للاستيفاء؟
 *
 * ويُفحص بنيويًّا لا بتشغيل المشغّل: الفحص البنيوي حتميّ وسريع ولا يحتاج
 * متصفّحًا، ويمسك العلّة عند مصدرها — بينما تشغيل المشغّل يمسك العَرَض.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

const DIR = "public/lottie";
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".json"));

/** كل كائن تسهيل (`i`/`o`) في الشجرة، مع مساره لرسالة خطأ تقول أين. */
function easingObjects(
  node: unknown,
  path = "$",
): { path: string; ease: Record<string, unknown> }[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((v, i) => easingObjects(v, `${path}[${i}]`));

  const out: { path: string; ease: Record<string, unknown> }[] = [];
  const obj = node as Record<string, unknown>;
  for (const key of ["i", "o"] as const) {
    const ease = obj[key];
    if (ease && typeof ease === "object" && !Array.isArray(ease)) {
      const e = ease as Record<string, unknown>;
      // كائن التسهيل يُعرَف بوجود `x`؛ و`i`/`o` تُستعملان كذلك لمقابض
      // المسار (حيث تكونان مصفوفتين) — وتلك تُستثنى بالشرط نفسه.
      if (Array.isArray(e.x)) out.push({ path: `${path}.${key}`, ease: e });
    }
  }
  for (const [k, v] of Object.entries(obj)) out.push(...easingObjects(v, `${path}.${k}`));
  return out;
}

describe("أصول Lottie — البنية صالحة للاستيفاء", () => {
  it("actually found assets to check", () => {
    // حارس صامت: لو نُقل المجلّد لَمرّ الملف كلّه بلا معنى.
    expect(FILES.length).toBeGreaterThan(0);
  });

  it.each(FILES)("%s — يُقرأ ويحمل الحقول الإلزامية", (file) => {
    const j = JSON.parse(readFileSync(`${DIR}/${file}`, "utf8")) as Record<string, unknown>;
    for (const key of ["v", "fr", "ip", "op", "w", "h", "layers"]) {
      expect(j[key], `${file}: الحقل ${key} مفقود`).toBeDefined();
    }
    expect(Array.isArray(j.layers)).toBe(true);
  });

  it.each(FILES)("%s — كل كائن تسهيل يحمل `y` بأبعاد `x` نفسها", (file) => {
    // هذا هو الفحص الذي كان سيمسك العطل قبل الدفع.
    const j = JSON.parse(readFileSync(`${DIR}/${file}`, "utf8"));
    const broken = easingObjects(j)
      .filter(
        ({ ease }) =>
          !Array.isArray(ease.y) || (ease.y as unknown[]).length !== (ease.x as unknown[]).length,
      )
      .map(({ path, ease }) => `${path} → x:${JSON.stringify(ease.x)} y:${JSON.stringify(ease.y)}`);

    expect(broken, `${file}: إطارات مفاتيح لا تُستوفى:\n  ${broken.join("\n  ")}`).toEqual([]);
  });

  it.each(FILES)("%s — لا لون متحرّك (يُبقي مزامنة اللون رخيصة)", (file) => {
    // اللون الثابت يُكتب مرّة؛ والمتحرّك يُعاد كتابته كلّما تغيّر. القاعدة
    // تغلبه في الحالين، لكن الثابت لا يُشغل المشغّل بما لا يُرى.
    const raw = readFileSync(`${DIR}/${file}`, "utf8");
    expect(raw).not.toMatch(/"c":\s*\{\s*"a":\s*1/);
  });

  it.each(FILES)("%s — مقاسه ٢٤×٢٤ ليطابق شبكة lucide", (file) => {
    const j = JSON.parse(readFileSync(`${DIR}/${file}`, "utf8"));
    expect([j.w, j.h]).toEqual([24, 24]);
  });
});
