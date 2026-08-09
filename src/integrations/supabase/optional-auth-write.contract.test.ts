/**
 * الكتابة تحت `optionalSupabaseAuth` — مشروطةٌ بصاحبٍ للجلسة، دائمًا.
 *
 * ## ما الذي يحرسه هذا الملفّ
 *
 * عقيدة المشروع (الطبقة ٤) توجب أن تُقرأ نوافذ العرض بلا مصادقة:
 * «قراءات العرض تستخدم `optionalSupabaseAuth` … الكتابات فقط خلف
 * `requireSupabaseAuth`». وقد نُقلت ٢٩ دالّة إلى المسار الاختياري في
 * جلسة ٢٠٢٦/٠٨/٠٩.
 *
 * لكن ثلاثًا منها **تكتب**: تخزّن التقرير المولَّد أو الخلاصة في
 * `finn_reports`. وهذا مقبولٌ بشرطٍ واحد لا ثاني له: أن تكون الكتابة داخل
 * شرطٍ يتحقّق من `userId`. فبغيره تصير النقطة **سطح كتابةٍ مفتوحًا
 * لزائرٍ مجهول** — لا هجومًا معقّدًا، بل نداءً واحدًا بلا ترويسة.
 *
 * ## لماذا حارسٌ لا مراجعةً
 *
 * فحصتُ الثلاث يدويًّا فوجدتها مشروطةً فعلًا. والمراجعة اليدوية تصلح
 * لليوم وحده: من ينقل الدالّة التالية إلى `optionalSupabaseAuth` — وهو
 * تغييرٌ سطرٌ واحد يبدو قراءةً محضة — لن يقرأ هذا التعليق. فيُفحص
 * **الاقتران**: مسارٌ اختياريّ + كتابة ⇐ شرطُ `userId` واجب.
 *
 * والفحص يمشي على الشجرة كلّها لا على قائمة: قائمةٌ مكتوبة بأسماء الملفّات
 * تصير قديمةً بأوّل ملفٍّ جديد، وتمرّ خضراء وهي لا تعرفه.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules") continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const WRITE = /\.(insert|upsert|delete)\s*\(|\.update\s*\(\s*\{/g;
/** ما يثبت أن الكتابة تعرف صاحبها. */
const OWNER = /\buserId\b|\bcontext\.user\b|\brequireUser\b/;

/**
 * شروط `if` المحيطة بموضعٍ ما — تُقرأ بمكدّس أقواسٍ لا بنافذة أحرفٍ
 * سابقة. النافذة تُخدع بشرطٍ مجاورٍ انتهى قبل الكتابة؛ والمكدّس يجيب عن
 * السؤال الصحيح: **أيّ كتلةٍ أنا داخلها فعلًا.**
 */
function enclosingConditions(code: string, at: number): string[] {
  const open: number[] = [];
  for (let i = 0; i < at; i++) {
    const c = code[i];
    if (c === "{") open.push(i);
    else if (c === "}") open.pop();
  }
  return open
    .map((brace) => {
      const head = code.slice(Math.max(0, brace - 300), brace);
      const m = head.match(/\bif\s*\(([\s\S]*)$/);
      return m ? m[1] : "";
    })
    .filter(Boolean);
}

describe("لا كتابةَ لمجهول تحت `optionalSupabaseAuth`", () => {
  const FILES = walk(SRC);

  it("الفحص يقرأ شجرةً حقيقية", () => {
    expect(FILES.length).toBeGreaterThan(200);
  });

  const offenders: string[] = [];
  const audited: string[] = [];

  for (const file of FILES) {
    const raw = readFileSync(file, "utf8");
    if (!raw.includes("optionalSupabaseAuth")) continue;
    const code = strip(raw);
    const rel = relative(ROOT, file).replace(/\\/g, "/");

    for (const m of code.matchAll(/export const (\w+)\s*=\s*createServerFn/g)) {
      const start = m.index!;
      const next = code.indexOf("export const ", start + 10);
      const block = code.slice(start, next > 0 ? next : code.length);
      if (!block.includes(".middleware([optionalSupabaseAuth])")) continue;

      for (const w of block.matchAll(WRITE)) {
        audited.push(`${rel}::${m[1]}`);
        const guarded = enclosingConditions(block, w.index!).some((c) => OWNER.test(c));
        if (!guarded) offenders.push(`${rel}::${m[1]} — ${w[0].trim()}`);
      }
    }
  }

  it("الفحص وجد كتاباتٍ ليفحصها — وإلّا فهو يمرّ على فراغ", () => {
    // لو صفّرت الكتابات يومًا (وكلّها صارت خلف `requireSupabaseAuth`)
    // فهذا نجاحٌ لا عطل — لكن يُحذف الحارس عندئذٍ عمدًا، لا أن يبقى
    // يمرّ صامتًا على لا شيء ويُحسب تغطيةً.
    expect(audited.length, "لا كتابة تحت المسار الاختياري — فليُحذف هذا الحارس").toBeGreaterThan(0);
  });

  it("كل كتابة تحت المسار الاختياري مشروطة بـ`userId`", () => {
    expect(
      offenders,
      `كتابةٌ يبلغها زائرٌ مجهول (لا شرط userId يحيط بها):\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});
