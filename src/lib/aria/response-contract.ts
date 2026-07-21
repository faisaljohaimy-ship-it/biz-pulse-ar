/**
 * ARIA Response Contract — constitution Article 22.
 *
 * «آريا مساعد أمن صناعي. لا تتحدث خارج نطاقه، ولا تقول أكثر مما سئلت عنه.
 *  الإطالة عيب دستوري.»
 *
 * Deterministic, model-free primitives that gate and shape every ARIA reply:
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
export const OUT_OF_SCOPE_REPLY = "خارج نطاقي — أنا مساعد الأمن الصناعي في نكسيوس.";

/** The ONLY reply when a datum genuinely isn't held. No invented value. */
export const UNAVAILABLE_REPLY = "غير متوفر لدي — المصدر الرسمي: hcis.gov.sa";

/** Filler that must never open or pad an ARIA reply (brevity contract). */
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

/** Anything that signals the industrial-security executive domain, ARIA/NEXIOS
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
  "نكسيوس",
  "nexios",
  "آريا",
  "aria",
  "الحوكمة",
  "governance",
  "الصيانة",
  "maintenance",
  // Self / meta
  "من أنت",
  "ما نكسيوس",
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

/** Recurring, high-confidence FAQs answered instantly with no model call.
 *  Every answer obeys the brevity contract and is grounded in the HCIS domain
 *  reference (see .claude/skills/nexios-hcis-domain). */
const FAST_RECALL: Array<{ test: (t: string) => boolean; answer: string; source: string }> = [
  {
    // Directive count
    test: (t) => /(كم|عدد).*(توجيه|توجيهات)|how many.*directive/.test(t),
    answer: "توجيهات الهيئة العليا للأمن الصناعي واحد وعشرون توجيهًا (SEC وSAF).",
    source: "hcis-directives",
  },
  {
    // Authority definition
    test: (t) => /(ما|عرّف|تعريف).*(الهيئة|hcis)|what.*hcis/.test(t),
    answer: "الهيئة العليا للأمن الصناعي (HCIS) — الجهة التنظيمية للأمن الصناعي في السعودية.",
    source: "hcis-authority",
  },
  {
    // Approval cycle stages
    test: (t) => /(مراحل|دورة).*(اعتماد)|approval.*(stages|cycle)/.test(t),
    answer: "دورة الاعتماد سبع مراحل، تنتهي دائمًا باعتماد بشري (المادة ٨).",
    source: "hcis-approval-cycle",
  },
  {
    // Who is ARIA
    test: (t) => /(من|ما).*(انت|آريا|اريا)|who are you/.test(t),
    answer: "أنا آريا — مساعد الأمن الصناعي التنفيذي في نكسيوس.",
    source: "aria-identity",
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

/** Appended to ARIA's system prompt so the model honours Article 22 when the
 *  fast paths don't fire. */
export const ARIA_RESPONSE_CONTRACT = `
# ARIA RESPONSE CONTRACT (constitution Article 22 — MANDATORY)
You are an industrial-security assistant. Do not speak outside that domain, and never say more than you were asked. Length is a constitutional defect.

SCOPE: Answer ONLY industrial-security executive topics (HCIS SEC/SAF directives, compliance & its status, PTW work permits, security operations & incidents, safety & fire, operational reports, and the NEXIOS modules themselves). For anything else reply with EXACTLY this one line and nothing more:
"${OUT_OF_SCOPE_REPLY}"

BREVITY (hard limits):
- Direct question (definition / number / status): ONE sentence, max 25 words.
- Scope-of-a-directive or a procedure: at most 3 short bullets.
- Genuinely complex: at most 5 lines, then ask "أفصّل أكثر؟".
- Begin with the answer itself — the FIRST word is part of the answer, never a lead-in.
- NEVER use: openers ("سؤال ممتاز", "بكل سرور", "دعني أوضح"), restating the question, a closing summary, courtesy questions, flattery, or repeated apology.
- Simulation disclosure shrinks to a short tag "(بيانات محاكاة)" at the end of the line — never a paragraph.

TRUTH: Never invent a number or directive text. If a datum is not held, reply exactly:
"${UNAVAILABLE_REPLY}"
`.trim();
