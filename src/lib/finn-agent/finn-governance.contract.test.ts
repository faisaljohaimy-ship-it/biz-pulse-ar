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
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { isRouteHidden } from "@/lib/nav/hidden-routes";
import { MODULES } from "@/lib/nav/modules";
import { FINN_NAV_ENTRY } from "@/lib/nav/owner-nav";
import { SCREEN_NAMES } from "@/lib/nav/screen-names";
import { SYSTEM_NAV, systemNavDestinations } from "@/lib/nav/system-nav";
import { ENV_CAPABILITIES, validateEnv } from "@/lib/env/env-manifest";
import { ARM_DEADLINE_MS, RESEARCH_MODES } from "@/lib/n8n/protocol";
import { isSilentRoute, narrationFor } from "@/lib/sadeed/page-narrations";
import { FINN_BANNER_AR } from "./copy";
import { FINN_TOOL_LABEL_AR, FINN_TOOL_NAMES } from "./tool-names";
import { FINN_MAX_STEPS } from "./tools.server";
import { webResearchInputSchema } from "./web-research.server";
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
  "src/lib/finn-agent/tool-names.ts",
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

  it("أدوات القراءة وحدها (٢٠٢٦/١٠/٢٤): من buildFinnTools فقط، بسقف خطوات، بلا toolChoice ولا تجريبيّات", () => {
    const engine = strip(read("src/lib/finn-agent/engine.server.ts"));
    // كانت: «لا tools إطلاقًا». صارت: أدواتٌ من وحدةٍ واحدةٍ مقيّدةٍ بقراءةٍ فقط (انظر ⑨).
    expect(engine).toContain("buildFinnTools(");
    expect(engine).toMatch(/\btools:\s*settings\.tools/);
    expect(engine).toMatch(/stopWhen:\s*stepCountIs\(FINN_MAX_STEPS\)/);
    expect(engine).not.toMatch(/toolChoice|experimental_/);
    // لا أداةٌ تُعرَّف داخل المحرّك نفسه: التعريف في tools.server.ts وحده.
    expect(engine).not.toMatch(/\btool\(\s*\{/);
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
    // ومدخل `/fnn` المستقل (فرع المالك ٢٠٢٦/١٠/٢٩ `fix/fnn-native-google-20261029`): صفحةٌ عامّة
    // تتحقّق من الملكية بدالة الخادم نفسها قبل فتح الدردشة — حكمها حكم الصفحة.
    const allowed = new Set([
      "src/routes/_authenticated/finn.tsx",
      "src/components/finn/FinnNavEntry.tsx",
      "src/components/finn/HomeFinnCard.tsx",
      "src/components/finn/FnnWorkspace.tsx",
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
    // الجذر `section` في الصفحة و`div` في البطاقة المضمَّنة (`Root`) — والاتجاه على الجذر في الحالين.
    expect(CODE["src/components/finn/FinnChat.tsx"]).toMatch(/<Root\s+dir="rtl"/);
    expect(CODE["src/components/finn/FinnChat.tsx"]).toMatch(/inline \? "div" : "section"/);
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
  it("المدخل خارج SYSTEM_NAV (اثنا عشر) وخارج MODULES — لا يراه غير المالك", () => {
    // اثنا عشر منذ أمر المالك ٢٠٢٦/١٠/٢٩ («من النافذه فقط») — كانت عشرين.
    expect(SYSTEM_NAV.length).toBe(12);
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

/**
 * المجموعة المغلقة كما أقرّها المالك: **خمسٌ بالاسم** (ثلاثٌ منذ ٢٠٢٦/١٠/٢٤، والرابعة
 * `knowledge_search` والخامسة `web_research` ٢٠٢٦/١٠/٣٠). مكتوبةٌ هنا حرفيًّا لا مشتقّةً من
 * `FINN_TOOL_NAMES`: لو اشتُقّت لمرّ تعديلُ القائمة والتسجيل معًا بصمت. تغييرها قرارٌ يُعدَّل هنا عمدًا
 * ومعه الموجِّه (`prompt.ts`).
 */
const PINNED_TOOLS = [
  "github_activity",
  "knowledge_search",
  "platform_status",
  "vercel_deployments",
  "web_research",
] as const;

/** فروق المجموعة المسجَّلة والقائمة المعلَنة عن المثبَّتة: زائدٌ وناقصٌ وعدد. فارغةٌ = سليمة. */
function toolSetDrift(
  registered: readonly string[],
  declared: readonly string[],
  pinned: readonly string[] = PINNED_TOOLS,
): string[] {
  const reg = [...registered].sort();
  const dec = [...declared].sort();
  const pin = [...pinned].sort();
  const out: string[] = [];
  for (const name of reg) if (!pin.includes(name)) out.push(`زائد في التسجيل: ${name}`);
  for (const name of pin) if (!reg.includes(name)) out.push(`ناقص من التسجيل: ${name}`);
  for (const name of dec) if (!pin.includes(name)) out.push(`زائد في القائمة المعلَنة: ${name}`);
  for (const name of pin) if (!dec.includes(name)) out.push(`ناقص من القائمة المعلَنة: ${name}`);
  if (reg.length !== pin.length) out.push(`عدد المسجَّل ${reg.length} ≠ ${pin.length}`);
  return out;
}

/** وحدات الأداة: كلّها تُمسح بالكاشف نفسه (لا كتابة ولا تنفيذ ولا قاعدة ولا مضيفٌ خارج القائمة). */
const TOOL_MODULE_FILES = [
  "src/lib/finn-agent/tools.server.ts",
  "src/lib/finn-agent/knowledge-search.server.ts",
  "src/lib/finn-agent/local-reply.server.ts",
] as const;

/** مواصفات الاستيراد القيمي في مصدرٍ: بلا `import type`، وبالديناميكي والتصدير المعاد. */
function valueImportSpecifiers(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(
    /(?:^|\n)\s*(?:import|export)\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/g,
  )) {
    if (!m[1]) out.push(m[3]);
  }
  for (const m of src.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g)) out.push(m[1]);
  for (const m of src.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]);
  return out;
}

/** استيراداتُ أداة المعرفة المسموحة بالضبط — الفهرس الداخلي وحده. أي غيرها (قاعدة · ذراع قاعدية · تضمين) يُدان. */
const KNOWLEDGE_ALLOWED_IMPORTS: readonly string[] = [
  "@/lib/retrieval/sources/seed-corpus.server",
  "@/lib/retrieval/types",
  "@/lib/sadeed/rag/sanitize.server",
  "./secret-shapes",
];
const knowledgeImportViolations = (src: string): string[] =>
  [...src.matchAll(/(?:from\s+|import\()\s*["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((spec) => !KNOWLEDGE_ALLOWED_IMPORTS.includes(spec));

/** يحلّ مواصفة استيراد داخلية (`@/…` أو نسبية) إلى ملفّ مصدر، أو `null` للحزم الخارجية. */
function resolveInternal(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith(".")) base = join(dirname(from), spec);
  else return null;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base]) {
    if (existsSync(candidate) && /\.tsx?$/.test(candidate)) return candidate;
  }
  return null;
}

/** إغلاق الاستيراد القيمي من ملفّ — الملفات التي قد تُنفَّذ فعلًا حين تُحمَّل الوحدة. */
function valueImportClosure(entry: string, read_: (p: string) => string = read): string[] {
  const seen = new Set<string>([entry]);
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift()!;
    for (const spec of valueImportSpecifiers(strip(read_(file)))) {
      const next = resolveInternal(file, spec);
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return [...seen].sort();
}

/** ما يُدان داخل أي ملفٍّ في إغلاق أداة المعرفة: قاعدةٌ أو شبكةٌ أو مزوّد (استيرادًا قيميًّا أو نداءً). */
const CLOSURE_FORBIDDEN_SPEC =
  /supabase|client\.server|integrations\/|^ai$|@ai-sdk|node:https?|node:net|undici|axios|embeddings|gemini|googleapis|lexical-arms|vector-arm/i;
const CLOSURE_FORBIDDEN_CALL = /\bfetch\(|\bhttpJson\b|\bcreateClient\(|\bsupabaseAdmin\b/;
function closureViolations(
  files: readonly string[],
  read_: (p: string) => string = read,
): string[] {
  const out: string[] = [];
  for (const file of files) {
    const code = strip(read_(file));
    for (const spec of valueImportSpecifiers(code)) {
      if (CLOSURE_FORBIDDEN_SPEC.test(spec)) out.push(`${file}: استيراد ${spec}`);
    }
    const call = CLOSURE_FORBIDDEN_CALL.exec(code);
    if (call) out.push(`${file}: ${call[0]}`);
  }
  return out;
}

/**
 * موضع الرد المحلّي في المسار: بعد فحص الجسم، قبل الحدّ والحصّة والمحرّك، وكتلته لا تنفق شيئًا
 * ولا تردّ 503، وتعلن `X-FINN-Engine` بقيمة الرد المحلّي. فارغةٌ = سليمة.
 */
function localReplyPlacementProblems(handlePost: string): string[] {
  const at = (needle: string) => handlePost.indexOf(needle);
  const out: string[] = [];
  const order = [
    "parseFinnRequestBody(",
    "openFinnLocalReply(",
    "enforceRateLimit(",
    "enforceAiQuota(",
    "openFinnChatStream(",
  ];
  const positions = order.map(at);
  if (positions.some((i) => i < 0)) out.push("نداءٌ مفقود من الترتيب");
  else if (positions.some((p, i) => i > 0 && p <= positions[i - 1])) out.push("ترتيب النداءات");
  const start = at("if (!finnHasAnyEngine()) {");
  const end = start < 0 ? -1 : handlePost.indexOf("\n  }\n", start);
  if (start < 0 || end < 0) {
    out.push("كتلة فحص المحرّك مفقودة");
    return out;
  }
  const block = handlePost.slice(start, end);
  if (/enforceRateLimit\(|enforceAiQuota\(|openFinnChatStream\(/.test(block)) {
    out.push("الكتلة تنفق حدًّا أو حصّة أو محرّكًا");
  }
  if (/finnError\(\s*503/.test(block)) out.push("الكتلة ما زالت تردّ 503");
  if (!/"X-FINN-Engine":\s*FINN_LOCAL_ENGINE_HEADER/.test(block))
    out.push("بلا ترويسة المحرّك المحلّي");
  return out;
}

/** كل طريقةٍ غير GET، أو مضيفٌ خارج القائمة المغلقة، أو واجهة تنفيذٍ/كتابة. */
const toolViolations = (code: string): string[] => {
  const out: string[] = [];
  for (const m of code.matchAll(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/gi)) out.push(m[0]);
  for (const m of code.matchAll(/https?:\/\/[A-Za-z0-9.-]+/g)) {
    if (!["https://api.github.com", "https://api.vercel.com"].includes(m[0])) out.push(m[0]);
  }
  for (const m of code.matchAll(
    /child_process|\bexecSync?\b|\bspawn\b|\beval\(|new Function|writeFile|supabaseAdmin|client\.server|createClient|\.insert\(|\.update\(|\.delete\(|\.rpc\(/g,
  )) {
    out.push(m[0]);
  }
  return out;
};

describe("⑨ أدوات فِن: قراءةٌ فقط، مضيفان ثابتان، بلا تنفيذ (٢٠٢٦/١٠/٢٤)", () => {
  const TOOLS = strip(read("src/lib/finn-agent/tools.server.ts"));

  it("وحدات الأداة نظيفة: لا كتابة ولا تنفيذ ولا قاعدة ولا مضيفٌ خارج القائمة (الأداة الرابعة مشمولة)", () => {
    for (const f of TOOL_MODULE_FILES) {
      expect(existsSync(f), f).toBe(true);
      expect(toolViolations(strip(read(f))), f).toEqual([]);
    }
    // والقائمة ليست فارغة (المادة ٣٠): ثلاث وحداتٍ بالضبط تُمسح.
    expect(TOOL_MODULE_FILES).toHaveLength(3);
  });

  it("القراءة بـGET وحده وبلا تتبّع تحويلات، وبمهلةٍ وسقف حجم", () => {
    expect(TOOLS).toMatch(/method:\s*"GET"/);
    expect(TOOLS).toMatch(/redirect:\s*"error"/);
    expect(TOOLS).toContain("AbortSignal.timeout(FINN_TOOL_TIMEOUT_MS)");
    expect(TOOLS).toContain("MAX_BODY_CHARS");
  });

  it("المستودع ثابتٌ في الكود لا يأتي من النموذج، والمدخلات مخطَّطة (تعداداتٌ وsha سداسيّ)", () => {
    expect(TOOLS).toContain('FINN_GITHUB_REPO = "faisaljohaimy-ship-it/biz-pulse-ar"');
    expect(TOOLS).toMatch(
      /z\.enum\(\["recent_commits", "open_pull_requests", "checks_for_commit"\]\)/,
    );
    expect(TOOLS).toMatch(/regex\(\/\^\[0-9a-fA-F\]\{7,40\}\$\/\)/);
    // لا يُبنى مسارٌ أو استعلامٌ من نصٍّ حرّ: `url` لا يحمل متغيّرًا من المدخل إلا sha مُرمَّزًا.
    expect(TOOLS).toContain("encodeURIComponent(input.sha)");
  });

  it("المفاتيح من بيئة الخادم وحدها، لا تُسجَّل ولا تُعاد، والتدقيق اسمٌ ونتيجةٌ وزمنٌ فقط", () => {
    expect(TOOLS).toMatch(/env\.FINN_GITHUB_TOKEN/);
    expect(TOOLS).toMatch(/env\.FINN_VERCEL_TOKEN/);
    expect(TOOLS).not.toMatch(/console\.\w+\([^)]*(token|Authorization|headers)/i);
    expect(TOOLS).toMatch(/audit:\s*\(entry\)\s*=>\s*console\.info\("\[finn\] tool", entry\)/);
  });

  it("المسجَّل في المجموعة = القائمة المغلقة = المثبَّت حرفيًّا: خمسٌ بالضبط (لا زائدة ولا ناقصة)", async () => {
    const { registeredFinnToolNames } = await import("./tools.server");
    const names = registeredFinnToolNames(() => ({
      gpt: false,
      gptModel: "x",
      fallback: false,
      paused: false,
    }));
    expect(names).toEqual([...FINN_TOOL_NAMES].sort());
    expect(names).toEqual([...PINNED_TOOLS]);
    expect(toolSetDrift(names, FINN_TOOL_NAMES)).toEqual([]);
  });

  it("مزروع: أداةٌ خامسة تظهر في التسجيل أو في القائمة المعلَنة ⇒ الحارس يحمرّ", () => {
    const names = [...PINNED_TOOLS];
    expect(toolSetDrift([...names, "run_shell"], FINN_TOOL_NAMES)).toEqual([
      "زائد في التسجيل: run_shell",
      "عدد المسجَّل 6 ≠ 5",
    ]);
    expect(toolSetDrift(names, [...FINN_TOOL_NAMES, "run_shell"])).toEqual([
      "زائد في القائمة المعلَنة: run_shell",
    ]);
  });

  it("مزروع: الرابعة أو الخامسة تختفي من التسجيل أو من القائمة المعلَنة ⇒ الحارس يحمرّ", () => {
    const withoutFourth = PINNED_TOOLS.filter((n) => n !== "knowledge_search");
    expect(toolSetDrift(withoutFourth, FINN_TOOL_NAMES)).toEqual([
      "ناقص من التسجيل: knowledge_search",
      "عدد المسجَّل 4 ≠ 5",
    ]);
    expect(toolSetDrift(PINNED_TOOLS, withoutFourth)).toEqual([
      "ناقص من القائمة المعلَنة: knowledge_search",
    ]);
    const withoutFifth = PINNED_TOOLS.filter((n) => n !== "web_research");
    expect(toolSetDrift(withoutFifth, FINN_TOOL_NAMES)).toEqual([
      "ناقص من التسجيل: web_research",
      "عدد المسجَّل 4 ≠ 5",
    ]);
    expect(toolSetDrift(PINNED_TOOLS, withoutFifth)).toEqual([
      "ناقص من القائمة المعلَنة: web_research",
    ]);
    // وبدّلنا اسمًا باسم (العدد سليم والمجموعة غير المقرّة) ⇒ زائدٌ وناقصٌ معًا.
    expect(toolSetDrift([...withoutFourth, "other_tool"], FINN_TOOL_NAMES)).toEqual([
      "زائد في التسجيل: other_tool",
      "ناقص من التسجيل: knowledge_search",
    ]);
  });

  it("كل أداةٍ تُنفَّذ عبر audited() وحده — لا execute يتجاوز التدقيق", () => {
    const executes = [...TOOLS.matchAll(/execute:\s*(\w+)\(/g)].map((m) => m[1]);
    expect(executes).toEqual(PINNED_TOOLS.map(() => "audited"));
    // مزروع: execute مباشر بلا audited يظهر في الاستخراج نفسه.
    const planted =
      'tool({ execute: async () => ({ ok: true }) }), tool({ execute: audited("x") })';
    expect([...planted.matchAll(/execute:\s*(\w+)\(/g)].map((m) => m[1])).toEqual(["audited"]);
    expect([...planted.matchAll(/execute:\s*(async|audited)\b/g)].map((m) => m[1])).toEqual([
      "async",
      "audited",
    ]);
  });

  it("سجلّ التدقيق اسمُ الأداة والنتيجة والزمن فقط — لا الاستعلام ولا المدخلات", () => {
    expect(TOOLS).toMatch(
      /deps\.audit\(\{\s*tool:\s*name,\s*ok:\s*result\.ok,\s*ms:\s*Date\.now\(\)\s*-\s*started\s*\}\)/,
    );
    expect(TOOLS).not.toMatch(/deps\.audit\(\{[^}]*(input|query|result\.items)/);
  });

  it("الأدوات لا يستوردها غير المحرّك، ولا يصلها العميل", () => {
    const importers = globSync("src/**/*.{ts,tsx}").filter(
      (f) =>
        !/\.test\.tsx?$/.test(f) &&
        f !== "src/lib/finn-agent/tools.server.ts" &&
        /finn-agent\/tools\.server|from\s+["']\.\/tools\.server["']/.test(read(f)),
    );
    expect(importers).toEqual(["src/lib/finn-agent/engine.server.ts"]);
  });

  it("أداة المعرفة لا يستوردها غير tools.server.ts، والرد المحلّي لا يستورده غير المحرّك", () => {
    const importersOf = (re: RegExp, self: string) =>
      globSync("src/**/*.{ts,tsx}")
        .filter((f) => !/\.test\.tsx?$/.test(f) && f !== self && re.test(read(f)))
        .sort();
    expect(
      importersOf(/knowledge-search\.server/, "src/lib/finn-agent/knowledge-search.server.ts"),
    ).toEqual(["src/lib/finn-agent/tools.server.ts"]);
    expect(importersOf(/local-reply\.server/, "src/lib/finn-agent/local-reply.server.ts")).toEqual([
      "src/lib/finn-agent/engine.server.ts",
    ]);
  });

  it("أداة المعرفة تستورد الفهرس الداخلي وحده: قائمة استيراداتها بيضاء (لا قاعدة ولا ذراع قاعدية ولا تضمين)", () => {
    const src = strip(read("src/lib/finn-agent/knowledge-search.server.ts"));
    expect(knowledgeImportViolations(src)).toEqual([]);
    // وهي تستدعي الفهرس الداخلي فعلًا (المادة ٣٠: الفحص لا يمرّ على ملفٍّ فارغ).
    expect(src).toContain("searchSeedCorpus(");
    expect(src).toContain("@/lib/retrieval/sources/seed-corpus.server");
  });

  it("مزروع: استيرادُ ذراع قاعدية أو عميل قاعدة أو مضيفٍ أو تضمينٍ في أداة المعرفة ⇒ يُدان", () => {
    for (const planted of [
      'import { lexicalArms } from "@/lib/sadeed/rag/lexical-arms.server";',
      'import { supabaseAdmin } from "@/integrations/supabase/client.server";',
      'import { createClient } from "@supabase/supabase-js";',
      'import { embedText } from "@/lib/sadeed/embeddings.server";',
      'const m = await import("@/lib/sadeed/rag/vector-arm.server");',
    ]) {
      expect(knowledgeImportViolations(planted), planted).toHaveLength(1);
    }
    expect(
      knowledgeImportViolations('import { x } from "@/lib/retrieval/sources/seed-corpus.server";'),
    ).toEqual([]);
  });

  it("إغلاق الاستيراد القيمي لأداة المعرفة (الفهرس + المعقِّم + البيانات) بلا قاعدة ولا شبكة ولا مزوّد", () => {
    const closure = valueImportClosure("src/lib/finn-agent/knowledge-search.server.ts");
    // الأرضية: الإغلاق يشمل الفهرس والمتن فعلًا، وإلا لم يُفحص شيء.
    for (const f of [
      "src/lib/finn-agent/knowledge-search.server.ts",
      "src/lib/retrieval/sources/seed-corpus.server.ts",
      "src/lib/retrieval/bm25.server.ts",
      "src/lib/rag/evaluation.ts",
      "src/lib/sadeed/seed-corpus.data.ts",
      "src/lib/sadeed/rag/sanitize.server.ts",
    ]) {
      expect(closure, f).toContain(f);
    }
    expect(closure.length).toBeGreaterThanOrEqual(8);
    expect(closureViolations(closure)).toEqual([]);
  });

  it("مزروع: ملفٌّ في الإغلاق يستورد عميل قاعدة قيميًّا أو ينادي fetch ⇒ يُدان؛ و`import type` وحده لا يُدان", () => {
    const files: Record<string, string> = {
      "a.ts": 'import { x } from "./b";\nimport type { C } from "@supabase/supabase-js";',
      "b.ts": 'import { createClient } from "@supabase/supabase-js";\nexport const x = 1;',
      "c.ts": "export const y = await fetch(url);",
    };
    const fake = (p: string) => files[p] ?? "";
    // المحلّل يعمل على الأسماء النسبية الحقيقية؛ نُمرّر الإغلاق مكتوبًا لاختبار الكاشف وحده.
    expect(closureViolations(["a.ts", "b.ts", "c.ts"], fake)).toEqual([
      "b.ts: استيراد @supabase/supabase-js",
      "c.ts: fetch(",
    ]);
    // `import type` وحده (كما في sanitize.server.ts) لا يظهر استيرادًا قيميًّا.
    expect(valueImportSpecifiers('import type { C } from "@supabase/supabase-js";')).toEqual([]);
    expect(valueImportSpecifiers('import { C } from "@supabase/supabase-js";')).toEqual([
      "@supabase/supabase-js",
    ]);
    expect(valueImportSpecifiers('const m = await import("./lazy");')).toEqual(["./lazy"]);
  });

  it("الرد المحلّي في المسار: بعد فحص الجسم، قبل الحدّ والحصّة والمحرّك، بلا إنفاق ولا 503، وبترويسته", () => {
    const route = strip(read("src/routes/api/finn/chat.ts"));
    const post = route.slice(
      route.indexOf("async function handlePost"),
      route.indexOf("export const Route"),
    );
    expect(localReplyPlacementProblems(post)).toEqual([]);
    // وقيمة الترويسة «local» وحدها، وليست اسم محرّك نموذج.
    expect(strip(read("src/lib/finn-agent/engine.server.ts"))).toMatch(
      /FINN_LOCAL_ENGINE_HEADER\s*=\s*"local"/,
    );
    // مسار ما بعد الفتح باقٍ كما كان (محرّكٌ مهيّأ تُخطّيت محاولاتُه كلّها): 503 no_engine.
    expect(post).toMatch(/case "no_engine":\s*return finnError\(503, "no_engine"/);
  });

  it("مزروع: الرد المحلّي بعد الحدّ، أو كتلته تنفق حصّة، أو تردّ 503، أو بلا ترويسة ⇒ يُدان", () => {
    const good = [
      "  const parsed = parseFinnRequestBody(body);",
      "  if (!finnHasAnyEngine()) {",
      "    const local = await openFinnLocalReply(parsed.messages);",
      '    return sseResponse(local.events, { "X-FINN-Engine": FINN_LOCAL_ENGINE_HEADER }, f);',
      "  }",
      "  rate = await enforceRateLimit(key);",
      "  const quota = await enforceAiQuota(opts);",
      "  opened = await openFinnChatStream(messages, signal);",
      "",
    ].join("\n");
    // سليمة.
    expect(localReplyPlacementProblems(good)).toEqual([]);
    // الحدّ قبل الرد المحلّي.
    const moved = good.replace("  rate = await enforceRateLimit(key);\n", "");
    const rateFirst = moved.replace(
      "  if (!finnHasAnyEngine()) {",
      "  rate = await enforceRateLimit(key);\n  if (!finnHasAnyEngine()) {",
    );
    expect(localReplyPlacementProblems(rateFirst)).toContain("ترتيب النداءات");
    // كتلة تنفق حصّة.
    const spends = good.replace(
      "    const local",
      "    await enforceAiQuota(opts);\n    const local",
    );
    expect(localReplyPlacementProblems(spends)).toContain("الكتلة تنفق حدًّا أو حصّة أو محرّكًا");
    // كتلة ما زالت 503 وبلا ترويسة.
    const old503 = good
      .replace("    const local = await openFinnLocalReply(parsed.messages);\n", "")
      .replace(/ {4}return sseResponse[^\n]*\n/, '    return finnError(503, "no_engine", "x");\n');
    expect(localReplyPlacementProblems(old503)).toEqual(
      expect.arrayContaining(["الكتلة ما زالت تردّ 503", "بلا ترويسة المحرّك المحلّي"]),
    );
    // الرد المحلّي محذوف كلّه.
    expect(
      localReplyPlacementProblems(good.replace("openFinnLocalReply(", "somethingElse(")),
    ).toContain("نداءٌ مفقود من الترتيب");
  });

  it("كاشف الانتهاك يحمرّ على مزروعاتٍ حقيقية (المادة ٣٠)", () => {
    expect(toolViolations('fetch(u, { method: "POST" })')).toHaveLength(1);
    expect(toolViolations('fetch("https://evil.example/x")')).toEqual(["https://evil.example"]);
    expect(toolViolations('import { exec } from "node:child_process"')).toEqual(["child_process"]);
    expect(toolViolations("await supabaseAdmin.from('t').insert(x)")).toHaveLength(2);
    expect(toolViolations('fetch("https://api.github.com/repos/x", { method: "GET" })')).toEqual(
      [],
    );
  });
});

/* ── ⑩ أداة web_research: الاستيراد الوحيد لعميل n8n داخل فِن ───────────────────── */

const WEB_RESEARCH_FILE = "src/lib/finn-agent/web-research.server.ts";
/** استيراد عميل n8n الوحيد المسموح في الوحدة، بأسمائه. */
const N8N_CLIENT_IMPORT = /import\s*\{([^}]*)\}\s*from\s*"@\/lib\/n8n\/client\.server";?/;
const N8N_CLIENT_ALLOWED_NAMES = [
  "n8nStatus",
  "researchViaN8n",
  "ResearchInput",
  "ResearchOutcome",
];

/** انتهاكات وحدة بحث الويب (على نصّها بلا تعليقات). فارغةٌ = سليمة. */
function webResearchViolations(source: string): string[] {
  const code = strip(source);
  const out: string[] = [];
  const imp = N8N_CLIENT_IMPORT.exec(code);
  if (!imp) out.push("لا استيراد لعميل n8n");
  const names = (imp?.[1] ?? "")
    .split(",")
    .map((n) => n.replace(/\btype\b/, "").trim())
    .filter(Boolean);
  for (const n of names) {
    if (!N8N_CLIENT_ALLOWED_NAMES.includes(n)) out.push(`اسمٌ غير مسموح من عميل n8n: ${n}`);
  }
  // سائر الفحوص بعد نزع الاستيراد المسموح: أي ذكرٍ آخر لـclient.server (قاعدة) يُدان بكاشف الأدوات نفسه.
  out.push(...toolViolations(code.replace(N8N_CLIENT_IMPORT, "")));
  if (/\bfetch\(/.test(code)) out.push("fetch(");
  if (/\bmethod:/.test(code)) out.push("method:");
  if (/process\.env/.test(code)) out.push("process.env");
  if (/\bconsole\./.test(code)) out.push("console.");
  if (/\brunViaN8n\b|RUNNER_WORKFLOWS|fnn-runner|[Ii]dempotenc/.test(code)) out.push("مشغّل");
  const surfaces = [...code.matchAll(/\bsurface:\s*"(\w+)"/g)].map((m) => m[1]);
  if (surfaces.length === 0) out.push("لا سطح");
  for (const sf of surfaces) if (sf !== "fnn") out.push(`سطح ${sf}`);
  if (!/z\.strictObject\(/.test(code)) out.push("المدخل ليس strictObject");
  // مفتاح الإيقاف قبل أول نداء: دلاليًّا (المنفذ) ونصيًّا (حارس القناة).
  const gate = code.indexOf("ports.killSwitch()");
  const call = code.indexOf("ports.research(");
  if (gate < 0 || call < 0 || gate > call) out.push("مفتاح الإيقاف بعد النداء");
  const textGate = code.search(/\baiKillSwitchOn\(/);
  const textCall = code.search(/\bresearchViaN8n\(/);
  if (textGate < 0 || textCall < 0 || textGate > textCall)
    out.push("مفتاح الإيقاف نصيًّا بعد النداء");
  return out;
}

/** الملفات غير الاختبارية في src التي يطابق نصّها (بلا تعليقات) النمط. */
const sourceFilesMatching = (re: RegExp): string[] =>
  globSync("src/**/*.{ts,tsx}")
    .filter((f) => !/\.test\.tsx?$|\.test-support\.ts$/.test(f) && re.test(strip(read(f))))
    .sort();

/**
 * هل يستورد `file` (نصّه `src`) الوحدة `target` (مسار من الجذر بلا امتداد)؟ يُحَلّ المحدِّد إلى مسار:
 * في المستودع وحدتان بالاسم نفسه `web-research.server.ts` (واحدة لسَدِيد في `src/lib/sadeed/` وواحدة لفِن هنا)،
 * فالمطابقة على اسم الملف وحده تنسب إلى فِن استيرادَ `/api/chat` لوحدة سَدِيد (وُجد عند الدمج ٢٠٢٦/١٠/٣٠).
 */
function importsModule(file: string, src: string, target: string): boolean {
  const code = strip(src);
  const specs = [
    ...[...code.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map((m) => m[1]),
    ...[...code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]),
  ];
  return specs.some((spec) => {
    const resolved = spec.startsWith("@/")
      ? `src/${spec.slice(2)}`
      : spec.startsWith(".")
        ? join(dirname(file), spec).split("\\").join("/")
        : spec;
    return resolved.replace(/\.tsx?$/, "") === target;
  });
}

/** الملفات غير الاختبارية في src التي تستورد الوحدة `target` فعلًا (بالمسار المحلَّل لا بالاسم). */
const sourceImportersOf = (target: string): string[] =>
  globSync("src/**/*.{ts,tsx}")
    .filter(
      (f) => !/\.test\.tsx?$|\.test-support\.ts$/.test(f) && importsModule(f, read(f), target),
    )
    .sort();

describe("⑩ web_research: عميل n8n يُستورد من وحدةٍ واحدة، للمالك وحده، قراءةٌ فقط (٢٠٢٦/١٠/٣٠)", () => {
  const SRC = read(WEB_RESEARCH_FILE);

  it("الوحدة نظيفة: استيرادٌ واحد مسمّى، سطح fnn وحده، لا fetch ولا قاعدة ولا مشغّل ولا مضيف", () => {
    expect(existsSync(WEB_RESEARCH_FILE)).toBe(true);
    expect(webResearchViolations(SRC)).toEqual([]);
    // أرضية (المادة ٣٠): الكاشف يرى فعلًا النداء والمنفذ والمخطَّط.
    const code = strip(SRC);
    expect(code).toContain("researchViaN8n(");
    expect(code).toContain("ports.research(");
    expect(code).toContain("z.strictObject(");
  });

  it("مزروع: كل انتهاكٍ يُلتقط (fetch · POST · مشغّل · سطح سَدِيد · قاعدة · env · بلا مفتاح إيقاف)", () => {
    const planted = (from: string, to: string) => SRC.replace(from, to);
    const cases: ReadonlyArray<readonly [string, string, string]> = [
      [
        "fetch(",
        "research: (input) => researchViaN8n(input),",
        "research: (input) => fetch(String(input)) as never,",
      ],
      ["مشغّل", "import {\n  n8nStatus,", "import {\n  runViaN8n,\n  n8nStatus,"],
      ["سطح sadeed", 'surface: "fnn",\n      mode:', 'surface: "sadeed",\n      mode:'],
      [
        "process.env",
        "export const WEB_RESEARCH_MAX_RESULTS",
        "const leak = process.env.X;\nexport const WEB_RESEARCH_MAX_RESULTS",
      ],
      [
        "console.",
        "export const WEB_RESEARCH_MAX_RESULTS",
        "console.log(1);\nexport const WEB_RESEARCH_MAX_RESULTS",
      ],
      [
        "method:",
        "export const WEB_RESEARCH_MAX_RESULTS",
        'const init = { method: "GET" };\nexport const WEB_RESEARCH_MAX_RESULTS',
      ],
      [
        "supabaseAdmin",
        "export const WEB_RESEARCH_MAX_RESULTS",
        'import { supabaseAdmin } from "@/integrations/supabase/client.server";\nexport const WEB_RESEARCH_MAX_RESULTS',
      ],
      ["المدخل ليس strictObject", "z.strictObject(", "z.object("],
      ["مفتاح الإيقاف بعد النداء", 'if (ports.killSwitch()) return fail("disabled");', ""],
    ];
    for (const [needle, from, to] of cases) {
      const hit = webResearchViolations(planted(from, to));
      expect(hit.join("|"), needle).toContain(needle);
    }
    // استيراد اسمٍ غير مسموح من العميل نفسه.
    expect(
      webResearchViolations(SRC.replace("  n8nStatus,", "  n8nStatus,\n  researchViaN8nUnsafe,")),
    ).toEqual(["اسمٌ غير مسموح من عميل n8n: researchViaN8nUnsafe"]);
    // الذكر في تعليقٍ لا يُدان.
    expect(webResearchViolations(`/* runViaN8n process.env fetch( */\n${SRC}`)).toEqual([]);
  });

  it("لا يستوردها غير tools.server.ts، ولا يستورد عميلَ n8n غيرُها داخل فِن", () => {
    expect(sourceImportersOf("src/lib/finn-agent/web-research.server")).toEqual([
      "src/lib/finn-agent/tools.server.ts",
    ]);
    expect(
      sourceFilesMatching(/n8n\/client\.server/).filter((f) => f.startsWith("src/lib/finn-agent/")),
    ).toEqual([WEB_RESEARCH_FILE]);
  });

  it("مزروع: الاسم المتكرّر لا يخلط وحدتَين (سَدِيد وفِن)، والمحدِّد النسبي والمستعار يُحلّان إلى مسار", () => {
    const FNN = "src/lib/finn-agent/web-research.server";
    // استيرادُ وحدة سَدِيد (كما يفعل /api/chat) ليس استيرادًا لوحدة فِن.
    expect(
      importsModule(
        "src/routes/api/chat.ts",
        'import { startWebArm } from "@/lib/sadeed/web-research.server";',
        FNN,
      ),
    ).toBe(false);
    // ولا ملفٌّ في مجلد سَدِيد يستورد «./web-research.server» (وحدتَه هو).
    expect(
      importsModule(
        "src/lib/sadeed/other.server.ts",
        'import { x } from "./web-research.server";',
        FNN,
      ),
    ).toBe(false);
    // أمّا استيرادُ وحدة فِن بالمستعار أو بالنسبي من مجلدها أو بالديناميكي فيُلتقط.
    expect(
      importsModule(
        "src/lib/finn-agent/tools.server.ts",
        'import { x } from "./web-research.server";',
        FNN,
      ),
    ).toBe(true);
    expect(
      importsModule(
        "src/routes/api/x.ts",
        'import { x } from "@/lib/finn-agent/web-research.server";',
        FNN,
      ),
    ).toBe(true);
    expect(
      importsModule(
        "src/routes/api/x.ts",
        'const m = await import("../../lib/finn-agent/web-research.server");',
        FNN,
      ),
    ).toBe(true);
    // والتعليق لا يُحسب.
    expect(
      importsModule(
        "src/routes/api/x.ts",
        '// import { x } from "@/lib/finn-agent/web-research.server";\nconst a = 1;',
        FNN,
      ),
    ).toBe(false);
  });

  it("لا أداة مشغّل/أتمتة: لا ذكر لـrunViaN8n ولا كتالوج المشغّل في أي ملف من فِن (قرارٌ منفصل للمالك)", () => {
    const hits = sourceFilesMatching(/\brunViaN8n\b|RUNNER_WORKFLOWS|fnn-runner-v1/).filter((f) =>
      f.startsWith("src/lib/finn-agent/"),
    );
    expect(hits).toEqual([]);
    // مزروع: ملفٌّ يذكره يُلتقط بالكاشف نفسه.
    expect(/\brunViaN8n\b|RUNNER_WORKFLOWS|fnn-runner-v1/.test(strip("await runViaN8n(x);"))).toBe(
      true,
    );
  });

  it("المالك وحده: الأدوات تُبنى في المحرّك وحده، والمحرّك لا يُفتح قبل بوّابة المالك", () => {
    // (١) buildFinnTools( لا يُنادى إلا من المحرّك.
    expect(
      sourceFilesMatching(/\bbuildFinnTools\(/).filter(
        (f) => f !== "src/lib/finn-agent/tools.server.ts",
      ),
    ).toEqual(["src/lib/finn-agent/engine.server.ts"]);
    // (٢) openFinnChatStream( لا يُنادى خارج المحرّك إلا من مسار فِن، وبعد resolveFinnOwner فيه.
    expect(
      sourceFilesMatching(/\bopenFinnChatStream\(/).filter(
        (f) => f !== "src/lib/finn-agent/engine.server.ts",
      ),
    ).toEqual(["src/routes/api/finn/chat.ts"]);
    const route = strip(read("src/routes/api/finn/chat.ts"));
    const handler = route.slice(route.indexOf("POST: async"));
    const owner = handler.indexOf("resolveFinnOwner(");
    expect(owner).toBeGreaterThan(-1);
    // فتح الدفق والرد المحلّي داخل handlePost وحده (يسبق Route)، ولا يُستدعى إلا بعد بوّابة المالك.
    const post = route.slice(
      route.indexOf("async function handlePost"),
      route.indexOf("export const Route"),
    );
    expect(post).toContain("openFinnChatStream(");
    expect(post).toContain("openFinnLocalReply(");
    expect(handler).not.toMatch(/openFinnChatStream\(|openFinnLocalReply\(/);
    expect(route.match(/\bhandlePost\(/g)).toHaveLength(2); // التعريف + نداءٌ واحد
    expect(owner).toBeLessThan(handler.indexOf("handlePost("));
    // (٣) الرد المحلّي بلا نموذج لا يشغّل بحث الويب: لا ذكر له في المسار المحلّي.
    const local = strip(read("src/lib/finn-agent/local-reply.server.ts"));
    expect(local).not.toMatch(/web_research|web-research|n8n/);
    // مزروع: مسارٌ يفتح الدفق قبل بوّابة المالك.
    const planted =
      "async function h(){ await openFinnChatStream(m); const o = await resolveFinnOwner(r); }";
    expect(planted.indexOf("resolveFinnOwner(")).toBeGreaterThan(
      planted.indexOf("openFinnChatStream("),
    );
  });

  it("المدخل: استعلامٌ ووضعٌ مغلق فقط، والوضع من أوضاع FNN في العقد حرفيًّا", () => {
    expect([...RESEARCH_MODES.fnn]).toEqual(["docs", "code", "security", "general"]);
    expect(
      webResearchInputSchema.safeParse({ query: "vite build cache", mode: "docs" }).success,
    ).toBe(true);
    expect(webResearchInputSchema.safeParse({ query: "x", mode: "regulatory" }).success).toBe(
      false,
    );
  });

  it("سقف الخطوات والمهلة محفوظان: أربع خطوات، وذراع بحث FNN 6 ثوانٍ", () => {
    expect(FINN_MAX_STEPS).toBe(4);
    expect(strip(read("src/lib/finn-agent/engine.server.ts"))).toMatch(
      /stopWhen:\s*stepCountIs\(FINN_MAX_STEPS\)/,
    );
    expect(ARM_DEADLINE_MS["fnn-research-v1"]).toBe(6_000);
  });

  it("حزمة العميل لا تعرف n8n: لا ذكر له في ملفات الواجهة ولا في tool-names", () => {
    for (const f of CLIENT_FILES) expect(strip(read(f)), f).not.toMatch(/n8n/i);
    expect(FINN_TOOL_NAMES).toContain("web_research");
    expect(FINN_TOOL_LABEL_AR.web_research).toBe("بحث الويب");
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
