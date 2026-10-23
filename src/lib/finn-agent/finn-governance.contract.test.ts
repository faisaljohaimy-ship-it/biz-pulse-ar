// @vitest-environment node
/**
 * حارس عقد فِن — البنية والحدود والسطوح (لا سلوك وقت التشغيل؛ هذا في الاختبارات الأخرى).
 *
 * فكرة الملف: ما يُمنع هنا **سطرٌ يُكتب** لا نتيجةٌ تُقاس — استيرادُ ملف خادم من
 * واجهة، أو لونٌ صريح، أو `localStorage`، أو إسقاطُ الشريط التحذيري. هذه تراجعاتٌ صامتة
 * لا يكسر بها `tsc` ولا lint ولا اختبار سلوكي. فيقرأ الحارس المصدر نفسه.
 *
 * المادة ٣٠: كل كاشفٍ سلبيّ يُجرَّب أولًا على انتهاكٍ مزروع (قسم «إثبات الأداة» الأخير).
 */
import { existsSync, globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isRouteHidden } from "@/lib/nav/hidden-routes";
import { MODULES } from "@/lib/nav/modules";
import { FINN_NAV_ENTRY } from "@/lib/nav/owner-nav";
import { SCREEN_NAMES } from "@/lib/nav/screen-names";
import { SYSTEM_NAV, systemNavDestinations } from "@/lib/nav/system-nav";
import { ENV_CAPABILITIES, validateEnv } from "@/lib/env/env-manifest";
import { isSilentRoute, narrationFor } from "@/lib/sadeed/page-narrations";
import { FINN_BANNER_AR } from "./copy";
import { FINN_IDENTITY } from "./identity";

const read = (p: string) => readFileSync(p, "utf8");
const strip = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const UI_FILES = [
  ...globSync("src/components/finn/*.{ts,tsx}"),
  "src/routes/_authenticated/finn.tsx",
]
  .filter((f) => !/\.test\.tsx?$/.test(f))
  .sort();
const CLIENT_LIB_FILES = [
  "src/lib/finn-agent/client.ts",
  "src/lib/finn-agent/copy.ts",
  "src/lib/finn-agent/status.ts",
  "src/lib/finn-agent/identity.ts",
  "src/lib/finn-agent/limits.ts",
  "src/lib/finn-agent/messages.ts",
  "src/lib/finn-agent/stream-protocol.ts",
];
/** كل ما قد يُجمَّع في حزمة العميل. */
const CLIENT_FILES = [...UI_FILES, ...CLIENT_LIB_FILES];

describe("① السطوح الموجودة — القائمة ليست فارغة (المادة ٣٠)", () => {
  it("ملفات الواجهة والعميل مقروءة فعلًا", () => {
    expect(UI_FILES.length).toBeGreaterThanOrEqual(9);
    for (const f of CLIENT_FILES) expect(existsSync(f), f).toBe(true);
  });
});

describe("② الخادم: بوّابة المالك ثم مفتاح الإيقاف ثم الحدّ والحصّة", () => {
  const ROUTE = strip(read("src/routes/api/finn/chat.ts"));
  const handler = ROUTE.slice(ROUTE.indexOf("POST: async"));

  it("المالك أوّلًا — قبل مفتاح الإيقاف وقبل أي حدٍّ أو حصّة أو نموذج", () => {
    const owner = handler.indexOf("resolveFinnOwner(");
    const off = handler.indexOf("aiDisabledResponse(");
    expect(owner).toBeGreaterThan(-1);
    expect(off).toBeGreaterThan(-1);
    expect(owner).toBeLessThan(off);
    expect(handler).toMatch(/if \(!owner\.ok\) return finnNotFoundResponse\(\);/);
    expect(handler).toMatch(/if \(off\) return off;/);
    // وكلاهما قبل أول نداء شبكة/حدٍّ/حصّة في المعالج.
    const net = Math.min(
      ...["enforceRateLimit(", "enforceAiQuota(", "await fetch(", "handlePost("]
        .map((n) => handler.indexOf(n))
        .filter((i) => i > -1),
    );
    expect(off).toBeLessThan(net);
  });

  it("كل طريقةٍ غير POST ⇒ ANY ⇒ الـ404 نفسه", () => {
    expect(ROUTE).toMatch(/ANY:\s*async\s*\(\)\s*=>\s*finnNotFoundResponse\(\)/);
  });

  it("سطح الحصّة `finn` المستقلّ وبوّابتها كما يحرسها ai-quota.contract", () => {
    expect(ROUTE).toContain("enforceAiQuota");
    expect(ROUTE).toMatch(/surface:\s*"finn"/);
    expect(ROUTE).toMatch(/if \(quota\) return quota;/);
    expect(ROUTE).toMatch(/deadlineMs:\s*2_?000/);
  });

  it("الحصّة والحدّ بمفتاح فِن المستقلّ عن سَدِيد", () => {
    expect(FINN_IDENTITY.rateLimitKey).toBe("finn-chat");
    expect(FINN_IDENTITY.quotaIdentityPrefix).toBe("finn-chat");
    expect(ROUTE).toContain("FINN_IDENTITY.rateLimitKey");
    expect(ROUTE).toContain("FINN_IDENTITY.quotaIdentityPrefix");
  });

  it("المحرّك يفحص مفتاح الإيقاف قبل أي محاولة (دفاع ثانٍ)", () => {
    const engine = strip(read("src/lib/finn-agent/engine.server.ts"));
    const open = engine.slice(engine.indexOf("export async function openFinnChatStream"));
    expect(open.indexOf('assertAiEnabled("finn")')).toBeGreaterThan(-1);
    expect(open.indexOf('assertAiEnabled("finn")')).toBeLessThan(open.indexOf("openFinnReply("));
  });

  it("الجسم: messages وحدها تُقرأ — لا model/engine/system من الطلب", () => {
    expect(ROUTE).toContain("parseFinnRequestBody(");
    expect(ROUTE).not.toMatch(/body\.(model|engine|provider|system|temperature|maxOutputTokens)/);
    expect(ROUTE).not.toMatch(/headers\.get\(["'](x-finn|x-model|x-openai|x-sadeed-provider)/i);
    const engine = strip(read("src/lib/finn-agent/engine.server.ts"));
    expect(engine).not.toMatch(/headers\.get\(/);
    expect(engine).not.toMatch(/request\./);
  });

  it("لا أدوات تنفيذ: لا tools ولا toolChoice ولا stopWhen في نداء النموذج", () => {
    const engine = strip(read("src/lib/finn-agent/engine.server.ts"));
    expect(engine).not.toMatch(/\btools\s*:/);
    expect(engine).not.toMatch(/toolChoice|stopWhen|experimental_/);
    expect(engine).toContain("streamText(");
  });

  it("المفتاح من البيئة وحدها، ولا سجلّ لقيمته", () => {
    const engine = strip(read("src/lib/finn-agent/engine.server.ts"));
    expect(engine).toMatch(/env\.OPENAI_API_KEY/);
    expect(engine).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
    expect(engine).not.toMatch(/console\.\w+\([^)]*apiKey/);
    // الاستيراد ديناميكيّ لا ساكن.
    expect(engine).toMatch(/await import\("@ai-sdk\/openai"\)/);
    expect(engine).not.toMatch(/^import[^\n]*["']@ai-sdk\/openai["']/m);
    // الإعدادات مأخوذة من الخادم: النموذج من FINN_OPENAI_MODEL.
    expect(engine).toContain("FINN_OPENAI_MODEL");
    expect(engine).toContain("store: false");
  });

  it("الاستجابة تعلن المحرّك: X-FINN-Engine وX-FINN-Fallback", () => {
    expect(ROUTE).toMatch(/"X-FINN-Engine":\s*engine/);
    expect(ROUTE).toMatch(/"X-FINN-Fallback":\s*fallback/);
  });
});

describe("③ حدّ الحزمة: لا يصل العميل ملفُّ خادم ولا موجِّه ولا قائمة المالكين", () => {
  const SERVER_ONLY_IMPORT =
    /from\s+["'](?:@\/lib\/finn-agent|\.{1,2}\/[^"']*|@\/[^"']*)(?:\.server|\/prompt|\/engine\.server|\/owner-gate\.server)["']/;

  it.each(CLIENT_FILES)("%s لا يستورد ملف خادم ولا الموجِّه", (f) => {
    const code = strip(read(f));
    expect(code, `${f} يستورد ملف خادم`).not.toMatch(SERVER_ONLY_IMPORT);
    expect(code).not.toMatch(/from\s+["'][^"']*\/prompt["']/);
  });

  it("ملفات الواجهة لا تذكر متغيّرات الخادم ولا تقرأ process.env", () => {
    for (const f of CLIENT_FILES) {
      const code = strip(read(f));
      expect(code, f).not.toMatch(/FINN_OWNER_USER_IDS|OPENAI_API_KEY|process\.env/);
    }
  });

  it("الصفحة والمدخل وبطاقة الرئيسية يستوردون `access.functions` وحده من الخادم (دالة الخادم)", () => {
    // بطاقة الرئيسية (أمر المالك ٢٠٢٦/١٠/٢٣) حكمُها حكم المدخل نفسه: المالك وحده، من الخادم.
    const allowed = new Set([
      "src/routes/_authenticated/finn.tsx",
      "src/components/finn/FinnNavEntry.tsx",
      "src/components/finn/HomeFinnCard.tsx",
    ]);
    for (const f of CLIENT_FILES) {
      const uses = /finn-agent\/access\.functions/.test(strip(read(f)));
      expect(uses, f).toBe(allowed.has(f));
    }
  });

  it("دالة الخادم لا تعيد قائمة المعرّفات ولا قيمة المفتاح — منطقيّاتٌ واسم نموذج", () => {
    const src = strip(read("src/lib/finn-agent/access.functions.ts"));
    expect(src).toContain("optionalSupabaseAuth");
    expect(src).toMatch(/method:\s*"POST"/);
    expect(src).toContain("{ allowed: false }");
    expect(src).not.toMatch(/FINN_OWNER_USER_IDS|readFinnOwnerList|\.ids\b/);
    const status = strip(read("src/lib/finn-agent/status.ts"));
    expect(status).not.toMatch(/apiKey|OPENAI_API_KEY|ownerIds|userIds/i);
  });

  it("واجهة المحادثة تُحمَّل كسولًا بعد الحارس", () => {
    const page = strip(read("src/routes/_authenticated/finn.tsx"));
    expect(page).toMatch(/lazy\(\(\) => import\("@\/components\/finn\/FinnChat"\)\)/);
    expect(page).not.toMatch(/^import[^\n]*components\/finn\/FinnChat/m);
    // 404 الجذر نفسه لا كرت المسار (W5 #0): routeId الجذر، ولا notFoundComponent محلّي.
    expect(page).toMatch(/if \(!access\.allowed\) throw notFound\(\{ routeId: rootRouteId \}\);/);
    expect(page).not.toContain("notFoundComponent");
    expect(page).toContain("errorComponent: RouteError");
  });

  it("المدخل في الشريط لا يستورد الصفحة ولا المحادثة ولا Markdown", () => {
    const nav = strip(read("src/components/finn/FinnNavEntry.tsx"));
    expect(nav).not.toMatch(/FinnChat|FinnMarkdown|react-markdown|remark-gfm|use-finn-chat/);
  });
});

describe("④ الواجهة: الشريط التحذيري والمحظورات", () => {
  const CODE = Object.fromEntries(UI_FILES.map((f) => [f, strip(read(f))]));

  it("الشريط: النصّ الحرفيّ «يقترح ولا ينفّذ — راجع قبل أي تنفيذ»", () => {
    expect(FINN_BANNER_AR).toBe("يقترح ولا ينفّذ — راجع قبل أي تنفيذ");
    expect(CODE["src/components/finn/FinnBanner.tsx"]).toContain("FINN_BANNER_AR");
  });

  it("الشريط يُركَّب بلا شرط وخارج صندوق التمرير", () => {
    const chat = CODE["src/components/finn/FinnChat.tsx"];
    expect(chat).toMatch(/<FinnBanner\s*\/>/);
    const banner = chat.indexOf("<FinnBanner />");
    const scroller = chat.indexOf('role="log"');
    expect(banner).toBeGreaterThan(-1);
    expect(banner).toBeLessThan(scroller);
    // لا `&&` ولا `?` ولا `.map` يحيط به.
    const before = chat.slice(Math.max(0, banner - 120), banner);
    expect(before).not.toMatch(/&&\s*\(?\s*$|\?\s*\(?\s*$/);
    // ولا يملك خاصّة إخفاء: من فتح الغلاف حتى نصّ الشريط لا `hidden` ولا `sr-only`
    // ولا شفافية صفر. (تلميحٌ ثانويّ بعده قد يُخفى على الجوال — النصّ الأساسيّ لا.)
    const bannerSrc = CODE["src/components/finn/FinnBanner.tsx"];
    const toText = bannerSrc.slice(bannerSrc.indexOf("<div"), bannerSrc.indexOf("<strong"));
    expect(toText).not.toMatch(/(?<!aria-)\bhidden\b|display:\s*none|invisible|sr-only|opacity-0/);
    expect(bannerSrc).toMatch(/role="note"/);
  });

  it("الشريط يعرض مثلّث التحذير + النصّ (الدلالة بالشكل لا باللون وحده)", () => {
    expect(CODE["src/components/finn/FinnBanner.tsx"]).toContain("TriangleAlert");
  });

  it("لا iframe ولا speechSynthesis ولا صوت", () => {
    for (const [f, code] of Object.entries(CODE)) {
      expect(code, f).not.toMatch(
        /<iframe|speechSynthesis|SpeechSynthesisUtterance|new Audio\(|<audio|<video/i,
      );
    }
  });

  it("لا تخزين في المتصفح: المحادثة في ذاكرة الصفحة وحدها", () => {
    for (const f of CLIENT_FILES) {
      expect(strip(read(f)), f).not.toMatch(
        /localStorage|sessionStorage|indexedDB|document\.cookie|caches\./,
      );
    }
  });

  it("Markdown بـreact-markdown + remark-gfm وحدهما — لا streamdown/shiki/mermaid ولا HTML خام", () => {
    const md = CODE["src/components/finn/FinnMarkdown.tsx"];
    expect(md).toMatch(/from "react-markdown"/);
    expect(md).toMatch(/from "remark-gfm"/);
    for (const code of Object.values(CODE)) {
      expect(code).not.toMatch(
        /streamdown|shiki|mermaid|MessageResponse|rehype-raw|dangerouslySetInnerHTML/,
      );
    }
  });

  it("الروابط تُفتح بـrel=noopener noreferrer، والصور لا تُحمَّل", () => {
    const md = CODE["src/components/finn/FinnMarkdown.tsx"];
    expect(md).toContain('rel="noopener noreferrer"');
    expect(md).toMatch(/img\(\{ alt \}\)/);
    expect(md).not.toMatch(/<img\b/);
  });

  it("أهداف اللمس: كل زرّ وكل رابطٍ تفاعلي ≥ 44px (min-h-11)", () => {
    let checked = 0;
    for (const [f, code] of Object.entries(CODE)) {
      for (const open of ["<button", "<Link"]) {
        let from = 0;
        for (;;) {
          const at = code.indexOf(open, from);
          if (at < 0) break;
          const end = code.indexOf(open === "<button" ? "</button>" : "</Link>", at);
          const slice = code.slice(at, end < 0 ? at + 1500 : end);
          checked += 1;
          if (f.endsWith("FinnNavEntry.tsx")) {
            // أصناف الصفّ يمرّرها الشريط (ROW) — وهي تحمل min-h-11 (يُفحص أدناه).
            expect(slice, `${f}: رابط المدخل لا يقرأ classes.row`).toContain("classes.row");
          } else {
            // `min-h-11!` بعلامة الأهمية: قاعدة `pointer: fine` العامّة غير الطبقيّة
            // (`min-block-size: 40px` في styles.css) تغلب أدوات Tailwind الطبقيّة، فبلا
            // `!` يصير الزرّ 40px على الفأرة (قِيس على 1280) وهو دون الحدّ الدستوريّ.
            expect(slice, `${f}: ${open} بلا min-h-11!`).toMatch(/min-h-11!/);
          }
          from = at + open.length;
        }
      }
    }
    expect(checked, "لم يُفحص أي زر").toBeGreaterThanOrEqual(7);
    const row = /const ROW =\s*"([^"]+)"/.exec(read("src/components/nav/SystemSidebar.tsx"))?.[1];
    expect(row, "ROW في الشريط").toMatch(/min-h-11/);
  });

  it("الاتجاه RTL على جذر الصفحة، والكود ltr", () => {
    expect(CODE["src/components/finn/FinnChat.tsx"]).toMatch(/<section\s+dir="rtl"/);
    expect(CODE["src/components/finn/FinnCodeBlock.tsx"]).toMatch(/<pre\s+dir="ltr"/);
  });

  it("لا صفحة تسكرول أفقيًّا: كتل الكود والجداول تتمرّر داخل صندوقها", () => {
    expect(CODE["src/components/finn/FinnCodeBlock.tsx"]).toMatch(/overflow-x-auto/);
    expect(CODE["src/components/finn/FinnMarkdown.tsx"]).toMatch(/overflow-x-auto/);
    expect(CODE["src/components/finn/FinnChat.tsx"]).toMatch(/overflow-hidden/);
  });

  it("لا `sticky` ولا `fixed` للشريط: ثباتٌ بالتخطيط (درس الشريط العلوي)", () => {
    for (const [f, code] of Object.entries(CODE)) {
      expect(code, f).not.toMatch(/\bsticky\b|\bfixed\b/);
    }
  });
});

/** ألوانٌ خارج طبقة الرموز — تموت عند قلب الوضع (المادة ٣٤). */
function colourViolations(src: string): string[] {
  const code = strip(src);
  const out: string[] = [];
  const hex = /(?<![&\w-])#[0-9a-fA-F]{3,8}\b/g;
  const fn = /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/g;
  const palette =
    /\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|decoration|shadow|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?(?:\/\d+)?\b/g;
  const attr = /\b(?:fill|stroke|color|stopColor)=["'](?:white|black|#[0-9a-fA-F]+|rgb[^"']*)["']/g;
  for (const re of [hex, fn, palette, attr]) {
    for (const m of code.matchAll(re)) out.push(m[0].trim());
  }
  return out;
}

describe("⑤ لا لونَ خارج الرموز — الوضعان معًا (المادة ٣٤)", () => {
  it.each(UI_FILES)("%s", (f) => {
    expect(colourViolations(read(f))).toEqual([]);
  });

  it("وأقل ما يُستعمل: متغيّرات --ink/--surface/--tone في الواجهة فعلًا", () => {
    const all = UI_FILES.map((f) => read(f)).join("\n");
    for (const token of ["--ink)", "--surface)", "--hairline)", "--tone-amber)", "--tone-blue)"]) {
      expect(all, token).toContain(token);
    }
  });
});

describe("⑥ التنقّل والرواية", () => {
  it("المدخل خارج SYSTEM_NAV (عشرون) وخارج MODULES — لا يراه غير المالك", () => {
    expect(SYSTEM_NAV.length).toBe(20);
    expect(systemNavDestinations()).not.toContain("/finn");
    expect(MODULES.some((m) => m.to === "/finn")).toBe(false);
  });

  it("الاسم المعروض «فِن» / «FINN» من السجلّ الكانوني، والمدخل يقرؤه لا يكتبه", () => {
    expect(SCREEN_NAMES["/finn"]).toEqual({ ar: "فِن", en: "FINN" });
    expect(FINN_IDENTITY.name).toEqual({ ar: "فِن", en: "FINN" });
    const entry = strip(read("src/components/finn/FinnNavEntry.tsx"));
    expect(entry).toContain("screenNameAr(FINN_NAV_ENTRY.to)");
    expect(entry).not.toMatch(/["']فِن["']/);
  });

  it("الوجهة مسارٌ حيّ في الشجرة المولَّدة وغير محجوب", () => {
    const tree = read("src/routeTree.gen.ts");
    expect(FINN_NAV_ENTRY.to).toBe("/finn");
    expect(tree).toContain("'/finn'");
    expect(tree).toContain("'/api/finn/chat'");
    expect(isRouteHidden(FINN_NAV_ENTRY.to)).toBe(false);
    expect(existsSync("src/routes/_authenticated/finn.tsx")).toBe(true);
    expect(existsSync("src/routes/api/finn/chat.ts")).toBe(true);
  });

  it("الشريط الجانبي يركّب المدخل ويمرّر أصنافه، ولا يحكم هو على أحد", () => {
    const sidebar = strip(read("src/components/nav/SystemSidebar.tsx"));
    expect(sidebar).toContain("<FinnNavEntry");
    expect(sidebar).toMatch(/classes=\{\{ row: ROW, idle: ROW_IDLE, active: ROW_ACTIVE \}\}/);
    expect(sidebar).not.toMatch(/FINN_OWNER|isFinnOwner|getFinnAccess/);
  });

  it("المدخل لا يُرسم لغير المالك: يتحقّق من الخادم ويعيد null", () => {
    const entry = strip(read("src/components/finn/FinnNavEntry.tsx"));
    expect(entry).toContain("getFinnAccess");
    expect(entry).toMatch(/if \(!data\?\.allowed\) return null;/);
    expect(entry).toMatch(/if \(!user\) return null;/);
  });

  it("سَدِيد صامت على /finn (المادة ٢٢: صفٌّ أو تصنيفٌ صامت لكل شاشة حيّة)", () => {
    expect(isSilentRoute("/finn")).toBe(true);
    expect(narrationFor("/finn")).toBeNull();
    // ولم نُسكت شاشةً أخرى بالخطأ.
    expect(isSilentRoute("/sec")).toBe(false);
    expect(narrationFor("/sec")).not.toBeNull();
  });
});

describe("⑦ بيان البيئة", () => {
  const find = (name: string) =>
    ENV_CAPABILITIES.flatMap((c) => c.vars.map((v) => ({ cap: c, v }))).find(
      (x) => x.v.name === name,
    );

  it("FINN_OWNER_USER_IDS: خادمي، حسّاس، موثَّق، في قدرةٍ مطلوبة، بلا قيمة افتراضية", () => {
    const hit = find("FINN_OWNER_USER_IDS");
    expect(hit?.v.scope).toBe("server");
    expect(hit?.v.sensitive).toBe(true);
    expect(hit?.v.description.length).toBeGreaterThan(20);
    expect(hit?.cap.requirement).toBe("all");
    // غير مضبوط ⇒ القدرة متدهورة (لا أحد يدخل) — يُرى في تقرير الإقلاع.
    expect(validateEnv({}).degraded.map((s) => s.key)).toContain("finn-owner-gate");
    expect(validateEnv({ FINN_OWNER_USER_IDS: "x" }).degraded.map((s) => s.key)).not.toContain(
      "finn-owner-gate",
    );
  });

  it("OPENAI_API_KEY وFINN_OPENAI_MODEL: خادميّان، والمحرّك اختياري (الاحتياطي موجود)", () => {
    expect(find("OPENAI_API_KEY")?.v.scope).toBe("server");
    expect(find("OPENAI_API_KEY")?.v.sensitive).toBe(true);
    expect(find("FINN_OPENAI_MODEL")?.v.scope).toBe("server");
    expect(find("FINN_OPENAI_MODEL")?.cap.requirement).toBe("optional");
    // غياب المفتاح لا يُعدّ نقصًا — السقوط معلَن.
    expect(validateEnv({}).degraded.map((s) => s.key)).not.toContain("finn-engine");
  });

  it("لا متغيّر منها بادئته VITE_ (فلا يُحقن في العميل)", () => {
    for (const n of ["FINN_OWNER_USER_IDS", "OPENAI_API_KEY", "FINN_OPENAI_MODEL"]) {
      expect(n.startsWith("VITE_")).toBe(false);
      expect(find(n)?.v.scope).toBe("server");
    }
  });

  it(".env.example: الأسماء الثلاثة بلا قيم", () => {
    const env = read(".env.example");
    for (const n of ["FINN_OWNER_USER_IDS", "OPENAI_API_KEY", "FINN_OPENAI_MODEL"]) {
      const line = env.split("\n").find((l) => l.startsWith(`${n}=`));
      expect(line, `${n} غائب من .env.example`).toBeDefined();
      expect(line, n).toBe(`${n}=`);
    }
  });
});

describe("⑧ التوثيق: الاسم لا ينقض قرار ٢٠٢٦/٠٨/٠٩", () => {
  it("identity.ts يوثّق الأمر والفصل عن سَدِيد وعدم نقض القرار السابق", () => {
    const src = read("src/lib/finn-agent/identity.ts");
    expect(src).toContain("٢٠٢٦/١٠/٢٣");
    expect(src).toContain("٢٠٢٦/٠٨/٠٩");
    expect(src).toMatch(/منفصل عن سَدِيد/);
    expect(src).toMatch(/لا ينقض قرار/);
  });
});

describe("إثبات الأداة (المادة ٣٠): كل كاشفٍ سلبيّ يحمرّ على انتهاكٍ مزروع", () => {
  it("كاشف الألوان يلتقط الانتهاكات الأربعة ويترك الرموز", () => {
    expect(colourViolations('<div className="text-white bg-black/50" />')).toEqual([
      "text-white",
      "bg-black/50",
    ]);
    expect(colourViolations('<div className="border-red-500 text-slate-900" />')).toHaveLength(2);
    expect(colourViolations('const c = "#3AE8FF";')).toEqual(["#3AE8FF"]);
    expect(colourViolations('const c = "rgba(0,0,0,.5)";')).toHaveLength(1);
    expect(colourViolations('<svg fill="white" />')).toHaveLength(1);
    expect(
      colourViolations(
        '<div className="text-[color:var(--ink)] bg-[color-mix(in_srgb,var(--tone-amber)_12%,transparent)]" />',
      ),
    ).toEqual([]);
    // وتعليقٌ يسمّي المحظور لا يُدان (المادة ٣٠: الفحص يطابق الكود لا تعليقه).
    expect(colourViolations("// لا text-white هنا\n/* #fff */ const a = 1;")).toEqual([]);
  });

  it("كاشف الاستيراد الخادمي يلتقط استيرادًا مزروعًا", () => {
    const re =
      /from\s+["'](?:@\/lib\/finn-agent|\.{1,2}\/[^"']*|@\/[^"']*)(?:\.server|\/prompt|\/engine\.server|\/owner-gate\.server)["']/;
    expect(re.test('import { FINN_SYSTEM_PROMPT } from "@/lib/finn-agent/prompt";')).toBe(true);
    expect(re.test('import { x } from "./engine.server";')).toBe(true);
    expect(re.test('import { y } from "@/lib/finn-agent/owner-gate.server";')).toBe(true);
    expect(re.test('import { ok } from "@/lib/finn-agent/copy";')).toBe(false);
  });

  it("كاشف التخزين يلتقط localStorage ولا يلتقط شرحًا في تعليق", () => {
    const re = /localStorage|sessionStorage|indexedDB|document\.cookie|caches\./;
    expect(re.test(strip("localStorage.setItem('a','b')"))).toBe(true);
    expect(re.test(strip("// لا localStorage هنا\nconst a = 1;"))).toBe(false);
  });

  it("كاشف ترتيب البوّابة يحمرّ لو سبق مفتاحُ الإيقاف المالك", () => {
    const planted =
      'POST: async ({request}) => { const off = aiDisabledResponse("chat"); if (off) return off; const owner = await resolveFinnOwner(request); }';
    expect(planted.indexOf("resolveFinnOwner(")).toBeGreaterThan(
      planted.indexOf("aiDisabledResponse("),
    );
  });

  it("كاشف أهداف اللمس يلتقط زرًّا بلا min-h-11", () => {
    const code = '<button className="px-2">x</button>';
    expect(/min-h-11/.test(code.slice(code.indexOf("<button"), code.indexOf("</button>")))).toBe(
      false,
    );
  });
});
