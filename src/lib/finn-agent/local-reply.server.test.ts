// @vitest-environment node
/**
 * الرد المحلّي لفِن بلا نموذج — صياغةٌ حتمية من بياناتٍ جاهزة، لا سرّ ولا خطأ خام ولا ادّعاء.
 *
 * وحدةٌ نقيّة: لا بيئة ولا شبكة، فتُختبر بمدخلاتٍ مصنوعة. كل فحصٍ سلبيّ جُرِّب على حالةٍ مزروعة
 * (المادة ٣٠): سرٌّ في مقتطف، ومفتاح قدرةٍ يحمل اسمًا سابقًا، وأداةٌ فاشلة تحمل رمزًا.
 */
import { describe, expect, it, vi } from "vitest";
import { ENV_CAPABILITIES } from "@/lib/env/env-manifest";
import { openFinnLocalReply } from "./engine.server";
import { KNOWLEDGE_QUERY_MAX_CHARS } from "./knowledge-search.server";
import {
  capabilityLabelAr,
  composeLocalReply,
  LOCAL_REPLY_NOTICE_AR,
  type LocalReplyInput,
} from "./local-reply.server";
import { maskSecrets, SECRET_SHAPES } from "./secret-shapes";
import { readLocalReplyData } from "./tools.server";

// تمريرٌ كاملٌ إلى التنفيذ الحقيقي مع تسجيل ما يصل الأداة: السلوك لا يتغيّر، ونرى طول الاستعلام
// الذي يغادر المحرّك المحلّي (حارس القصّ في `openFinnLocalReply`، مستقلًّا عن قصّ الأداة نفسها).
const { knowledgeCalls } = vi.hoisted(() => ({ knowledgeCalls: [] as string[] }));
vi.mock("./knowledge-search.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./knowledge-search.server")>();
  return {
    ...actual,
    knowledgeSearch: (input: { query: string; limit?: number }, ...rest: unknown[]) => {
      knowledgeCalls.push(input.query);
      return (actual.knowledgeSearch as (...a: unknown[]) => unknown)(input, ...rest);
    },
  };
});

const SHA = "0123456789abcdef0123456789abcdef01234567";

function input(over: Partial<LocalReplyInput> = {}): LocalReplyInput {
  return {
    platform: {
      ok: true,
      build: { sha: SHA, ref: "main" },
      engine: { gpt: false, fallback: false },
      ai_paused: false,
      capabilities: { ready: ["a", "b", "c"], degraded: [{ key: "finn-engine" }] },
    },
    knowledge: { ok: true, total: 0, items: [] },
    ...over,
  };
}

const textOf = (i: LocalReplyInput) =>
  composeLocalReply(i)
    .filter((e) => e.type === "delta")
    .map((e) => (e as { text: string }).text)
    .join("");

describe("الأحداث", () => {
  it("أداتان بمرحلتين، ثم أقسام النصّ، ثم done — وأول نصٍّ هو السطر الصريح", () => {
    const ev = composeLocalReply(input());
    expect(ev.slice(0, 4)).toEqual([
      { type: "tool", name: "platform_status", phase: "start" },
      { type: "tool", name: "platform_status", phase: "done" },
      { type: "tool", name: "knowledge_search", phase: "start" },
      { type: "tool", name: "knowledge_search", phase: "done" },
    ]);
    const deltas = ev.filter((e) => e.type === "delta") as Array<{ text: string }>;
    expect(deltas).toHaveLength(4);
    expect(deltas[0].text.startsWith(LOCAL_REPLY_NOTICE_AR)).toBe(true);
    expect(ev.at(-1)).toEqual({ type: "done", truncated: false });
    expect(ev.some((e) => e.type === "error")).toBe(false);
  });

  it("أداةٌ فاشلة ⇒ مرحلة error لها، ولا تُلغي الأخرى", () => {
    const ev = composeLocalReply(input({ platform: { ok: false } }));
    expect(ev.filter((e) => e.type === "tool")).toEqual([
      { type: "tool", name: "platform_status", phase: "start" },
      { type: "tool", name: "platform_status", phase: "error" },
      { type: "tool", name: "knowledge_search", phase: "start" },
      { type: "tool", name: "knowledge_search", phase: "done" },
    ]);
  });

  it("حتميّة: المدخل نفسه يعطي الأحداث نفسها حرفًا", () => {
    expect(JSON.stringify(composeLocalReply(input()))).toBe(
      JSON.stringify(composeLocalReply(input())),
    );
  });
});

describe("السطر الصريح والصدق", () => {
  it("يقول إن الرد محلّي بلا نموذج، وإن لا محرّك مهيّأ، وإنه لا يجيب عن السؤال", () => {
    expect(LOCAL_REPLY_NOTICE_AR).toBe(
      "هذا ردّ محلي بلا نموذج. لم يُهيَّأ أي محرّك لفِن على الخادم، فلا أجيب عن سؤالك الآن.",
    );
    expect(textOf(input()).startsWith(LOCAL_REPLY_NOTICE_AR)).toBe(true);
  });

  it("لا شرطة طويلة ولا طويلة-قصيرة في النصّ المكتوب (جمل قصيرة)", () => {
    expect(textOf(input())).not.toMatch(/[—–]/);
  });

  it("لا اسم متغيّر بيئةٍ ولا كلمة مصادقة/رمز تبلغ الشاشة", () => {
    const text = textOf(input());
    expect(text).not.toMatch(/[A-Z][A-Z0-9]+_[A-Z0-9_]+/);
    expect(text).not.toMatch(/authenticat|unauthor|token|bearer|secret/i);
  });
});

describe("قسم المنصّة", () => {
  it("البناء: sha مقصوص إلى تسعة والفرع إن كان بشكلٍ سليم", () => {
    expect(textOf(input())).toContain(`- البناء: ${SHA.slice(0, 9)} (main)`);
  });

  it.each([
    ["sha غير سداسيّ", { sha: "not-a-sha", ref: "main" }],
    ["sha unknown", { sha: "unknown", ref: "unknown" }],
  ])("بناءٌ غير معروف (%s) ⇒ «غير معروف» لا تخمين", (_n, build) => {
    const i = input();
    const text = textOf({ ...i, platform: { ...(i.platform as object), build } as never });
    expect(text).toContain("- البناء: غير معروف.");
  });

  it("فرعٌ بشكلٍ مشبوه يُحذف ويبقى الـsha", () => {
    const i = input();
    const text = textOf({
      ...i,
      platform: { ...(i.platform as object), build: { sha: SHA, ref: "x; rm -rf /" } } as never,
    });
    expect(text).toContain(`- البناء: ${SHA.slice(0, 9)}`);
    expect(text).not.toContain("rm -rf");
    expect(text).not.toContain("(x");
  });

  it("لا بناء أصلًا (null) ⇒ «غير معروف»", () => {
    const i = input();
    const text = textOf({ ...i, platform: { ...(i.platform as object), build: null } as never });
    expect(text).toContain("- البناء: غير معروف.");
  });

  it.each([
    [false, false, "غير مهيّأ", "غير مهيّأ"],
    [true, false, "مهيّأ", "غير مهيّأ"],
    [false, true, "غير مهيّأ", "مهيّأ"],
  ])("المحرّكان gpt=%s fallback=%s يُقرآن كما هما", (gpt, fallback, a, b) => {
    const i = input();
    const text = textOf({
      ...i,
      platform: { ...(i.platform as object), engine: { gpt, fallback } } as never,
    });
    expect(text).toContain(`المحرّك الأساسي (GPT): ${a}. المحرّك الاحتياطي: ${b}.`);
  });

  it("القدرات: أعدادٌ بأرقام هندية، وأسماؤها العربية من بيان البيئة حتى أربعة ثم «و… أخرى»", () => {
    const i = input();
    const keys = [
      "supabase",
      "sadeed-voice",
      "finn-owner-gate",
      "finn-engine",
      "outbound-email",
      "outbound-sms",
    ].map((key) => ({ key }));
    const text = textOf({
      ...i,
      platform: {
        ...(i.platform as object),
        capabilities: { ready: ["a", "b", "c", "d"], degraded: keys },
      } as never,
    });
    expect(text).toContain(
      "القدرات الجاهزة: ٤. الناقصة: ٦ (قاعدة البيانات والمصادقة، صوت سَدِيد، بوّابة مالك فِن، محرّك فِن و٢ أخرى).",
    );
  });

  it("لا ناقص ⇒ لا قوس", () => {
    const i = input();
    const text = textOf({
      ...i,
      platform: {
        ...(i.platform as object),
        capabilities: { ready: ["a"], degraded: [] },
      } as never,
    });
    expect(text).toContain("القدرات الجاهزة: ١. الناقصة: ٠.");
  });

  it("لا يُعرض مفتاح القدرة الإنجليزي ولا اسم متغيّر: مفتاحٌ غير معروف للبيان يُحسب ضمن «أخرى» فقط", () => {
    const i = input();
    const text = textOf({
      ...i,
      platform: {
        ...(i.platform as object),
        capabilities: {
          ready: [],
          degraded: [{ key: "aria-brain" }, { key: "<script>alert(1)</script>" }, { key: "x_y" }],
        },
      } as never,
    });
    expect(text).toContain("الناقصة: ٣ (عقل سَدِيد ومجلس الوكلاء و٢ أخرى)");
    expect(text).not.toContain("aria-brain");
    expect(text).not.toContain("<script>");
    expect(text).not.toContain("x_y");
  });

  it("كل قدرةٍ في بيان البيئة لها اسمٌ عربي معروض بلا حرف لاتيني (عدا GitHub وVercel) ولا شرطة طويلة ولا قوس", () => {
    expect(ENV_CAPABILITIES.length).toBeGreaterThanOrEqual(10);
    for (const c of ENV_CAPABILITIES) {
      const label = capabilityLabelAr(c.key);
      expect(label, c.key).not.toBeNull();
      expect(label!.length, c.key).toBeGreaterThan(2);
      expect(label!.replace(/GitHub|Vercel/g, ""), c.key).not.toMatch(/[A-Za-z]/);
      expect(label!, c.key).not.toMatch(/[\u2014\u2013()]/);
    }
    expect(capabilityLabelAr("not-a-capability")).toBeNull();
    // مزروع: اسم القدرة الخام (قبل القصّ) كان يحمل اسم المزوّد وشرطةً طويلة وقوسًا.
    const raw = ENV_CAPABILITIES.find((c) => c.key === "aria-brain")!.labelAr;
    expect(raw).toMatch(/[A-Za-z]/);
    expect(raw).toMatch(/[\u2014()]/);
  });

  it("إيقاف الذكاء الفوري يُذكر حين يكون مرفوعًا", () => {
    const i = input();
    const text = textOf({
      ...i,
      platform: { ...(i.platform as object), ai_paused: true } as never,
    });
    expect(text).toContain("- إيقاف الذكاء الفوري مرفوع.");
    expect(textOf(input())).not.toContain("إيقاف الذكاء الفوري");
  });

  it("أداة المنصّة فاشلة ⇒ سطرٌ ثابت بلا رمزٍ ولا رسالة، حتى لو حملت الكائنات حقولًا زائدة", () => {
    const failed = { ok: false, reason: "tool_failed", detail: "Error: boom at /srv/x.js:1" };
    const text = textOf({ ...input(), platform: failed as never });
    expect(text).toContain("تعذّرت قراءة حالة المنصّة الآن.");
    expect(text).not.toMatch(/tool_failed|boom|\/srv|Error/);
  });
});

describe("قسم المعرفة", () => {
  const hits = (): LocalReplyInput["knowledge"] => ({
    ok: true,
    total: 3,
    items: [
      { id: "SEC-02", title: "الأسوار الأمنية", excerpt: "SEC-02 — الأسوار الأمنية" },
      {
        id: "platform-reference/permit-isolation-ar",
        title: "إطار تصاريح العمل والعزل — مرجع عام",
        excerpt: "يتحقق الإطار العام من نطاق العمل.",
      },
      { id: "x", title: "عنوان", excerpt: "" },
    ],
  });

  it("الوسم «مطابقة نصّية» في العنوان، ولا نسبة", () => {
    const text = textOf(input({ knowledge: hits() }));
    expect(text).toContain("**المعرفة المضمّنة** (أداة knowledge_search، مطابقة نصّية)");
    expect(text).not.toMatch(/\bsim\b|\d\s*%|تشابه/i);
  });

  it("مدخل HCIS: العنوان ورمزه بلا تكرار؛ مدخل البذرة: عنوان ثم مقتطف؛ بلا مقتطف: العنوان وحده", () => {
    const text = textOf(input({ knowledge: hits() }));
    expect(text).toContain("1. الأسوار الأمنية (SEC-02)");
    expect(text).not.toContain("1. الأسوار الأمنية: SEC-02");
    expect(text).toContain(
      "2. إطار تصاريح العمل والعزل - مرجع عام: يتحقق الإطار العام من نطاق العمل.",
    );
    expect(text).toMatch(/^3\. عنوان$/m);
  });

  it("الشرطة الطويلة في عناوين المتن المقتبسة تُعرض قصيرة", () => {
    expect(textOf(input({ knowledge: hits() }))).not.toMatch(/[—–]/);
  });

  it("لا نتائج ⇒ سطرٌ صريح، وليس قائمة فارغة", () => {
    const text = textOf(input());
    expect(text).toContain("لا نتائج مطابقة لسؤالك في المعرفة المضمّنة.");
    expect(text).not.toMatch(/^1\. /m);
  });

  it("الأداة فاشلة أو غير مهيّأة ⇒ سطرٌ ثابت بلا رمز", () => {
    const text = textOf(
      input({ knowledge: { ok: false, configured: false, reason: "not_configured" } as never }),
    );
    expect(text).toContain("تعذّر البحث في المعرفة المضمّنة الآن.");
    expect(text).not.toContain("not_configured");
  });
});

describe("الدفاع الثاني: أيّ شكل سرٍّ يُحجب من الناتج كلّه", () => {
  const SECRETS = [
    "sk-AAAAAAAAAAAAAAAAAAAAAAAA",
    "ghp_" + "B".repeat(30),
    "github_pat_" + "C".repeat(30),
    "sb_secret_" + "D".repeat(30),
    "eyJ" + "a".repeat(30) + "." + "b".repeat(20) + "." + "c".repeat(20),
  ];

  it("سرٌّ مزروع في العنوان والمقتطف ⇒ يُحجب في الأقسام كلّها", () => {
    const text = textOf({
      platform: {
        ok: true,
        build: { sha: SHA, ref: "main" },
        engine: { gpt: false, fallback: false },
        ai_paused: false,
        capabilities: { ready: [], degraded: [{ key: "supabase" }] },
      },
      knowledge: {
        ok: true,
        total: 1,
        items: [{ id: "x", title: `عنوان ${SECRETS[1]}`, excerpt: SECRETS.join(" ") }],
      },
    });
    for (const secret of SECRETS) expect(text, secret.slice(0, 8)).not.toContain(secret);
    expect(text).toContain("[محجوب]");
  });

  it("مزروع: الكاشف نفسه يلتقط كل نمط (فالحجب هو الذي نظّف لا غياب النمط)", () => {
    for (const secret of SECRETS) {
      expect(new RegExp(SECRET_SHAPES.source).test(secret), secret.slice(0, 8)).toBe(true);
      expect(maskSecrets(`قبل ${secret} بعد`)).toBe("قبل [محجوب] بعد");
    }
    expect(maskSecrets("نصّ عادي بلا سرّ")).toBe("نصّ عادي بلا سرّ");
  });
});

describe("القراءة الحقيقية: readLocalReplyData ⇒ composeLocalReply", () => {
  const status = () => ({ gpt: false, gptModel: "gpt-4.1", fallback: false, paused: false });

  it("لا شبكة ولا إنفاق: الأداتان تُقرآن في العملية، والتدقيق اسمٌ ونتيجةٌ وزمنٌ للأداتين بالترتيب", async () => {
    const audit: Array<Record<string, unknown>> = [];
    const data = await readLocalReplyData(status, "الأسوار الأمنية", {
      env: {},
      fetchImpl: (() => {
        throw new Error("لا شبكة");
      }) as unknown as typeof fetch,
      audit: (entry) => audit.push(entry),
    });
    expect(data.platform.ok).toBe(true);
    expect(data.knowledge.ok).toBe(true);
    expect(audit.map((a) => a.tool)).toEqual(["platform_status", "knowledge_search"]);
    for (const a of audit) expect(Object.keys(a).sort()).toEqual(["ms", "ok", "tool"]);
    expect(JSON.stringify(audit)).not.toContain("الأسوار");
    const text = textOf(data);
    expect(text).toContain("الأسوار الأمنية (SEC-02)");
  });

  it("بيئةٌ فيها أسرار أدوات: لا قيمة منها في الرد", async () => {
    const env = {
      FINN_GITHUB_TOKEN: "ghp_" + "Q".repeat(30),
      FINN_VERCEL_TOKEN: "vercel-secret-value-123456",
      OPENAI_API_KEY: "",
    };
    const data = await readLocalReplyData(status, "سؤال", { env, audit: () => undefined });
    const text = textOf(data);
    expect(text).not.toContain(env.FINN_GITHUB_TOKEN);
    expect(text).not.toContain(env.FINN_VERCEL_TOKEN);
  });

  it("تدقيقٌ يرمي لا يقطع الرد (أفضل جهد)", async () => {
    const data = await readLocalReplyData(status, "الأسوار الأمنية", {
      env: {},
      audit: () => {
        throw new Error("sink down");
      },
    });
    expect(data.platform.ok).toBe(true);
    expect(textOf(data)).toContain(LOCAL_REPLY_NOTICE_AR);
  });
});

describe("openFinnLocalReply: سقف الاستعلام حارسٌ بسلوكه (المادة ٣٠)", () => {
  const KEYWORD = "الأسوار الأمنية";
  const inside = `${"ز".repeat(KNOWLEDGE_QUERY_MAX_CHARS - 1 - KEYWORD.length)} ${KEYWORD}`;
  const outside = `${"ز".repeat(KNOWLEDGE_QUERY_MAX_CHARS - 1)} ${KEYWORD}`;

  async function replyText(question: string): Promise<string> {
    knowledgeCalls.length = 0;
    const { events } = await openFinnLocalReply([{ role: "user", content: question }], {});
    let text = "";
    for await (const e of events) if (e.type === "delta") text += e.text;
    return text;
  }

  it("الشاهد: الكلمات نفسها داخل السقف ⇒ تظهر SEC-02 في الرد", async () => {
    const text = await replyText(inside);
    expect(text).toContain("الأسوار الأمنية (SEC-02)");
    expect(knowledgeCalls).toEqual([inside]);
  });

  it("كلماتٌ بعد الحرف 300 ⇒ الرد يقول لا نتائج ولا يظهر SEC-02", async () => {
    const text = await replyText(outside);
    expect(text).toContain("لا نتائج مطابقة لسؤالك");
    expect(text).not.toContain("SEC-02");
  });

  it("المحرّك المحلّي نفسه يقصّ: ما يصل الأداة لا يتجاوز 300 حرف ويساوي أولها", async () => {
    await replyText(`${outside}${"ا".repeat(50_000)}`);
    expect(knowledgeCalls).toHaveLength(1);
    expect(knowledgeCalls[0]).toHaveLength(KNOWLEDGE_QUERY_MAX_CHARS);
    expect(knowledgeCalls[0]).toBe(outside.slice(0, KNOWLEDGE_QUERY_MAX_CHARS));
  });
});
