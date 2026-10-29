/**
 * عقد بنية نواة الاسترجاع — خادمٌ فقط، بلا مزوّد، بلا تبعية، غير موصولة.
 *
 * ## ما يُحرس
 *
 * ١. كل وحدة تنفيذية تحت `src/lib/retrieval` تحمل اللاحقة `.server.ts`
 *    (المادة ٢٨(ز): لا يستوردها العميل؛ الميزانية تقيس `dist/client`).
 * ٢. لا نداء مزوّد ولا شبكة فيها: لا `fetch(` ولا `generateText(` ولا
 *    `googleapis`/`generativelanguage` ولا `node:https`/`undici`/`axios`/
 *    `XMLHttpRequest`/`WebSocket` ولا SDK نموذج — **ولا غلاف تضمين من المستودع
 *    نفسه** (`embeddings.server` · `gemini-embeddings` · `rag/embed.server` ·
 *    `embed(`/`embedMany(` من حزمة `ai`)، فالمنع بالاسم الرمزي وحده كان يمرّر
 *    استيراد غلافٍ يستدعي Gemini (حالة مزروعة). فتبقى خارج مفتاح الإيقاف
 *    بالتصميم لأنها ليست نداءً مدفوعًا، ويبقى حارس `ai-gate-internal` أخضر.
 *    **وحذف التعليقات قبل المسح لا يبتلع عنوان URL داخل سلسلة**: تعليق السطر
 *    يُحذف فقط حين يبدأ سطرًا أو يلي فراغًا أو `;{}(` — فـ`"https://…"` يبقى
 *    (كان `\/\/[^\n]*` يقصّ كل ما بعد `//` في السلسلة فلا يرى مضيف Google —
 *    حالة مزروعة تمرّ عبر دالّة الحذف نفسها لا على النصّ الخام).
 * ٣. لا ملف عميل يستوردها (كاشف يُثبت احمراره على مصدر مزروع، ساكنًا
 *    و**ديناميكيًّا** `import("…")` — فالاستيراد الكسول كان يمرّ).
 * ٤. مستهلكو النواة خارج `src/lib/retrieval` **قائمة صريحة مغلقة**: كانت
 *    فارغة في الخطوة ١، وأضافت الخطوة ٢ (٢٠٢٦/١٠/٢٩، الضوابط الأربعة) مسار
 *    الإجابة عبر `rag.server.ts` وأذرعه تحت `src/lib/sadeed/rag/` — كلّها
 *    `.server.ts`. أي مستهلك جديد يُضاف هنا باسمه أو يُدان؛ و`/api/chat` لا
 *    يستورد النواة مباشرةً (يصلها عبر `gatherRagContext` وحدها).
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = "src/lib/retrieval";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const FILES = walk(ROOT).filter((f) => f.endsWith(".ts"));
const RUNTIME = FILES.filter((f) => !/\.test\.ts$/.test(f) && !f.endsWith(`${ROOT}/types.ts`));

const PROVIDER_OR_NETWORK =
  /\bfetch\(|generateText\(|streamText\(|httpJson|googleapis|generativelanguage|node:https?\b|\bhttps?\.request\(|\bundici\b|\baxios\b|XMLHttpRequest|WebSocket|@ai-sdk\/|openai|@google\/|supabase|embeddings\.server|gemini-embeddings|rag\/embed\.server|ai-gateway\.server|from\s+["']ai["']|\bembed(?:Many)?\(/i;

/**
 * حذف التعليقات قبل المسح — تعليقات الكتل كلّها، وتعليق السطر فقط حين يبدأ
 * سطرًا أو يلي فراغًا أو `;{}(`، فلا يُقصّ `//` داخل سلسلة مثل `"https://…"`.
 * مستقلّة ليُجرَّب الكاشف على مصدر مزروع عبر المسار نفسه الذي يمسح الملفات.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;{}(])\/\/[^\n]*/gm, "$1");
}

/** الكاشف كما يُطبَّق على كل ملف تنفيذي: حذف التعليقات ثم المسح. */
function condemns(src: string): boolean {
  return PROVIDER_OR_NETWORK.test(stripComments(src));
}

/** كاشف الاستيراد من العميل — ساكن `from "…"` وديناميكي `import("…")`؛ مستقلّ ليُجرَّب على مصدر مزروع. */
function importsRetrieval(src: string): boolean {
  return /(?:from\s+|import\()\s*["'](?:@\/lib\/retrieval|\.{1,2}\/(?:\.\.\/)*retrieval)(?:\/|["'])/.test(
    src,
  );
}

/**
 * مستهلكو النواة خارج مجلدها — فارغة في الخطوة ١؛ الخطوة ٢ وصلت مسار الإجابة
 * بهذه الأربعة وحدها (خادمٌ فقط): المجمِّع يُستدعى من `rag.server.ts`، والأذرع
 * القاعدية والمتّجهية والرصد تحت `src/lib/sadeed/rag/`.
 */
const ALLOWED_CONSUMERS: readonly string[] = [
  "src/lib/sadeed/rag.server.ts",
  "src/lib/sadeed/rag/lexical-arms.server.ts",
  "src/lib/sadeed/rag/observe.server.ts",
  "src/lib/sadeed/rag/vector-arm.server.ts",
];

describe("① كل وحدة تنفيذية خادمٌ فقط", () => {
  it("المجموعة ليست فارغة، وكلها .server.ts", () => {
    expect(RUNTIME.length).toBeGreaterThanOrEqual(6);
    for (const f of RUNTIME) expect(f, f).toMatch(/\.server\.ts$/);
  });

  it("types.ts أنواع فقط — لا كود يُنفَّذ", () => {
    const src = readFileSync(`${ROOT}/types.ts`, "utf8");
    expect(src).not.toMatch(/^\s*(?:export\s+)?(?:const|let|function|class)\b/m);
    expect(src).not.toMatch(/^\s*import\b/m);
  });
});

describe("② لا مزوّد ولا شبكة ولا قاعدة ولا غلاف تضمين", () => {
  it.each(RUNTIME)("%s", (f) => {
    expect(condemns(readFileSync(f, "utf8"))).toBe(false);
  });

  it("مزروع: سطر `await fetch(` يُدان — عبر مسار الحذف ثم المسح", () => {
    expect(condemns('const r = await fetch("https://x");')).toBe(true);
  });

  it("مزروع: عنوان مضيف المزوّد داخل سلسلة يُدان — والحذف القديم كان يبتلعه بعد `//`", () => {
    const planted = 'const BASE = "https://generativelanguage.googleapis.com/v1beta";';
    expect(condemns(planted)).toBe(true);
    expect(condemns('const URL = "https://api.openai.com/v1";')).toBe(true);
    expect(condemns('const DB = "https://abc.supabase.co/rest/v1";')).toBe(true);
    const oldStrip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    expect(PROVIDER_OR_NETWORK.test(planted)).toBe(true);
    expect(PROVIDER_OR_NETWORK.test(oldStrip(planted))).toBe(false);
  });

  it("مزروع: عميل HTTP من Node أو حزمة شبكة يُدان", () => {
    expect(condemns('import { request } from "node:https";')).toBe(true);
    expect(condemns('import { request } from "node:http";')).toBe(true);
    expect(condemns("const r = https.request(BASE + m);")).toBe(true);
    expect(condemns('import { fetch as f } from "undici";')).toBe(true);
    expect(condemns('import axios from "axios";')).toBe(true);
    expect(condemns("const x = new XMLHttpRequest();")).toBe(true);
    expect(condemns('const ws = new WebSocket("wss://x");')).toBe(true);
  });

  it("مزروع: استيراد غلاف التضمين من المستودع أو `embed` من حزمة ai يُدان", () => {
    expect(condemns('import { embedText } from "@/lib/sadeed/embeddings.server";')).toBe(true);
    expect(condemns('import { embedOne } from "@/lib/sadeed/rag/embed.server";')).toBe(true);
    expect(condemns('import { embed } from "ai";')).toBe(true);
    expect(condemns("const v = await embedMany({ values });")).toBe(true);
    // وسطرٌ سليم لا يُدان: اسم متغيّر يحوي «embed» بلا نداء.
    expect(condemns("const embedded = tokens.length;")).toBe(false);
  });

  it("التعليقات ما زالت تُحذف: ذكر `fetch(` أو المضيف في تعليقٍ لا يُدان", () => {
    expect(condemns("const a = 1; // لا fetch( هنا ولا googleapis")).toBe(false);
    expect(condemns("// import axios from 'axios'\nconst a = 1;")).toBe(false);
    expect(condemns("/* generativelanguage.googleapis.com */ const a = 1;")).toBe(false);
    expect(condemns("const a = 1;// fetch(\nconst b = 2;")).toBe(false);
  });

  it("لا تبعية معجمية جديدة في package.json", () => {
    const pkg = readFileSync("package.json", "utf8");
    expect(pkg).not.toMatch(
      /"(?:minisearch|flexsearch|lunr|fuse\.js|@orama\/orama|wink-bm25-text-search)"/,
    );
  });
});

/**
 * كاشف المستهلكين كما يُطبَّق على الشجرة: كل ملف `.ts`/`.tsx` خارج `src/lib/retrieval`
 * وليس اختبارًا ويستورد النواة (`importsRetrieval`). مستقلّ عن `grep` كي يُجرَّب
 * على مدخل مزروع عبر المسار نفسه الذي يمسح الشجرة.
 */
function consumersOf(entries: ReadonlyArray<{ path: string; src: string }>): string[] {
  return entries
    .filter((e) => !e.path.startsWith(`${ROOT}/`) && !/\.test\.tsx?$/.test(e.path))
    .filter((e) => importsRetrieval(e.src))
    .map((e) => e.path)
    .sort();
}

describe("③ لا ملف عميل يستورد النواة، ④ ولا مستهلك خارج القائمة الصريحة", () => {
  const importers = execSync(
    'grep -rlE "(from |import\\()[[:space:]]*[\'\\"](@/lib/retrieval|\\.{1,2}/(\\.\\./)*retrieval)(/|[\'\\"])" src --include=*.ts --include=*.tsx || true',
    { encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean)
    .filter((f) => !f.startsWith(`${ROOT}/`));

  const TREE = walk("src")
    .filter((f) => /\.tsx?$/.test(f))
    .map((path) => ({ path, src: readFileSync(path, "utf8") }));

  it("المستهلكون خارج المجلد (عدا الاختبارات) = القائمة المسموحة بالضبط — بالكاشف وبـgrep معًا", () => {
    // الاختبارات تستورد النواة لتفحصها لا لتخدم بها — ليست مستهلكي مسار إجابة.
    const consumers = consumersOf(TREE);
    expect(consumers).toEqual([...ALLOWED_CONSUMERS].sort());
    expect(importers.filter((f) => !/\.test\.tsx?$/.test(f)).sort()).toEqual(consumers);
    // والقائمة ليست فارغة بعد الخطوة ٢: مسار الإجابة موصول فعلًا، لا بالادّعاء.
    expect(consumers).toContain("src/lib/sadeed/rag.server.ts");
  });

  it("مزروع: مستهلكٌ خامس خارج القائمة يُدان بالكاشف نفسه — القائمة مغلقة لا مفتوحة", () => {
    const planted = {
      path: "src/lib/sadeed-tools.server.ts",
      src: 'import type { Hit } from "@/lib/retrieval/types";\nexport const x = 1;\n',
    };
    const withPlant = consumersOf([...TREE.filter((e) => e.path !== planted.path), planted]);
    expect(withPlant).toContain(planted.path);
    expect(withPlant).not.toEqual([...ALLOWED_CONSUMERS].sort());
    // وملفٌ مزروع لا يستورد النواة لا يُدان — الكاشف يفرّق لا يدين الكلّ.
    expect(
      consumersOf([
        { path: "src/lib/x.server.ts", src: 'import { a } from "@/lib/rag/evaluation";' },
      ]),
    ).toEqual([]);
  });

  it("ولا مستهلك خارج .server.ts أو api/ أو اختبار", () => {
    for (const f of importers) {
      expect(f, f).toMatch(/\.server\.ts$|\.test\.tsx?$|^src\/routes\/api\//);
    }
  });

  it("مزروع: مكوّن عميل يستورد النواة يُدان بالكاشف — ساكنًا وديناميكيًّا", () => {
    expect(
      importsRetrieval(
        'import { seedCorpusArm } from "@/lib/retrieval/sources/seed-corpus.server";',
      ),
    ).toBe(true);
    expect(importsRetrieval('import { x } from "../retrieval/bm25.server";')).toBe(true);
    expect(
      importsRetrieval(
        'export const p = () => import("@/lib/retrieval/sources/seed-corpus.server");',
      ),
    ).toBe(true);
    expect(importsRetrieval('const m = await import("../retrieval/bm25.server");')).toBe(true);
    expect(importsRetrieval('import { x } from "@/lib/rag/evaluation";')).toBe(false);
  });

  it("مزروع: grep الشجرة يرى الاستيراد الديناميكي أيضًا", () => {
    // النمط نفسه المستعمل أعلاه، على نصّ مزروع عبر stdin.
    const out = execSync(
      'grep -cE "(from |import\\()[[:space:]]*[\'\\"](@/lib/retrieval|\\.{1,2}/(\\.\\./)*retrieval)(/|[\'\\"])"',
      {
        encoding: "utf8",
        input:
          'const p = () => import("@/lib/retrieval/bm25.server");\nimport { a } from "../retrieval/types";\n',
      },
    ).trim();
    expect(out).toBe("2");
  });

  it("/api/chat لا يستورد النواة ساكنًا ولا ديناميكيًّا — يصلها عبر gatherRagContext وحدها", () => {
    const chat = readFileSync("src/routes/api/chat.ts", "utf8");
    expect(importsRetrieval(chat)).toBe(false);
    expect(chat).toMatch(/import\("@\/lib\/sadeed\/rag\.server"\)/);
  });
});
