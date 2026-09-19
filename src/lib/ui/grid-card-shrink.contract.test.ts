/**
 * بطاقات الشبكة تنكمش — العطل الذي لا يراه الترميز ولا المصرّف.
 *
 * ## ما وقع مرّتين
 *
 * بطاقةٌ داخل `grid` بلا `min-w-0`: و`min-width` الافتراضية لعنصر الشبكة
 * `auto`، فلا يصغر تحت **محتواه الأدنى**. فتتمدّد البطاقة إلى عرض أطول
 * نصٍّ فيها، وتنزلق خارج خليتها، ويخرج ما في طرفها من قاصّ البطاقة
 * الأكبر — فلا يُرى ولا يُنقر ولا يُبلَغ بتمرير.
 *
 * وقِيس في موضعين، وكلاهما كان يبدو محروسًا:
 * - `/sec/governance`: زرّ الحذف 68–98px خارج قاصّه — البطاقة 390px في
 *   خليةٍ 284.
 * - `/sec/projects`: شارة الحالة 679px خارج قاصّها — البطاقة 1055px في
 *   خليةٍ 343.
 *
 * **والخداع أن الداخل كان محروسًا في الحالتين:** `min-w-0` على العمود
 * و`truncate` على الاسم. لكنّ `truncate` لا يعمل على عنصرٍ لا يُضيَّق
 * أصلًا — فالحارس الداخليّ يبدو كافيًا وهو معطَّل من فوقه.
 *
 * ## ولماذا حارسٌ نصّيّ ضيّق لا مسحٌ عامّ
 *
 * فُحص النمط في متصفّحٍ حقيقيّ على عشرين موضعًا مرشَّحًا (‏`/sec/assets` ·
 * `/sec/cctv` · `/knowledge` · `/prompts` · `/portfolio` · `/boardroom` ·
 * `/health` · `/readiness` · `/crisis` وغيرها) فلم يقع إلا في الاثنين
 * أعلاه — المحتوى هو ما يقرّر، لا البنية وحدها. فقاعدة «كل بطاقة شبكة
 * يجب أن تحمل `min-w-0`» تُنتج تسعة عشر تعديلًا بلا عطل، وهو عين الترقيع
 * بلا قياس الذي يصنع هذا الصنف ابتداءً.
 *
 * فالمحروس هنا **الإصلاحان المقيسان** أن يُنزعا سهوًا. والتغطية الحقيقية
 * لما لم يُقَس مكانها فاحص الواجهة على الموقع الحيّ — وقد أُضيف المساران
 * إلى مساراته في `production-check.yml`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function code(p: string): string {
  return readFileSync(p, "utf8");
}

/**
 * صنف البطاقة المتكرّرة داخل شبكة، تُلتقط بمفتاحها `key={p.id}`.
 *
 * **ويُقرأ الوسم من `<` إلى `>` لا سطرًا واحدًا:** أوّل صياغةٍ بحثت عن
 * `"<div key={p.id}"` نصًّا متّصلًا، وprettier يوزّع السمات على أسطر متى
 * طالت — فسقط الحارس على تنسيقٍ لا على عطل. وحارسٌ يكسره منسّقُ الشيفرة
 * يُطفأ بعد مرّتين.
 */
function gridCardClass(src: string, key: string): string {
  const k = src.indexOf(key);
  expect(k, `لم يُعثر على «${key}» — أُعيدت صياغة البطاقة؟`).toBeGreaterThan(-1);
  const open = src.lastIndexOf("<", k);
  const tag = src.slice(open, src.indexOf(">", k));
  const cls = /className="([^"]*)"/.exec(tag)?.[1] ?? "";
  expect(cls, `لا className على البطاقة عند «${key}»`).not.toBe("");
  return cls;
}

describe("بطاقات الشبكة تنكمش — وإلا خرج طرفها خارج قاصّه", () => {
  it("بطاقة السياسات في /sec/governance", () => {
    const cls = gridCardClass(code("src/routes/_authenticated/governance.tsx"), "key={p.id}");
    expect(
      cls,
      "بلا `min-w-0` تتمدّد البطاقة إلى محتواها الأدنى ويخرج زرّ الحذف خارج " +
        "قاصّ NexusCard — لا يُرى ولا يُنقر. و`truncate` بالداخل لا ينفع " +
        "عنصرًا لا يُضيَّق.",
    ).toMatch(/\bmin-w-0\b/);
  });

  it("بطاقة المشاريع في /sec/projects", () => {
    const cls = gridCardClass(code("src/routes/_authenticated/sec.projects.tsx"), "key={p.id}");
    expect(cls, "نفس عطل الحوكمة حرفًا — قِيس 1055px في خليةٍ 343").toMatch(/\bmin-w-0\b/);
  });

  it("وفاحص الواجهة يزور المسارين على الموقع الحيّ", () => {
    // الحارس أعلاه نصّيّ: يمنع نزع الصنف، ولا يقيس بكسلًا. والقياس الحقيقيّ
    // في المتصفّح على الإنتاج — فإن سقط المساران من قائمة الفحص عاد العطل
    // بلا شاهد.
    const wf = code(".github/workflows/production-check.yml");
    for (const route of ["/sec/governance", "/sec/projects"]) {
      expect(wf, `${route} خارج مسارات فحص الإنتاج`).toContain(route);
    }
  });
});
