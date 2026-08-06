/**
 * عقد الخرائط والوكلاء — البنود ٢٣ · ٢٥ · ٣٠ من سجل التغيير المفتوح.
 *
 * ثلاثة مطالب هنا من النوع الذي يسقط بصمت: إحداثيٌّ خارج المملكة يُرسم
 * فيبدو الرسم سليمًا لمن لا يعرف الجغرافيا، ووكيلٌ يحمل اسمين حسب الشاشة
 * فلا يُرى التناقض إلا بفتح الشاشتين معًا، ورسمٌ يحمل بُعدين ويشرح واحدًا.
 * لا بناءَ يكسر في أيٍّ منها.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isInsideSaudi, projectToViewBox, SAUDI_VIEWBOX } from "@/components/map/saudi-geometry";
import { DIGITAL_HUMANS, agentName, type DigitalHumanId } from "@/lib/digital-humans/registry";

const read = (p: string) => readFileSync(p, "utf8");
/** التعليقات تشرح الأسماء المُزالة وتذكرها — الحارس يفحص الكود وحده. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

describe("البندان ٢٣ و٣٠ — داخل المملكة حصرًا، بتعريف واحد", () => {
  it("يقبل مدن المملكة ويرفض جاراتها", () => {
    // تسع مدن سعودية من أطراف المملكة الأربعة، وسبع خارجها — أقربها
    // المنامة (٥٠٫٥٩) وهي شرق الدمام (٥٠٫٠٩) بنصف درجة فقط. صندوقٌ محيط
    // يعجز عن هذا الفصل مهما ضُبط، ولهذا صار الحدّ مضلّعًا.
    for (const [lat, lng] of [
      [24.7136, 46.6753], // الرياض
      [21.4858, 39.1925], // جدة
      [26.4207, 50.0888], // الدمام
      [27.0174, 49.6225], // الجبيل
      [18.2465, 42.5117], // أبها
      [16.8892, 42.5511], // جازان
      [24.0232, 38.1901], // ينبع
      [28.3838, 36.555], // تبوك
      [17.4924, 44.1277], // نجران
    ]) {
      expect(isInsideSaudi(lat, lng), `${lat},${lng} رُفض وهو داخل المملكة`).toBe(true);
    }
    for (const [lat, lng] of [
      [25.2048, 55.2708], // دبي
      [25.2854, 51.531], // الدوحة
      [26.2285, 50.586], // المنامة — أقربها إلى الساحل السعودي
      [29.3759, 47.9774], // الكويت
      [23.588, 58.3829], // مسقط
      [30.0444, 31.2357], // القاهرة
      [15.3694, 44.191], // صنعاء
    ]) {
      expect(isInsideSaudi(lat, lng), `${lat},${lng} قُبل وهو خارج المملكة`).toBe(false);
    }
  });

  it("الغياب ليس موقعًا — null/NaN مرفوضة لا مرسومة عند الصفر", () => {
    // بغير هذا تُسقَط الإحداثيات الغائبة عند (0,0) في خليج غينيا.
    expect(isInsideSaudi(null, null)).toBe(false);
    expect(isInsideSaudi(undefined, 46)).toBe(false);
    expect(isInsideSaudi(Number.NaN, 46)).toBe(false);
    expect(isInsideSaudi(0, 0)).toBe(false);
  });

  it("الإسقاط يبقى داخل إطار العرض لكل نقطة مقبولة", () => {
    for (const [lat, lng] of [
      [16, 34],
      [32.5, 56],
      [24.7136, 46.6753],
    ]) {
      const p = projectToViewBox(lat, lng);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(SAUDI_VIEWBOX.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(SAUDI_VIEWBOX.height);
    }
  });

  it("لا تعريف ثانٍ لحدود المملكة في أي خريطة", () => {
    // كان في `executive-map` تعريفٌ ثانٍ يقبل حتى العرض 33 بينما يقبل
    // المشترك 32.5 — نقطةٌ تُقبل في خريطة وتُرفض في أخرى.
    const map = read("src/routes/_authenticated/executive-map.tsx");
    expect(map).toContain("isInsideSaudi");
    expect(map).not.toMatch(/function isSaudiCoordinate/);
    expect(map).not.toMatch(/lat >= 16 && lat <=/);
  });

  it("خريطة نبض المناطق ترشّح قبل الرسم وتُعلن المرفوض", () => {
    const rpm = read("src/components/map/RegionPulseMap.tsx");
    expect(rpm).toContain("isInsideSaudi");
    // صفٌّ بإحداثيات خاطئة يجب أن يُرى لا أن يُبتلع.
    expect(rpm).toMatch(/outside > 0/);
  });
});

describe("البند ٣٠ — الرسم يشرح نفسه", () => {
  const map = read("src/routes/_authenticated/executive-map.tsx");
  const client = read("src/components/executive-map-client.tsx");
  const rpm = read("src/components/map/RegionPulseMap.tsx");

  it("للخريطة التنفيذية مفتاحان: الحجم واللون", () => {
    // الحجم كان مشروحًا واللون لا — ورسمٌ يحمل بُعدين ويشرح واحدًا يُقرأ
    // نصفه تخمينًا.
    expect(map).toMatch(/"اللون" : "Colour"/);
    expect(map).toMatch(/"مقر قيادة" : "Headquarters"/);
  });

  it("التوزيع على الإدارات معروض رقمًا", () => {
    expect(map).toMatch(/visible\.filter\(\(v\) => v\.region === r\.id\)\.length/);
  });

  it("«حرج» لا يُقال باللون وحده في أي من الخريطتين (WCAG 1.4.1)", () => {
    expect(client).toMatch(/dashArray:\s*s\.status === "critical"/);
    expect(rpm).toContain('data-health={s.health ?? "unknown"}');
    expect(read("src/styles.css")).toContain('.nx-rpm-site[data-health="critical"]');
  });

  it("أسماء طبقات الخريطة عربية في واجهة عربية أولًا", () => {
    expect(client).toMatch(/isAr \? "داكن" : "Dark"/);
  });

  it("لوحة النبض تحمل حالاتها الأربع", () => {
    for (const marker of ["loading", "error", "plotted.length === 0", "aria-busy"]) {
      expect(rpm, `الحالة «${marker}» مفقودة`).toContain(marker);
    }
  });
});

describe("البند ٢٥ — اسم الوكيل من مصدر واحد بمسمّى وظيفي", () => {
  it("لا قائمة أسماء ثانية في المحاكاة", () => {
    // كانت المحاكاة تحمل أحد عشر اسمًا خاصًّا بها تخالف السجل، فيرى
    // المستخدم الوكيل نفسه باسمين حسب الشاشة التي فتحها.
    const sim = code("src/lib/exec/showcase-simulation.server.ts");
    expect(sim).toContain("agentName(");
    for (const old of ["وكيل الصيانة", "وكيل الرصد", "وكيل التقارير", "وكيل المخاطر"]) {
      expect(sim, `اسمٌ خارج السجل: ${old}`).not.toContain(old);
    }
  });

  it("لا اسم وكيل بصفة تقنية بدل مسمّى وظيفي", () => {
    // «ذكاء الكاميرات» يصف كيف يعمل الوكيل؛ «مشغّل المراقبة التلفزيونية»
    // يصف دوره ومسؤوليته — وهذا ما يقرأه مدير أمن صناعي.
    for (const spec of DIGITAL_HUMANS) {
      expect(spec.name_ar, `${spec.id} يحمل صفة تقنية`).not.toMatch(/^ذكاء /);
    }
  });

  it("لكل وكيل اسم فريد غير فارغ", () => {
    const names = DIGITAL_HUMANS.map((h) => h.name_ar);
    expect(new Set(names).size, "اسمان متطابقان في السجل").toBe(names.length);
    for (const n of names) expect(n.trim().length).toBeGreaterThan(1);
  });

  it("البوابة ترمي عند مفتاح مجهول بدل أن تُظهر فراغًا", () => {
    // اسمٌ فارغ على الشاشة عطلٌ صامت؛ الرمي يكشفه في البناء لا عند العميل.
    expect(() => agentName("does_not_exist" as DigitalHumanId)).toThrow(/unknown digital human/);
    expect(agentName("patrol_commander")).toBe("قائد الدوريات");
  });
});
