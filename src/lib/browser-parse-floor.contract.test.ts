/**
 * أرضية التحليل في المتصفح — `lookbehind` لا يبلغ العميل.
 *
 * ## لماذا هذا الحارس موجود
 *
 * `(?<=…)` و`(?<!…)` لم تصل Safari إلا في ١٦٫٤. وما قبلها **لا يرمي عند
 * التنفيذ** بل يفشل عند **تحليل الملف**: فتسقط الوحدة كاملةً قبل أن يجري
 * منها سطر، ويسقط معها كل ما يستوردها. لا `try/catch` يمسكه، ولا حدّ خطأ
 * يعرض رسالة — شاشةٌ صامتة.
 *
 * ولا يلتقطه شيء ممّا نملك: `tsc` يرى ES2022 فيقبله، و`esbuild` **لا
 * يستطيع** ترجمته إلى صيغة أقدم (لا مكافئ له)، وvitest يعمل على Node
 * الحديث فيمرّ، والمتصفح الذي نقيس عليه Chromium.
 *
 * وقع هذا فعلًا في `free-agent-speech.ts` — قطعُ جملٍ للنطق، في ملفٍ يبلغ
 * المتصفح عبر `sadeed-voice.ts`. أي أن «سَدِيد لا يتعطل» كانت معلَّقة على
 * إصدار متصفّح الزائر.
 *
 * ## القاعدة
 *
 * الحظر على ما يبلغ العميل وحده. الخادم يعمل على Node، وهناك
 * `lookbehind` أداةٌ مشروعة — وحدود الكلمة العربية تحتاجها فعلًا لأن `\b`
 * لاتينيّة لا تنطبق على تماسّ عربيّ/عربيّ.
 *
 * فما كان خادمًا يُستثنى، **ويُثبَت أنه خادم** بفحص كل مستورديه — لا
 * بالثقة في قائمة. فلو استورد مكوّنٌ يومًا `finalize.ts` سقط الفحص، وهو
 * بالضبط اليوم الذي يصير فيه المنع واجبًا.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
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

const FILES = walk(SRC);
const LOOKBEHIND = /\(\?<[=!]/;

/** ملفٌّ لا يُحزَم للعميل بحكم موضعه أو لاحقته. */
const isServerByPlacement = (rel: string) =>
  /\.server\.tsx?$/.test(rel) ||
  /\.functions\.tsx?$/.test(rel) ||
  rel.startsWith("src/routes/api/") ||
  rel.startsWith("src/lib/mcp/");

/**
 * ملفّات ليست موسومةً خادمًا بلاحقتها، لكن لا يستوردها إلا الخادم.
 * كل مدخل هنا يُتحقَّق منه أدناه بفحص المستوردين — القائمة إعلان نيّة،
 * والفحص هو الحجّة.
 */
const SERVER_ONLY_BY_IMPORTERS: Record<string, string> = {
  "src/lib/sadeed/output/finalize.ts":
    "تنقية مخرَج النموذج — تعمل في معالِجات /api و`.server` وحدها",
};

describe("لا `lookbehind` في ما يبلغ المتصفح", () => {
  // التعليقات تُنزع أوّلًا: التعليق الذي **يشرح** الحظر يكتب الرمز
  // المحظور، فيقرأ الحارس شرحه ويحسبه مخالفة — وقع هذا حرفيًّا هنا.
  const stripped = (f: string) =>
    readFileSync(f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");

  const offenders = FILES.filter((f) => LOOKBEHIND.test(stripped(f))).map((f) =>
    relative(ROOT, f).replace(/\\/g, "/"),
  );

  it("الفحص يقرأ شجرةً حقيقية — لا صفر ملفات", () => {
    // حارسٌ يمشي على قائمة فارغة يمرّ دائمًا.
    expect(FILES.length).toBeGreaterThan(200);
  });

  it("كل موضع `lookbehind` إمّا خادمٌ أو مُبرَّر", () => {
    const bad = offenders.filter(
      (rel) => !isServerByPlacement(rel) && !(rel in SERVER_ONLY_BY_IMPORTERS),
    );
    expect(
      bad,
      `\`(?<=\`/\`(?<!\` في ملفٍّ يبلغ العميل — خطأ تحليل على Safari دون ١٦٫٤ ` +
        `يُسقط الوحدة كلّها:\n  ${bad.join("\n  ")}`,
    ).toEqual([]);
  });

  it.each(Object.keys(SERVER_ONLY_BY_IMPORTERS))(
    "%s — لا يستورده إلا الخادم (وإلّا بطل الاستثناء)",
    (rel) => {
      // المستورِد يُعرَف بالمسار المستعار `@/lib/...` أو بمسارٍ نسبيّ ينتهي
      // بالاسم نفسه. يكفي البحث عن اسم الوحدة في سطر `import`.
      const moduleName = rel.replace(/^src\//, "@/").replace(/\.tsx?$/, "");
      const bare = rel
        .split("/")
        .pop()!
        .replace(/\.tsx?$/, "");
      const importers: string[] = [];

      for (const file of FILES) {
        const r = relative(ROOT, file).replace(/\\/g, "/");
        if (r === rel) continue;
        const src = readFileSync(file, "utf8");
        const hits = [...src.matchAll(/(?:import|from|import\()\s*\(?\s*["']([^"']+)["']/g)].map(
          (m) => m[1],
        );
        const touches = hits.some(
          (h) => h === moduleName || h.endsWith(`/${bare}`) || h === `./${bare}`,
        );
        if (!touches) continue;
        // استيراد النوع وحده يُمحى عند البناء فلا يحزم شيئًا.
        const typeOnly = new RegExp(`import\\s+type[^;]*["'][^"']*${bare}["']`, "s").test(src);
        if (typeOnly) continue;
        importers.push(r);
      }

      expect(importers.length, `لا مستورِد أصلًا — الاستثناء ميّت فليُحذف`).toBeGreaterThan(0);
      const clientSide = importers.filter((r) => !isServerByPlacement(r));
      expect(
        clientSide,
        `${rel} صار يبلغ العميل عبر:\n  ${clientSide.join("\n  ")}\n` +
          `فإمّا يُنزع منه \`lookbehind\` وإمّا يُنقل خلف حدّ خادم.`,
      ).toEqual([]);
    },
  );
});
