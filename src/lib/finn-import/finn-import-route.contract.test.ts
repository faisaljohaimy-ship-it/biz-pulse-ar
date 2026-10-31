// @vitest-environment node
/**
 * عقد المصدر لمسار الاستيراد وإدخاله (ساكن، يقرأ الملفات): الترتيب والفصل والحدود التي لا يلتقطها
 * `tsc` ولا `eslint` ولا اختبار سلوكيٌّ وحده. كل كاشفٍ هنا له انتهاكٌ مزروع يُحمّره (المادة ٣٠)،
 * وسلوكيًّا تقابله بطارياتُ `finn-import-route.mutation.test.ts`.
 *
 * ما يحرسه:
 *  1. المالك أوّلًا ثم مفتاح الإيقاف ثم المعالج؛ وكل طريقةٍ أخرى ⇒ الـ404.
 *  2. **النموذج لا يرى الملف:** لا استيراد لمحرّك فِن ولا موجِّهه ولا أدواته ولا بثّه ولا n8n،
 *     ولا قراءة `messages`، ومسار الدردشة نفسه لا يعرف الملفات.
 *  3. السجلّ: سطرٌ واحد `[finn-import]` ولا غيره في المسار والإدخال.
 *  4. الإدخال بهوية المالك: لا عميل خدمة، وجدول المعرفة وحده، ولا تخزين ملف.
 *  5. المسار مسجَّل في الشجرة المولَّدة.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROUTE_PATH = "src/routes/api/finn/import.ts";
const INGEST_PATH = "src/lib/finn-import/ingest.server.ts";
const CHAT_PATH = "src/routes/api/finn/chat.ts";

const read = (p: string) => readFileSync(p, "utf8");
const strip = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/\s\/\/ .*$/gm, "");

const ROUTE = strip(read(ROUTE_PATH));
const INGEST = strip(read(INGEST_PATH));

// ── ١) الترتيب ───────────────────────────────────────────────────────────────
/** مشاكل الترتيب في معالج POST: فارغة = سليمة. */
function orderProblems(src: string): string[] {
  const handler = src.slice(src.indexOf("POST: async"));
  const owner = handler.indexOf("resolveFinnOwner(");
  const off = handler.indexOf("aiDisabledResponse(");
  const post = handler.indexOf("handlePost(");
  const out: string[] = [];
  if (owner < 0) out.push("لا بوّابة مالك");
  if (off < 0) out.push("لا مفتاح إيقاف");
  if (owner >= 0 && off >= 0 && owner > off) out.push("مفتاح الإيقاف قبل بوّابة المالك");
  if (post >= 0 && off >= 0 && off > post) out.push("المعالج قبل مفتاح الإيقاف");
  if (!/if \(!owner\.ok\) return finnNotFoundResponse\(\);/.test(handler)) {
    out.push("غير المالك لا يردّ الـ404");
  }
  if (!/if \(off\) return off;/.test(handler)) out.push("مفتاح الإيقاف لا يُردّ");
  if (!/ANY:\s*async\s*\(\)\s*=>\s*finnNotFoundResponse\(\)/.test(src)) {
    out.push("غير POST لا يردّ الـ404");
  }
  return out;
}

describe("① المالك ثم الإيقاف ثم المعالج", () => {
  it("المسار الحقيقي سليم", () => {
    expect(orderProblems(ROUTE)).toEqual([]);
  });

  it("مزروع: كل انتهاكٍ يُدان", () => {
    const good = [
      "ANY: async () => finnNotFoundResponse(),",
      "POST: async ({ request }) => {",
      "  const owner = await resolveFinnOwner(request);",
      "  if (!owner.ok) return finnNotFoundResponse();",
      '  const off = aiDisabledResponse("finn");',
      "  if (off) return off;",
      "  return handlePost(request, owner.userId);",
      "},",
    ].join("\n");
    expect(orderProblems(good)).toEqual([]);
    // المعالج قبل مفتاح الإيقاف (يُنفَّذ الطلب ثم يُسأل: هل الميزة مطفأة؟).
    const handlerBeforeOff = [
      "ANY: async () => finnNotFoundResponse(),",
      "POST: async ({ request }) => {",
      "  const owner = await resolveFinnOwner(request);",
      "  if (!owner.ok) return finnNotFoundResponse();",
      "  return handlePost(request, owner.userId);",
      '  const off = aiDisabledResponse("finn");',
      "  if (off) return off;",
      "},",
    ].join("\n");
    expect(orderProblems(handlerBeforeOff)).toEqual(["المعالج قبل مفتاح الإيقاف"]);
    // المالك بعد الإيقاف.
    const ownerAfterOff = [
      "ANY: async () => finnNotFoundResponse(),",
      "POST: async ({ request }) => {",
      '  const off = aiDisabledResponse("finn");',
      "  if (off) return off;",
      "  const owner = await resolveFinnOwner(request);",
      "  if (!owner.ok) return finnNotFoundResponse();",
      "  return handlePost(request, owner.userId);",
      "},",
    ].join("\n");
    expect(orderProblems(ownerAfterOff)).toEqual(["مفتاح الإيقاف قبل بوّابة المالك"]);
    expect(
      orderProblems(good.replace("if (!owner.ok) return finnNotFoundResponse();", "")),
    ).toContain("غير المالك لا يردّ الـ404");
    expect(orderProblems(good.replace("if (off) return off;", ""))).toContain(
      "مفتاح الإيقاف لا يُردّ",
    );
    expect(orderProblems(good.replace("ANY: async () => finnNotFoundResponse(),", ""))).toContain(
      "غير POST لا يردّ الـ404",
    );
    expect(
      orderProblems(good.replace('const off = aiDisabledResponse("finn");', "const off = null;")),
    ).toContain("لا مفتاح إيقاف");
  });
});

// ── ٢) النموذج لا يرى الملف ───────────────────────────────────────────────────
const MODEL_SIDE =
  /finn-agent\/(?:engine|prompt|tools|stream-protocol|messages|failover|local-reply|web-research|knowledge-search)|n8n|openFinn|streamText|generateText|buildFinnTools|parseFinnRequestBody|encodeFinnEvent/;

/** استيراداتٌ أو نداءاتٌ تربط ملفًا بجهة النموذج. */
function modelSideReferences(src: string): string[] {
  return src.match(new RegExp(MODEL_SIDE, "g")) ?? [];
}

describe("② النموذج لا يرى الملف", () => {
  it("المسار والإدخال لا يلمسان محرّك فِن ولا موجِّهه ولا أدواته ولا بثّه ولا n8n", () => {
    expect(modelSideReferences(ROUTE)).toEqual([]);
    expect(modelSideReferences(INGEST)).toEqual([]);
  });

  it("المسار لا يقرأ حقل messages ولا يكتب في محادثة", () => {
    expect(ROUTE).not.toMatch(/(?<![/.\w])messages\b(?!\.server)/);
    expect(INGEST).not.toMatch(/(?<![/.\w])messages\b(?!\.server)/);
  });

  it("مزروع: قراءة messages من الجسم تُدان، ومسار وحدة messages.server لا يُدان", () => {
    const re = /(?<![/.\w])messages\b(?!\.server)/;
    expect(re.test("const { messages } = await readBody(request);")).toBe(true);
    expect(re.test('import { m } from "@/lib/finn-import/messages.server";')).toBe(false);
  });

  it("مزروع: استيرادٌ من المحرّك أو نداءُ نموذج يُدان", () => {
    expect(
      modelSideReferences('import { openFinnChatStream } from "@/lib/finn-agent/engine.server";')
        .length,
    ).toBeGreaterThan(0);
    expect(modelSideReferences("const r = await streamText({ model });").length).toBeGreaterThan(0);
    expect(
      modelSideReferences('import { x } from "@/lib/n8n/client.server";').length,
    ).toBeGreaterThan(0);
    expect(modelSideReferences('import { y } from "@/lib/finn-import/client";')).toEqual([]);
  });

  it("مسار الدردشة لا يعرف الملفات ولا multipart ولا الاستيراد، وجسمه messages وحدها", () => {
    const chat = strip(read(CHAT_PATH));
    expect(chat).not.toMatch(/formData|multipart|finn-import|FINN_IMPORT/);
    expect(chat).toContain("parseFinnRequestBody(");
    expect(chat).toContain('"application/json"');
    // مزروع: لو أُدخل الملف إلى مسار الدردشة لُوحظ.
    expect(/formData|multipart|finn-import/.test(`${chat}\nawait request.formData();`)).toBe(true);
  });

  it("الشعار المثبّت للمحادثة سليم لا يمسّه هذا العمل", () => {
    const copy = read("src/lib/finn-agent/copy.ts");
    expect(copy).toContain("يقترح ولا ينفّذ — راجع قبل أي تنفيذ");
  });
});

// ── ٣) السجلّ ────────────────────────────────────────────────────────────────
function consoleProblems(src: string): string[] {
  const calls = src.match(/console\.\w+\s*\(/g) ?? [];
  const out: string[] = [];
  const nonInfo = calls.filter((c) => !c.startsWith("console.info"));
  if (nonInfo.length > 0) out.push(`نداءات كونسول غير info: ${nonInfo.join(" ")}`);
  if (calls.length - nonInfo.length > 1) out.push("أكثر من سطر تدقيق");
  const info = /console\.info\(\s*"\[finn-import\]"\s*,\s*\{([^}]*)\}/.exec(src);
  if (calls.length > 0 && !info) out.push("سطر التدقيق ليس [finn-import] بأعداد");
  if (info) {
    const keys = info[1]
      .split(",")
      .map((k) => k.split(":")[0].trim())
      .filter(Boolean)
      .sort();
    if (keys.join(",") !== "action,bytes,ms,ok,rows") out.push(`مفاتيح السجلّ: ${keys.join(",")}`);
  }
  return out;
}

describe("③ سطر تدقيقٍ واحد بالأعداد", () => {
  it("المسار: سطر واحد، والإدخال بلا كونسول", () => {
    expect(consoleProblems(ROUTE)).toEqual([]);
    expect((ROUTE.match(/console\./g) ?? []).length).toBe(1);
    expect(INGEST).not.toMatch(/console\./);
  });

  it("مزروع: error أو سطرٌ ثانٍ أو مفتاحٌ زائد يُدان", () => {
    const base =
      'console.info("[finn-import]", {\n action: a,\n ok: b,\n ms: c,\n bytes: d,\n rows: e,\n});';
    expect(consoleProblems(base)).toEqual([]);
    expect(consoleProblems(`${base}\nconsole.error(error);`).length).toBeGreaterThan(0);
    expect(consoleProblems(`${base}\n${base}`).length).toBeGreaterThan(0);
    expect(
      consoleProblems(base.replace("rows: e,", "rows: e,\n name: file.name,")).length,
    ).toBeGreaterThan(0);
    expect(consoleProblems('console.log("x");').length).toBeGreaterThan(0);
  });
});

// ── ٤) الإدخال بهوية المالك ───────────────────────────────────────────────────
function ingestProblems(src: string): string[] {
  const out: string[] = [];
  if (/client\.server|supabaseAdmin|SERVICE_ROLE/.test(src)) out.push("عميل خدمة");
  const tables = [...src.matchAll(/\.from\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]);
  const foreign = tables.filter((t) => t !== "finn_documents");
  if (foreign.length > 0) out.push(`جداول غير مكتبة المعرفة: ${foreign.join(",")}`);
  if (/\.storage\b|createSignedUrl|storage_path:\s*(?!null)\S/.test(src)) out.push("تخزين ملف");
  if (/maint_orders|sec_work_orders|sec_incidents/.test(src)) out.push("جدول تشغيل");
  return out;
}

describe("④ الإدخال: مكتبة المعرفة وحدها بعميل المالك", () => {
  it("الإدخال الحقيقي سليم، وفيه جدول finn_documents فعلًا (الكاشف يرى شيئًا)", () => {
    expect(ingestProblems(INGEST)).toEqual([]);
    expect([...INGEST.matchAll(/\.from\(\s*"finn_documents"\s*\)/g)].length).toBeGreaterThanOrEqual(
      4,
    );
  });

  it("المسار لا يتجاوز الإدخال إلى قاعدة: لا .from( ولا عميل خدمة", () => {
    expect(ROUTE).not.toMatch(/\.from\(|supabaseAdmin|client\.server/);
  });

  it("مزروع: عميل خدمة أو جدول تشغيل أو تخزين ملف يُدان", () => {
    expect(
      ingestProblems('import { supabaseAdmin } from "@/integrations/supabase/client.server";'),
    ).toContain("عميل خدمة");
    expect(ingestProblems('await supabase.from("maint_orders").insert({});')).toContain(
      "جداول غير مكتبة المعرفة: maint_orders",
    );
    expect(
      ingestProblems('await supabase.storage.from("aria-documents").upload(p, b);').join(),
    ).toMatch(/تخزين ملف/);
    expect(ingestProblems("const k = process.env.SUPABASE_SERVICE_ROLE_KEY;")).toContain(
      "عميل خدمة",
    );
  });
});

// ── ٥) التسجيل ───────────────────────────────────────────────────────────────
describe("⑤ المسار مسجَّل في الشجرة المولَّدة", () => {
  it("الملف موجود، والشجرة تذكره في كل مواضعها، وبجوار مسار الدردشة", () => {
    expect(existsSync(ROUTE_PATH)).toBe(true);
    const tree = read("src/routeTree.gen.ts");
    expect(tree).toContain(
      "import { Route as ApiFinnImportRouteImport } from './routes/api/finn/import'",
    );
    expect(tree).toContain("'/api/finn/chat'");
    expect((tree.match(/'\/api\/finn\/import'/g) ?? []).length).toBeGreaterThanOrEqual(9);
    expect(ROUTE).toContain('createFileRoute("/api/finn/import")');
  });
});
