/**
 * SADEED Response Contract — constitution Article 22.
 *
 * «SADEED مساعد أمن صناعي. لا تتحدث خارج نطاقه، ولا تقول أكثر مما سئلت عنه.
 *  الإطالة عيب دستوري.»
 *
 * Deterministic, model-free primitives that gate and shape every SADEED reply:
 *   1. Scope lock      — off-domain questions get ONE fixed refusal line.
 *   2. Fast recall     — recurring FAQs answer instantly (< ~400ms, no model).
 *   3. Brevity         — the forbidden-filler list + the system-prompt contract.
 *   4. Unavailability  — one honest line instead of an invented number.
 *
 * These run BEFORE the language model in src/routes/api/chat.ts so the common
 * cases never pay model latency, and they are unit-tested (response-contract
 * .test.ts) so the contract can't silently regress.
 */

/** The ONLY reply for an out-of-scope question. One line — no apology, no
 *  explanation of why, no alternatives offered. */
export const OUT_OF_SCOPE_REPLY = "خارج نطاقي — أنا سَدِيد، مساعد الأمن الصناعي.";

/** The ONLY reply when a datum genuinely isn't held. No invented value. */
export const UNAVAILABLE_REPLY = "غير متوفر في المصادر الموثوقة المتاحة.";

/** Filler that must never open or pad an SADEED reply (brevity contract). */
export const FORBIDDEN_FILLER: readonly string[] = [
  "سؤال ممتاز",
  "سؤال رائع",
  "بكل سرور",
  "بكل تأكيد",
  "دعني أوضح",
  "دعيني أوضح",
  "اسمح لي",
  "اسمحي لي",
  "يسعدني",
  "يشرفني",
  "كما تعلم",
  "كما تعلمين",
  "في الواقع",
  "بطبيعة الحال",
  "great question",
  "excellent question",
  "happy to help",
  "let me explain",
  "as you know",
  "of course",
  "certainly,",
];

/** True if the text opens with / contains a banned filler phrase. */
export function hasForbiddenFiller(text: string): boolean {
  const t = ` ${text.toLowerCase().trim()} `;
  return FORBIDDEN_FILLER.some(
    (f) => t.includes(` ${f.toLowerCase()} `) || t.trimStart().startsWith(f.toLowerCase()),
  );
}

/* ── Scope lock ─────────────────────────────────────────────────────────── */

/** Anything that signals the industrial-security executive domain, SADEED,
 *  itself, or a bare session opener — these are ALWAYS in scope. */
const IN_SCOPE = [
  // Regulator & directives
  "hcis",
  "الهيئة",
  "الأمن الصناعي",
  "امتثال",
  "compliance",
  "sec-",
  "sec ",
  "saf-",
  "saf ",
  "توجيه",
  "directive",
  "اعتماد",
  "approval",
  // Permits & work
  "تصريح",
  "تصاريح",
  "ptw",
  "permit",
  "عمل ساخن",
  "hot work",
  // Operations & security
  "بلاغ",
  "حادث",
  "incident",
  "طوارئ",
  "emergency",
  "دورية",
  "patrol",
  "كاميرا",
  "cctv",
  "سلامة",
  "safety",
  "حريق",
  "fire",
  "مخاطر",
  "risk",
  "مقاول",
  "contractor",
  "زائر",
  "visitor",
  "مركبة",
  "بوابة",
  "gate",
  // Reporting & platform
  "تقرير",
  "report",
  "مؤشر",
  "kpi",
  "لوحة",
  "dashboard",
  "عمليات",
  "operation",
  "المنصة",
  "platform",
  "SADEED",
  "الحوكمة",
  "governance",
  "الصيانة",
  "maintenance",
  // Self / meta
  "من أنت",
  "ما المنصة",
  "ماذا تفعل",
  "who are you",
  "what can you",
  "قدرات",
] as const;

/** Explicit off-domain signals — sports, politics, religion, weather, general
 *  coding, entertainment, personal, cooking, medical, math homework, news. */
const OUT_OF_SCOPE = [
  "كرة القدم",
  "مباراة",
  "الدوري",
  "رياضة",
  "football",
  "soccer",
  "match ",
  "سياسة",
  "انتخابات",
  "رئيس",
  "politics",
  "election",
  "دين",
  "صلاة",
  "قرآن",
  "religion",
  "prayer",
  "الطقس",
  "weather",
  "درجة الحرارة",
  "طبخ",
  "وصفة",
  "recipe",
  "cooking",
  "فيلم",
  "أغنية",
  "مشهور",
  "ممثل",
  "movie",
  "song",
  "celebrity",
  "بايثون",
  "python",
  "javascript",
  "اكتب كود",
  "write code",
  "برمجة",
  "خوارزمية",
  "رياضيات",
  "معادلة",
  "math",
  "أخبار",
  "news",
  "عملة",
  "بيتكوين",
  "bitcoin",
  "أسهم",
  "شعر",
  "قصيدة",
  "نكتة",
  "joke",
  "poem",
] as const;

const normalize = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/\s+/g, " ").trim();

/** A short bare opener ("مرحبا", "أهلا", "hi") is a greeting, never off-topic. */
function isGreeting(t: string): boolean {
  return (
    /^(مرحبا|اهلا|أهلا|السلام|هلا|hi|hello|hey|صباح|مساء)\b/.test(t) && t.split(/\s+/).length <= 4
  );
}

/**
 * Scope decision. High-precision on OUT: only a clear off-domain signal with
 * no in-domain signal is blocked — ambiguous text passes to the model, whose
 * system prompt also enforces scope (Article 22). Greetings always pass.
 */
export function isInScope(message: string): boolean {
  const t = normalize(message);
  if (!t) return true;
  if (isGreeting(t)) return true;
  const inHit = IN_SCOPE.some((k) => t.includes(normalize(k)));
  if (inHit) return true;
  const outHit = OUT_OF_SCOPE.some((k) => t.includes(normalize(k)));
  return !outHit;
}

/* ── Fast recall ────────────────────────────────────────────────────────── */

export type FastRecallHit = { answer: string; source: string };

/** Recurring identity FAQ answered instantly with no model call. Regulatory
 *  facts never bypass retrieval: they require current, citable evidence. */
const FAST_RECALL: Array<{ test: (t: string) => boolean; answer: string; source: string }> = [
  {
    // Who is SADEED
    // `finn`/«فين» يبقيان طرفًا أيسر: المستخدم الذي تعوّد الاسم السابق ما زال
    // يسأل به، والمُطبِّع يخفض الحالة فلا حاجة للراية i.
    test: (t) => /(من|ما).*(انت|sadeed|سديد|finn|فين)|who are you/.test(t),
    answer: "أنا سَدِيد — مساعد الأمن الصناعي التنفيذي.",
    source: "sadeed-identity",
  },
];

/** Match a recurring FAQ, or null to fall through to the model. */
export function matchFastRecall(message: string): FastRecallHit | null {
  const t = normalize(message);
  for (const r of FAST_RECALL) {
    if (r.test(t)) return { answer: r.answer, source: r.source };
  }
  return null;
}

/* ── System-prompt contract (the model path obeys the same rules) ────────── */

/** Appended to SADEED's system prompt so the model honours Article 22 when the
 *  fast paths don't fire. */
export const SADEED_RESPONSE_CONTRACT = `
# SADEED RESPONSE CONTRACT (constitution Article 22 — MANDATORY)
You are an industrial-security assistant for every authorized region and site. Do not speak outside that domain, and match depth to the user's request.

SCOPE: Answer ONLY industrial-security executive topics (HCIS SEC/SAF directives, compliance & its status, PTW work permits, security operations & incidents, safety & fire, operational reports, and the platform modules themselves). For anything else reply with EXACTLY this one line and nothing more:
"${OUT_OF_SCOPE_REPLY}"

RESPONSE DEPTH:
- Direct question (definition / number / status): answer in 1–3 concise sentences, normally under 80 words.
- Scope-of-a-directive or a procedure: 3–6 short, actionable bullets.
- Explicit report / executive brief / analysis request: provide a complete, well-structured answer (normally 400–900 words when evidence supports that depth) with the requested KPIs, incidents, priorities, recommendations and sources. Do not collapse it to one line and do not ask "أفصّل أكثر؟".
- For a complex question that is not an explicit report, use only the sections needed to decide or act.
- Begin with the answer itself — the FIRST word is part of the answer, never a lead-in.
- NEVER use: openers ("سؤال ممتاز", "بكل سرور", "دعني أوضح"), restating the question, a closing summary, courtesy questions, flattery, or repeated apology.
- Data blocks supplied to you are production datasets tagged [PROD:*] — never describe their figures as simulation (simulation was removed from this path by owner order 2026/09/03), and never invent figures beyond them.

TRUTH: Never invent a number, source, directive text or operational state. Gemini's pretrained knowledge is background, not organizational evidence. If a required datum is not held, reply exactly:
"${UNAVAILABLE_REPLY}"
`.trim();

/**
 * SADEED live-intelligence doctrine — the chatbot and the voice channel operate
 * as ONE continuously self-improving system: they recover from errors on the
 * spot, keep getting better within governed bounds, are relentlessly accurate,
 * and speak in a measured, clearly-enunciated pace. Injected into the system
 * prompt of both chat routes (complements Articles 5, 11 and 22).
 */
export const SADEED_LIVE_INTELLIGENCE_DOCTRINE = `
# منظومة سَدِيد — ذكاءٌ حيّ وتطويرٌ لحظيّ مستمر (تكمّل المواد ٥ و١١ و٢٢)
تعمل الدردشة والمخاطبة الصوتية كمنظومةٍ واحدة تتحسّن باستمرار:

- **معالجة الأخطاء لحظيًا:** عند أي إخفاق (مزوّد ذكاء، أداة، شبكة، أو بيانات ناقصة) تعافَ فورًا — أعِد المحاولة بهدوء، وقدّم بديلًا أو حالةً عربيةً محايدة صادقة، ولا تُظهر للمستخدم رسائل مصادقة أو أخطاء تقنية خام، ولا تتوقف عنده برسالة عطل. الاستمرارية واجب.
- **تطوير مستمر منضبط:** حسّن جودة الصياغة ودقّة الاسترجاع وسرعة الاستجابة وجودة الاستشهاد باستمرار، وتعلّم تفضيلات العرض المصرّح بها فقط. أي تحسين جوهري يُصاغ اقتراحًا لمالك المنتج، لا تغييرًا ذاتيًا للصلاحيات (المادة ٥).
- **الدقة المطلقة لكل معلومة:** لا رقم ولا رمز ولا تاريخ ولا اسم دون مصدر موثّق؛ عند الغياب قل «غير متوفر في المصدر». انطق كل معلومة كاملةً صحيحة — الأرقام كلماتٍ صحيحة، ورموز التوجيهات، والتواريخ، والأسماء — بلا تشويه.
- **النطق الكامل ١٠٠٪ للأرقام والأيام:** انطق كل عددٍ كلماتٍ كاملةً صحيحة — الصحيحة والآلاف والملايين والنِّسب المئوية والكسور العشرية (تُقرأ بعد «فاصلة» رقمًا رقمًا) — بالعربية في الرد العربي وبالإنجليزية في الرد الإنجليزي، ولا تتهجَّ الأرقام أرقامًا مفردة. وانطق أسماء الأيام كاملةً واضحةً متأنّية (اسم اليوم بالعربية في الرد العربي).
- **تأنٍّ في النطق:** تحدّث بإيقاعٍ متمهّلٍ واضح، تُخرج كل كلمة كاملة، بلا تسرّع؛ الوضوح أهمّ من السرعة.
`.trim();
