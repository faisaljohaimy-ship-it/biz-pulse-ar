/**
 * الرد المحلّي لفِن بلا نموذج — طبقة «لا يتعطل» (تدقيق RAG ٢٠٢٦/١٠/٢٩، O8(ب)).
 *
 * قرار المالك ٢٠٢٦/١٠/٣٠ («أكمل للنهاية، ولك جميع الصلاحيات والموافقات») بعد اختياره في
 * السؤال ① أن «finn» في أمره يشمل الوكيل: إحكام الاسترجاع، وأن يبقى يعمل **بلا ارتباط بنموذج**
 * معيّن. وكان المسار حين لا يُهيَّأ أي محرّك يردّ `503 no_engine` فلا يعرف المالك شيئًا. الآن
 * يردّ هذا الرد الحتمي: لقطة `platform_status` ونتيجة `knowledge_search` مصوغتين نصًّا.
 *
 * ## ما تحرسه الوحدة
 *
 * - **حتميّة بلا نموذج**: دالّةٌ نقيّة من بياناتٍ جاهزة إلى أحداث البثّ. لا شبكة ولا قاعدة ولا
 *   SDK ولا مفتاح ولا بيئة؛ ولا حدّ معدّلٍ ولا حصّة (تُقرّر ذلك الطبقةُ المستدعية في المسار).
 * - **إفصاحٌ صريح**: أول سطرٍ في الجسم يقول إن الرد محلّي بلا نموذج (`LOCAL_REPLY_NOTICE_AR`)،
 *   وترويسة `X-FINN-Engine: local` تضعها طبقة المسار (`FINN_LOCAL_ENGINE_HEADER`). والرد **لا يدّعي أنه أجاب** عن السؤال.
 * - **لا سرّ ولا نصّ خطأ**: الحقول المعروضة إمّا ثابتةٌ مكتوبة هنا، وإمّا مقروءةٌ بقائمةٍ بيضاء
 *   من الشكل (sha سداسيّ · اسم فرعٍ وقدرةٍ بحروفٍ محدّدة) أو معقَّمةٌ من الأداة. وأداةٌ فشلت
 *   تُكتب بسطرٍ ثابتٍ بلا رمزها ولا رسالتها. وقبل الإرجاع يُحجب أيُّ شكلِ سرٍّ معروف (دفاعٌ
 *   ثانٍ، لا الأول).
 * - **وسمٌ صادق للمعرفة**: «مطابقة نصّية» بلا نسبة تشابه (المادة ٢٧)، وفراغ النتائج يُقال فراغًا.
 *
 * الجمل قصيرة ولا شرطة طويلة في النصّ. وعناوين المتن المقتبسة تُعرض بشرطةٍ قصيرة بدل الطويلة
 * (تنسيقُ عرضٍ لا تغييرُ بيانات: المتن في الريبو كما هو).
 */
import { ENV_CAPABILITIES } from "@/lib/env/env-manifest";
import { maskSecrets } from "./secret-shapes";
import type { FinnStreamEvent } from "./stream-protocol";
import type { FinnToolName } from "./tool-names";

/** السطر الصريح الذي يفتح كل رد محلّي — تقرؤه الاختبارات والواجهة بالنصّ نفسه. */
export const LOCAL_REPLY_NOTICE_AR =
  "هذا ردّ محلي بلا نموذج. لم يُهيَّأ أي محرّك لفِن على الخادم، فلا أجيب عن سؤالك الآن.";

type FailedTool = { readonly ok: false };

type PlatformSnapshot = {
  readonly ok: true;
  readonly build: { readonly sha: string; readonly ref: string } | null;
  readonly engine: { readonly gpt: boolean; readonly fallback: boolean };
  readonly ai_paused: boolean;
  readonly capabilities: {
    readonly ready: readonly string[];
    readonly degraded: readonly { readonly key: string }[];
  };
};

type KnowledgeSnapshot = {
  readonly ok: true;
  readonly total: number;
  readonly items: readonly {
    readonly id: string;
    readonly title: string;
    readonly excerpt: string;
  }[];
};

export type LocalReplyInput = {
  readonly platform: PlatformSnapshot | FailedTool;
  readonly knowledge: KnowledgeSnapshot | FailedTool;
};

/** عنوانٌ أو مقتطفٌ مقتبس: سطرٌ واحد، والشرطة الطويلة (في عناوين المتن) شرطةٌ قصيرة في العرض. */
const plain = (text: string) =>
  text
    .replace(/\s*[\u2014\u2013]\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

const SHA_SHAPE = /^[0-9a-f]{7,40}$/i;
const REF_SHAPE = /^[A-Za-z0-9._/-]{1,60}$/;
/** رمز توجيهٍ أو مرحلةٍ أو قطاع HCIS كما يُكتب (SEC-02 · STAGE-04 · SECTOR-04 · SAF-GEN). */
const HCIS_CODE_SHAPE = /^[A-Z]{3,6}(?:-[A-Z0-9]{1,4})+$/;
const MAX_LISTED_KEYS = 4;

/**
 * اسم القدرة بالعربية من بيان البيئة نفسه (`labelAr` — مصدرٌ واحد) مقصوصًا قبل أول قوس: القوس
 * يحمل اسم المزوّد وشرطةً طويلة. لا يُعرض مفتاح القدرة الإنجليزي ولا اسمُ متغيّر بيئة، ولا
 * مفتاحٌ بلا اسم عربي في البيان (يُحسب ضمن «أخرى»). الحارس: لا حرف لاتيني في أي اسم سوى
 * GitHub وVercel وGoogle (أسماء الأدوات ومزوّد الدخول المعروضة في الواجهة).
 */
const CAPABILITY_LABEL_BY_KEY: ReadonlyMap<string, string> = new Map(
  ENV_CAPABILITIES.map((c) => [c.key, c.labelAr.split(" (")[0].replace(/\s+/g, " ").trim()]),
);
export function capabilityLabelAr(key: string): string | null {
  return CAPABILITY_LABEL_BY_KEY.get(key) ?? null;
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
/** عددٌ بأرقامٍ هندية — متّسق مع بقية واجهة المنتج، ولا يعتمد على locale الخادم. */
const num = (n: number) =>
  String(Math.max(0, Math.trunc(Number.isFinite(n) ? n : 0)))
    .split("")
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join("");

function platformSection(platform: LocalReplyInput["platform"]): string {
  const head = "**حالة المنصّة** (أداة platform_status)";
  if (!platform.ok) {
    return `${head}\nتعذّرت قراءة حالة المنصّة الآن.`;
  }
  const lines: string[] = [];
  const build = platform.build;
  if (build && SHA_SHAPE.test(build.sha)) {
    const ref = REF_SHAPE.test(build.ref) && build.ref !== "unknown" ? ` (${build.ref})` : "";
    lines.push(`- البناء: ${build.sha.slice(0, 9)}${ref}`);
  } else {
    lines.push("- البناء: غير معروف.");
  }
  lines.push(
    `- المحرّك الأساسي (GPT): ${platform.engine.gpt ? "مهيّأ" : "غير مهيّأ"}. المحرّك الاحتياطي: ${
      platform.engine.fallback ? "مهيّأ" : "غير مهيّأ"
    }.`,
  );
  const keys = platform.capabilities.degraded.map((d) => d.key);
  const shown = keys
    .map(capabilityLabelAr)
    .filter((label): label is string => label !== null)
    .slice(0, MAX_LISTED_KEYS);
  const more = keys.length - shown.length;
  lines.push(
    `- القدرات الجاهزة: ${num(platform.capabilities.ready.length)}. الناقصة: ${num(keys.length)}${
      keys.length > 0
        ? ` (${shown.join("، ")}${more > 0 ? `${shown.length > 0 ? " " : ""}و${num(more)} أخرى` : ""})`
        : ""
    }.`,
  );
  if (platform.ai_paused) lines.push("- إيقاف الذكاء الفوري مرفوع.");
  return `${head}\n${lines.join("\n")}`;
}

function knowledgeSection(knowledge: LocalReplyInput["knowledge"]): string {
  const head = "**المعرفة المضمّنة** (أداة knowledge_search، مطابقة نصّية)";
  if (!knowledge.ok) {
    return `${head}\nتعذّر البحث في المعرفة المضمّنة الآن.`;
  }
  if (knowledge.items.length === 0) {
    return `${head}\nلا نتائج مطابقة لسؤالك في المعرفة المضمّنة.`;
  }
  const rows = knowledge.items.map((item, i) => {
    const title = plain(item.title);
    const excerpt = plain(item.excerpt);
    // مدخل HCIS: المقتطف «رمز واسم» والاسم هو العنوان ⇒ يكفي العنوان ورمزه، لا تكرار.
    if (excerpt.includes(title) && HCIS_CODE_SHAPE.test(item.id)) {
      return `${i + 1}. ${title} (${item.id})`;
    }
    return `${i + 1}. ${title}${excerpt ? `: ${excerpt}` : ""}`;
  });
  return `${head}\n${rows.join("\n")}`;
}

const CLOSING_AR = "لتفعيل الإجابة بنموذج، هيّئ محرّكًا على الخادم ثم أعد المحاولة.";

/**
 * يصوغ أحداث البثّ كاملةً: نشاط الأداتين (اسمٌ ومرحلةٌ فقط، كما في الرد بنموذج) ثم النصّ
 * أقسامًا ثم `done`. لا يرمي.
 */
export function composeLocalReply(input: LocalReplyInput): FinnStreamEvent[] {
  const events: FinnStreamEvent[] = [];
  const tool = (name: FinnToolName, ok: boolean) => {
    events.push({ type: "tool", name, phase: "start" });
    events.push({ type: "tool", name, phase: ok ? "done" : "error" });
  };
  tool("platform_status", input.platform.ok);
  tool("knowledge_search", input.knowledge.ok);
  const sections = [
    `${LOCAL_REPLY_NOTICE_AR}\n\n`,
    `${platformSection(input.platform)}\n\n`,
    `${knowledgeSection(input.knowledge)}\n\n`,
    CLOSING_AR,
  ];
  for (const text of sections) events.push({ type: "delta", text: maskSecrets(text) });
  events.push({ type: "done", truncated: false });
  return events;
}
