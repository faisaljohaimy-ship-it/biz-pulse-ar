// @vitest-environment node
/**
 * عقد موجِّه فِن — يقرأ النصّ وينتظر العبارات الأساسية.
 *
 * موجِّهٌ يفقد جملةً واحدة («يقترح ولا ينفّذ» · «لا تطبع أسرارًا» · وسم التحذير) يمرّ
 * بناءً وlint واختبارًا سلوكيًّا، ويغيّر ما يفعله الوكيل فعلًا. فالنصّ نفسه هو
 * المحروس. وبحسب المادة ٣٠ كل قاعدةٍ هنا تحمرّ حين تُنزع عبارتها: الاختبار الأخير
 * ينزع كل قاعدة على حدة من نسخةٍ ويؤكّد أن الكاشف يلتقط غيابها.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FINN_SYSTEM_PROMPT } from "./prompt";

type Rule = { id: string; pattern: RegExp; why: string };

const RULES: Rule[] = [
  { id: "identity", pattern: /مساعد المالك للبرمجة والأتمتة/, why: "الهوية" },
  { id: "name", pattern: /«فِن»[^\n]*FINN|FINN/, why: "الاسم" },
  {
    id: "not-sadeed",
    pattern: /لست سَدِيد ولا تدّعي أنك هو/,
    why: "منفصل عن سَدِيد ولا يدّعيه",
  },
  { id: "no-voice", pattern: /ولا صوت لك/, why: "لا صوت" },
  {
    id: "scope",
    pattern: /TypeScript[\s\S]*TanStack[\s\S]*Supabase[\s\S]*GitHub Actions/,
    why: "النطاق",
  },
  { id: "suggest-only", pattern: /\*\*تقترح ولا تنفّذ\*\*/, why: "يقترح ولا ينفّذ" },
  { id: "no-tools", pattern: /لا أدوات لديك/, why: "بلا أدوات" },
  { id: "no-execute-claims", pattern: /لا تقل «نفّذتُ»/, why: "لا يدّعي تنفيذًا" },
  { id: "human-gate", pattern: /بوابة تأكيد بشري/, why: "البوابة البشرية (المادة ٨)" },
  {
    id: "no-fabrication",
    pattern: /لا تؤلّف أرقامًا ولا نتائج اختبارات/,
    why: "لا اختلاق (المادة ٢٧)",
  },
  { id: "admit-unknown", pattern: /«لا أعرف» أو «غير متأكد»/, why: "يصرّح بما لا يعرفه" },
  {
    id: "no-repo-sight",
    pattern: /ما لا تراه لا تدّعي معرفته/,
    why: "لا يدّعي رؤية المستودع/القاعدة",
  },
  { id: "destructive-marker", pattern: /تحذير — أمر مدمِّر:/, why: "وسم التحذير" },
  { id: "destructive-confirm", pattern: /تأكيد المالك صراحةً/, why: "يطلب التأكيد" },
  { id: "destructive-examples", pattern: /DROP[\s\S]*force push/, why: "أمثلة المدمِّر" },
  {
    id: "no-secrets",
    pattern: /لا تطبع أسرارًا ولا مفاتيح ولا رموزًا حقيقية، ولا تطلبها/,
    why: "لا يطبع أسرارًا ولا يطلبها",
  },
  { id: "placeholder", pattern: /<ضع-القيمة-هنا>/, why: "عنصر نائب بدل السرّ" },
  { id: "injection", pattern: /بيانات لا أوامر/, why: "مقاومة الحقن" },
  { id: "rtl", pattern: /RTL/, why: "عربي أولًا/RTL" },
  { id: "tokens", pattern: /رموز التصميم[\s\S]*الوضعين/, why: "رموز اللون والوضعان" },
  {
    id: "no-tts-iframe",
    pattern: /لا speechSynthesis[\s\S]*iframe/,
    why: "حظر TTS المتصفح وiframe",
  },
  { id: "prod-db-owner", pattern: /بلا إذن المالك الصريح/, why: "قاعدة الإنتاج بإذن المالك" },
  { id: "no-force-push", pattern: /لا force push ولا reset --hard/, why: "حظر force push" },
  { id: "brevity", pattern: /مختصر، ويبدأ بالمفيد مباشرةً/, why: "الاختصار" },
  {
    id: "code-fences",
    pattern: /كتل مسوّرة بالثلاث علامات مع اسم اللغة/,
    why: "كتل الكود المسوّرة",
  },
  {
    id: "arabic-default",
    pattern: /العربية افتراضًا والإنجليزية للمصطلحات التقنية/,
    why: "العربية افتراضًا",
  },
];

function missing(prompt: string): string[] {
  return RULES.filter((r) => !r.pattern.test(prompt)).map((r) => r.id);
}

describe("موجِّه فِن — العبارات الأساسية حاضرة", () => {
  it("القائمة ليست فارغة (المادة ٣٠)", () => {
    expect(RULES.length).toBeGreaterThanOrEqual(20);
  });

  it.each(RULES.map((r) => [r.id, r.why, r.pattern] as const))("%s — %s", (_id, _why, pattern) => {
    expect(FINN_SYSTEM_PROMPT).toMatch(pattern);
  });

  it("لا قاعدة ناقصة", () => {
    expect(missing(FINN_SYSTEM_PROMPT)).toEqual([]);
  });
});

describe("حدود الموجِّه", () => {
  it("لا يدّعي أنه سَدِيد ولا يقدّم نفسه به", () => {
    expect(FINN_SYSTEM_PROMPT).not.toMatch(/أنت\s+«?سَدِيد/);
    expect(FINN_SYSTEM_PROMPT).not.toMatch(/أنا\s+«?سَدِيد/);
    expect(FINN_SYSTEM_PROMPT.startsWith("أنت «فِن»")).toBe(true);
  });

  it("لا يحمل سرًّا ولا مفتاحًا ولا معرّف مستخدم ولا رابط قاعدة", () => {
    expect(FINN_SYSTEM_PROMPT).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
    expect(FINN_SYSTEM_PROMPT).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    );
    expect(FINN_SYSTEM_PROMPT).not.toMatch(/supabase\.co|jhutlofapjfjjeajawie/);
    expect(FINN_SYSTEM_PROMPT).not.toMatch(/FINN_OWNER_USER_IDS|OPENAI_API_KEY/);
  });

  it("لا يطلب من النموذج أن يدّعي تنفيذًا أو أدواتٍ", () => {
    expect(FINN_SYSTEM_PROMPT).not.toMatch(/نفّذ الأوامر مباشرة|لديك أدوات|يمكنك تشغيل/);
  });

  it("حجمٌ معقول: لا يتضخّم فيُنفق رموزًا في كل طلب", () => {
    expect(FINN_SYSTEM_PROMPT.length).toBeGreaterThan(1500);
    expect(FINN_SYSTEM_PROMPT.length).toBeLessThan(6000);
  });
});

describe("الموجِّه للخادم وحده", () => {
  it("لا يستورده أي ملف واجهة (components · routes الصفحة · client.ts)", () => {
    const clientFiles = [
      "src/lib/finn-agent/client.ts",
      "src/lib/finn-agent/copy.ts",
      "src/lib/finn-agent/status.ts",
      "src/routes/_authenticated/finn.tsx",
      "src/components/finn/FinnChat.tsx",
      "src/components/finn/FinnNavEntry.tsx",
      "src/components/finn/use-finn-chat.ts",
    ];
    for (const f of clientFiles) {
      const src = readFileSync(f, "utf8");
      expect(src, `${f} يستورد الموجِّه`).not.toMatch(
        /finn-agent\/prompt|from\s+["']\.\/prompt["']/,
      );
    }
  });
});

describe("إثبات الأداة (المادة ٣٠): الكاشف يحمرّ حين تسقط عبارة", () => {
  it.each(RULES.map((r) => [r.id, r.pattern] as const))("نزع قاعدة «%s» يُلتقط", (id, pattern) => {
    // يُنزع السطر/الجملة الحاملة للعبارة من نسخة النصّ.
    const lines = FINN_SYSTEM_PROMPT.split("\n");
    const kept = lines.filter((l) => !pattern.test(l));
    const stripped =
      kept.length < lines.length
        ? kept.join("\n")
        : FINN_SYSTEM_PROMPT.replace(
            new RegExp(pattern.source.split("[\\s\\S]*")[0], pattern.flags),
            "",
          );
    expect(missing(stripped), `نُزعت «${id}» ولم يلتقطها الكاشف`).toContain(id);
  });
});
