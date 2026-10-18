/**
 * الموجّه الحتمي بلا تكلفة — أمر المالك ٢٠٢٦/١٠/١٨ («الصفر تكلفة أوّلًا»).
 *
 * ما يُجاب هنا **حتميّ صرف**: مطابقةٌ نصّية على مفرداتٍ معلنة، وأرقامٌ من
 * العدّادات الكنسية نفسها التي تعرضها الشاشات، وروابط من سجلّ أسماء الشاشات
 * نفسه. لا نموذج ولا شبكة ولا «استنتاج»، ولا يُقدَّم شيءٌ منه تحليلًا لغويًّا.
 *
 * يكمّل الطبقات القائمة قبل النموذج (حارس النطاق ← المسار الفوري ← الإجابة
 * الفورية من البيانات) ولا يحلّ محلّها:
 *
 *   • **المساعدة**: «ماذا تستطيع؟»/«help» ⇐ قائمة ما يعمل بلا محرّك التحليل.
 *   • **العدّ بالإنجليزية**: «how many projects» ⇐ `renderInstantCount` نفسها
 *     التي يقرؤها الجواب العربي — لا رقم منسوخ في موضعٍ ثانٍ.
 *   • **التنقّل**: «افتح صفحة الصيانة»/«open the maintenance page» ⇐ رابطٌ إلى
 *     مسارٍ من `SCREEN_NAMES` غير محجوب — والمجهول `null` لا تخمين.
 *
 * **والمساعدة والتنقّل للمحرّك متى بلغه المسجَّل بأدواته** (`deferCommandsToEngine`):
 * أداة `sec_navigate` تنقل الواجهة بنفسها (والصوت معها)، والمحرّك يعرف أدواته؛
 * فرابطٌ حتميّ هناك تراجعٌ لا توفير. والعدّ يبقى حتميًّا للجميع كالجواب العربي.
 *
 * **الدقة قبل الشمول** (قاعدة `instant-data-answers.server.ts` نفسها): سؤالٌ
 * يُجاب هنا لا يصل النموذج، فالمطابقة تشترط ألّا يبقى في السؤال مقطعٌ ذو معنى
 * خارج المفردات المعلنة. «ساعدني في تحليل المخاطر» ليس طلب مساعدة بل تحليل.
 *
 * والنصوص تعبر قناع أسماء المزوّدين سليمة: لا اسم مورّد ولا متغيّر بيئة.
 */
import {
  renderInstantCount,
  type InstantCountEntity,
  type InstantCountStatus,
} from "@/lib/sadeed/instant-data-answers.server";
import { normalizeText } from "@/lib/sadeed/projects-maintenance-recall.server";
import { SCREEN_NAMES, type ScreenName } from "@/lib/nav/screen-names";
import { isRouteHidden } from "@/lib/nav/hidden-routes";
import { moduleByRoute } from "@/lib/nav/modules";

export type ZeroCostLocale = "ar" | "en";

export type ZeroCostAnswer = {
  answer: string;
  /** لقياس المصدر في السجلّ — لا يظهر للمستخدم. */
  source: "help" | "count-en" | "navigation";
};

export type ZeroCostUnsupportedReason = "no_provider" | "provider_disabled" | "gate_closed";

/** أطول سؤالٍ يُطابَق حتميًّا — ما فوقه (ومنه نصوص المرفقات) ليس أمرًا قصيرًا. */
const MAX_DETERMINISTIC_CHARS = 220;

const HAS_ARABIC = /[؀-ۿ]/;

/** «ar» إن احتوى النصّ حرفًا عربيًّا، وإلا «en». */
export function detectLocale(text: string): ZeroCostLocale {
  return HAS_ARABIC.test(text) ? "ar" : "en";
}

/** مقاطع النصّ بعد التطبيع — الصورة نفسها التي يقارن بها المطابق العربي القائم. */
function tokensOf(text: string): string[] {
  return normalizeText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function eligible(text: string): boolean {
  const trimmed = text.trim();
  return (
    Boolean(trimmed) && trimmed.length <= MAX_DETERMINISTIC_CHARS && !/<attachment\b/i.test(trimmed)
  );
}

/* ── المساعدة ───────────────────────────────────────────────────────────── */

/** عبارات طلب المساعدة كما يكتبها المستخدم — تُطبَّع قبل المقارنة. */
const HELP_PHRASES_AR = ["ماذا تستطيع", "ما الأوامر", "الأوامر المدعومة", "مساعدة", "ساعدني"];
const HELP_PHRASES_EN = ["help", "what can you do", "commands"];

/** ما يجوز أن يحيط بعبارة المساعدة دون أن يصير السؤال طلبًا آخر. */
const HELP_FILLER = new Set(
  [
    // عربي
    "يا",
    "سديد",
    "ان",
    "أن",
    "تفعل",
    "تعمل",
    "تقدم",
    "لي",
    "الان",
    "هي",
    "هو",
    "ما",
    "ماذا",
    "التي",
    "الذي",
    "اريد",
    "ممكن",
    "من",
    "فضلك",
    "لو",
    "سمحت",
    "المتاحه",
    "المدعومه",
    "الاوامر",
    "اوامر",
    // English
    "the",
    "me",
    "you",
    "can",
    "do",
    "what",
    "please",
    "list",
    "available",
    "supported",
    "sadeed",
    "are",
    "i",
    "need",
    "show",
    "for",
    "here",
    "hi",
    "hello",
  ].map((w) => normalizeText(w)),
);

/** طلب مساعدةٍ صرف: عبارةٌ معلنة، ولا يبقى بعدها إلا حشوٌ معلن. */
export function matchHelpIntent(text: string): boolean {
  if (!eligible(text)) return false;
  const normalized = ` ${tokensOf(text).join(" ")} `;
  const phrases = (detectLocale(text) === "ar" ? HELP_PHRASES_AR : HELP_PHRASES_EN).map(
    (p) => ` ${tokensOf(p).join(" ")} `,
  );
  const hit = phrases.find((p) => normalized.includes(p));
  if (!hit) return false;
  const rest = normalized.replace(hit, " ").trim().split(/\s+/).filter(Boolean);
  return rest.every((t) => HELP_FILLER.has(t));
}

export type HelpOptions = {
  /** المستخدم مسجَّل ومتحقَّق — تُضاف متابعة التنفيذ والموافقات. */
  signedIn: boolean;
  /** محرّك التحليل مهيّأ لهذا الخادم — يتغيّر العنوان والسطر الأخير. */
  engineAvailable: boolean;
};

export type ZeroCostRouteOptions = HelpOptions & {
  /**
   * المحرّك بأدواته يبلغ هذا الطلب (مسجَّلٌ متحقَّق، والمحرّك مهيّأ، والبوّابة غير
   * مغلقة) ⇐ المساعدة والتنقّل له: `sec_navigate` ينقل الواجهة فعلًا، والقائمة
   * الحتمية لا تعرف أدواته. والعدّ يبقى حتميًّا.
   */
  deferCommandsToEngine?: boolean;
};

/**
 * قائمة الأوامر الحتمية، بلغة المستخدم. أسماء الشاشات من سجلّها. والعنوان يصدق حال
 * المحرّك: «بلا المحرّك» حين يغيب، و«فورية من بيانات النظام» حين يحضر — فلا تُقرأ
 * القائمة حدودَ سَدِيد كلّها والمحرّك يعمل. **خمسة أسطر سقفًا** في كل تركيبة
 * (المادة ٢٢ §٢ — نقض الحارس): العدّ والمرجع سطرٌ واحد.
 */
export function helpReply(locale: ZeroCostLocale, options: HelpOptions): string {
  const maintenance = SCREEN_NAMES["/sec/maintenance"];
  const execution = SCREEN_NAMES["/exec"];
  if (locale === "en") {
    const lines = [
      options.engineAvailable
        ? "Instant deterministic answers from system data (no language analysis needed):"
        : "Available now without the language analysis engine (deterministic answers from system data):",
      '- Counts of projects, maintenance work orders and incidents ("How many open incidents?"), or one record by its exact reference.',
      `- Opening system screens — e.g. "Open the ${maintenance.en.toLowerCase()} page".`,
    ];
    if (options.signedIn)
      lines.push(`- Execution status and pending approvals — "Open the ${execution.en} page".`);
    lines.push(
      options.engineAvailable
        ? "Any other analytical question goes to the language analysis engine."
        : "Open-ended analysis needs the language analysis engine, which is not enabled right now.",
    );
    return lines.join("\n");
  }
  const lines = [
    options.engineAvailable
      ? "إجاباتٌ حتمية فورية من بيانات النظام (لا تحتاج التحليل اللغوي):"
      : "ما يعمل الآن دون محرّك التحليل اللغوي (إجاباتٌ حتمية من بيانات النظام):",
    "- عدد المشاريع وأوامر الصيانة والبلاغات («كم عدد البلاغات المفتوحة؟»)، أو سجلٌّ واحد بمرجعه الحرفي.",
    `- فتح شاشات النظام — مثل «افتح صفحة ${maintenance.ar}».`,
  ];
  if (options.signedIn)
    lines.push(`- متابعة حالة التنفيذ والموافقات المعلّقة — «افتح ${execution.ar}».`);
  lines.push(
    options.engineAvailable
      ? "وأيّ سؤالٍ تحليليٍّ آخر يُحال إلى محرّك التحليل اللغوي."
      : "أمّا التحليل المفتوح فيحتاج محرّك التحليل اللغوي، وهو غير مفعّل الآن.",
  );
  return lines.join("\n");
}

/* ── العدّ بالإنجليزية ────────────────────────────────────────────────────── */

const EN_COUNT_INTENT = /(^| )(how many|number of|count of|count|total)( |$)/;

const EN_ENTITY: Readonly<Record<InstantCountEntity, readonly string[]>> = {
  project: ["project", "projects"],
  maintenance: ["maintenance", "work", "order", "orders", "workorder", "workorders"],
  incident: ["incident", "incidents"],
};

/** الحالات نفسها التي يدعمها المطابق العربي لكل كيان — لا حالة جديدة. */
const EN_STATUS: Readonly<Record<string, InstantCountStatus>> = {
  progress: "in_progress",
  ongoing: "in_progress",
  completed: "completed",
  complete: "completed",
  finished: "completed",
  cancelled: "cancelled",
  canceled: "cancelled",
  open: "open",
  closed: "closed",
  preventive: "preventive",
  corrective: "corrective",
};

const EN_FILLER = new Set([
  "how",
  "many",
  "number",
  "of",
  "count",
  "total",
  "the",
  "are",
  "is",
  "there",
  "do",
  "we",
  "have",
  "has",
  "in",
  "our",
  "system",
  "platform",
  "currently",
  "now",
  "right",
  "all",
  "overall",
  "what",
  "s",
  "a",
  "an",
  "sadeed",
  "please",
  "tell",
  "me",
]);

/** عدٌّ إنجليزي صرف ⇐ الجواب من العدّادات الكنسية، وإلا `null`. */
export function matchEnglishCount(text: string): string | null {
  if (!eligible(text) || HAS_ARABIC.test(text)) return null;
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (!EN_COUNT_INTENT.test(tokens.join(" "))) return null;
  const entities = (Object.keys(EN_ENTITY) as InstantCountEntity[]).filter((e) =>
    tokens.some((t) => EN_ENTITY[e].includes(t)),
  );
  if (entities.length !== 1) return null;
  const entity = entities[0];
  const statuses = new Set(tokens.filter((t) => t in EN_STATUS).map((t) => EN_STATUS[t]));
  if (statuses.size > 1) return null;
  const pure = tokens.every(
    (t) => EN_FILLER.has(t) || EN_ENTITY[entity].includes(t) || t in EN_STATUS,
  );
  if (!pure) return null;
  const [status] = [...statuses];
  return renderInstantCount(entity, status ?? null, "en");
}

/* ── التنقّل ─────────────────────────────────────────────────────────────── */

type NavTarget = { route: string; name: ScreenName; keys: Set<string> };

const stripArticle = (s: string) => s.replace(/^ال/, "");

/** مفاتيح مطابقة الشاشة: الاسم العربي مطبَّعًا (بأل وبدونها) والإنجليزي بأحرفٍ صغيرة. */
function screenKeys(name: ScreenName): Set<string> {
  const ar = tokensOf(name.ar).join(" ");
  const en = name.en
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join(" ");
  return new Set([ar, stripArticle(ar), en].filter(Boolean));
}

/**
 * الوجهات المسموحة: سجلّ أسماء الشاشات الكنسي (`SCREEN_NAMES`، المشتقّ من
 * `MODULES`) بعد إسقاط المحجوب بأمر المالك والمنصّات الخارجية — لا قائمة مسارات
 * مكتوبة هنا باليد.
 */
const NAV_TARGETS: readonly NavTarget[] = Object.entries(SCREEN_NAMES)
  .filter(([route]) => !isRouteHidden(route) && !moduleByRoute(route)?.external)
  .map(([route, name]) => ({ route, name, keys: screenKeys(name) }));

const AR_NAV =
  /^(?:(?:من فضلك|لو سمحت|يا سديد)\s+)?(?:افتح(?:ي)?|اذهب\s+(?:بي\s+)?(?:الي|ل)|انتقل\s+(?:الي|ل)|خذني\s+(?:الي|ل)|(اعرض))(?:\s+لي)?(?:\s+(صفحه|شاشه|واجهه))?\s+(.+)$/;
const AR_NAV_TAIL = new Set(["الان", "لو", "سمحت", "من", "فضلك", "رجاء", "لي"]);

const EN_NAV =
  /^(?:please\s+)?(?:(open)|go to|navigate to|take me to|bring up|(show)(?: me)?)\s+(the\s+)?(.+?)(?:\s+(page|screen|view))?(?:\s+please)?$/;

function findTarget(phrase: string): NavTarget | null {
  const key = phrase.trim();
  if (!key) return null;
  const hits = NAV_TARGETS.filter((t) => t.keys.has(key) || t.keys.has(stripArticle(key)));
  return hits.length === 1 ? hits[0] : null;
}

/** طلب فتح شاشةٍ معروفة ⇐ رابطٌ إليها، والوجهة المجهولة `null`. */
export function matchNavigation(text: string): { route: string; answer: string } | null {
  if (!eligible(text)) return null;
  if (HAS_ARABIC.test(text)) {
    const m = AR_NAV.exec(tokensOf(text).join(" "));
    // «اعرض» وحدها فعلُ تحليلٍ (اعرض المشاريع المتأخرة) — لا تنقّل إلا بكلمة الصفحة.
    if (!m || (m[1] && !m[2])) return null;
    const words = m[3].split(" ");
    while (words.length && AR_NAV_TAIL.has(words[words.length - 1])) words.pop();
    const target = findTarget(words.join(" "));
    if (!target) return null;
    return {
      route: target.route,
      answer: `رابط شاشة «${target.name.ar}»: [${target.name.ar}](${target.route})`,
    };
  }
  const flat = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join(" ");
  const m = EN_NAV.exec(flat);
  if (!m) return null;
  const [, open, show, article, phrase, pageWord] = m;
  // «show» وحدها فعلُ تحليل، و«open» بلا أداةٍ ولا كلمة صفحة صفةٌ لا فعل:
  // «open incidents/permits» سؤالٌ عن العناصر المفتوحة، لا طلبُ شاشة.
  if (show && !pageWord) return null;
  if (open && !article && !pageWord) return null;
  const target = findTarget(phrase);
  if (!target) return null;
  return {
    route: target.route,
    answer: `Link to the ${target.name.en} screen: [${target.name.en}](${target.route})`,
  };
}

/* ── المدخل ──────────────────────────────────────────────────────────────── */

/**
 * المساعدة ← التنقّل ← العدّ الإنجليزي؛ `null` يعني: ليس أمرًا حتميًّا (أو أمرٌ
 * يملكه المحرّك بأدواته لهذا الطلب — `deferCommandsToEngine`).
 */
export function matchZeroCostAnswer(
  text: string,
  options: ZeroCostRouteOptions,
): ZeroCostAnswer | null {
  if (!eligible(text)) return null;
  if (!options.deferCommandsToEngine) {
    if (matchHelpIntent(text)) {
      return { answer: helpReply(detectLocale(text), options), source: "help" };
    }
    const nav = matchNavigation(text);
    if (nav) return { answer: nav.answer, source: "navigation" };
  }
  const count = matchEnglishCount(text);
  if (count) return { answer: count, source: "count-en" };
  return null;
}

/* ── ما لا يُجاب حتميًّا ─────────────────────────────────────────────────── */

/** أمثلة أوامر تعمل فعلًا بلا محرّك — يحرس الاختبار أن كلًّا منها يُجاب حتميًّا. */
export const ZERO_COST_EXAMPLES: Readonly<Record<ZeroCostLocale, readonly string[]>> = {
  ar: [
    "كم عدد المشاريع؟",
    "كم عدد البلاغات المفتوحة؟",
    "افتح صفحة الصيانة",
    "ما الأوامر المدعومة؟",
  ],
  en: [
    "How many projects?",
    "How many open incidents?",
    "Open the maintenance page",
    "What can you do?",
  ],
};

/**
 * الردّ الصادق حين يحتاج الطلب محرّك التحليل ولا محرّك: ما جرى بلا اسم مورّد ولا
 * متغيّر بيئة ولا رقم، ثم أمثلةٌ تعمل الآن.
 */
export function zeroCostUnsupportedReply(
  locale: ZeroCostLocale,
  reason: ZeroCostUnsupportedReason,
): string {
  if (locale === "en") {
    const lead =
      reason === "gate_closed"
        ? "The service cannot be verified at this moment, so the language analysis engine is unavailable for this request."
        : reason === "provider_disabled"
          ? "This request needs the language analysis engine, which is switched off right now (zero-cost mode)."
          : "This request needs the language analysis engine, which is not enabled right now (zero-cost mode).";
    const examples = ZERO_COST_EXAMPLES.en.map((q) => `"${q}"`).join(" · ");
    return `${lead} I will not present unverified conclusions. Try: ${examples}`;
  }
  const lead =
    reason === "gate_closed"
      ? "تعذّر التحقّق من الخدمة لحظيًّا، فمحرّك التحليل اللغوي غير متاح لهذا الطلب."
      : reason === "provider_disabled"
        ? "هذا الطلب يحتاج محرّك التحليل اللغوي، وهو موقوفٌ الآن بقرار التشغيل (الوضع الحتمي بلا تكلفة)."
        : "هذا الطلب يحتاج محرّك التحليل اللغوي، وهو غير مفعّل الآن (الوضع الحتمي بلا تكلفة).";
  const examples = ZERO_COST_EXAMPLES.ar.map((q) => `«${q}»`).join(" · ");
  return `${lead} ولن أعرض استنتاجًا غير متحقّق. جرّب: ${examples}`;
}
