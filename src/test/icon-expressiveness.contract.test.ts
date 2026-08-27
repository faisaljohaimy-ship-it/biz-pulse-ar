/**
 * تعبيرية الأيقونات — حارس العقد (البند ١٠ من سجل المالك).
 *
 * OWNER DIRECTIVE: «كل أيقونة في النظام يجب أن تكون معبرة عن الزر أو
 * البطاقة». تدقيق ٢٠٢٦/٠٨/٠٩ أصلح ٣٣ أيقونة وترك قراراته تعليقاتٍ في
 * الكود (sec-shell · dashboard · alerts-panel)؛ إعادة التدقيق ٢٠٢٦/٠٨/٢٧
 * وجدت الانتكاسات التالية بعد موجات إعادة التصميم وأصلحتها — وهذا الملف
 * يثبّتها كي لا تعود بصمت:
 *
 *   أ) معنى مقلوب: درع إنذار فوق حالة «لا توجد تنبيهات» (كل شيء سليم).
 *   ب) القرارات الموثقة نفسها انتُكست في أسطح أخرى: Radar فوق الدوريات،
 *      Camera فوق المراقبة، Rocket فوق المشاريع، ShieldCheck فوق غرف
 *      التحكم، Crown فوق منطقة جغرافية، Hexagon شكل أصم فوق التوأم.
 *   ج) أيقونة واحدة لمعنيين متجاورين: ShieldAlert للاستجابة وللتدقيق معًا.
 *
 * الفحص قراءة ساكنة للمصدر — كنمط holo-icon-contract — فأي استبدال لاحق
 * يسقط هنا باسم الملف والقاعدة، لا في عين مراجع بشري.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

/**
 * المادة ٣٠ — الأداة تُثبَت قبل أن يُوثق بقراءتها: أي بند «لا تعود هذه
 * الأيقونة» يجب أن يقرأ الكود وحده. تعليقات هذا التدقيق نفسها تسمّي
 * الأيقونات المُزالة لتشرح القرار، فقراءةٌ لا تُسقط التعليقات تسقط على
 * شرحها لا على انتكاسة.
 */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\/[^\n]*\n/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

describe("إثبات الأداة قبل الوثوق بقراءتها (المادة ٣٠)", () => {
  it("code() يُسقط التعليقات فعلًا — والقارئ الخام لا يفعل", () => {
    // بند «لا تعود Hexagon» أدناه يمرّ زورًا لو كان code() لا يفعل شيئًا،
    // لأن تعليق dashboard.tsx يسمّي Hexagon ليشرح إزالتها.
    const raw = read("src/routes/_authenticated/dashboard.tsx");
    expect(raw).toContain("Hexagon");
    expect(code("src/routes/_authenticated/dashboard.tsx")).not.toContain("Hexagon");
  });
});

describe("أ — لا معنى مقلوبًا: أيقونة الحالة لا تناقض رسالتها", () => {
  it("لوحة التنبيهات: حالة «لا توجد تنبيهات» تحمل درع سلامة لا درع إنذار", () => {
    const src = code("src/components/sec/alerts-panel.tsx");
    // The empty state (all clear, emerald) must carry ShieldCheck.
    expect(src).toMatch(/<ShieldCheck[^>]*\/>\s*\n\s*لا توجد تنبيهات مطابقة/);
    // And the alert-shield glyph must not sit over the all-clear message.
    expect(src).not.toMatch(/<ShieldAlert[\s\S]{0,120}لا توجد تنبيهات/);
  });
});

describe("ب — القرارات الموثقة تسري على كل الأسطح، لا على سطح واحد", () => {
  it("غرفة العمليات /sec: الدوريات جولة راجلة (Footprints) والمراقبة Cctv", () => {
    const src = code("src/routes/_authenticated/sec.index.tsx");
    expect(src).toContain('icon={Footprints} title="الدوريات النشطة"');
    expect(src).toContain('icon={Cctv} title="تنبيهات CCTV الأخيرة"');
    // «Radar كشفٌ عن بُعد لا جولةٌ راجلة» و«Camera كاميرا تصوير لا مراقبة»
    // — القرار المكتوب في sec-shell نفسه.
    expect(src).not.toMatch(/icon=\{Radar\}/);
    expect(src).not.toMatch(/icon=\{Camera\}/);
  });

  it("الرئيسية التشغيلية: /sec بأيقونة سجل الوحدات (Shield) والتوأم بلا شكل أصم", () => {
    const src = code("src/routes/_authenticated/dashboard.tsx");
    // المادة 13.5: نفس المسار ونفس الاسم = نفس الأيقونة في كل سطح.
    expect(src).toMatch(/to: "\/sec",\s*\n\s*icon: Shield,/);
    expect(src).toMatch(/to: "\/sec\/twin", icon: Network,/);
    // Hexagon is a mute geometric shape in a semantic slot — gone for good.
    expect(src).not.toMatch(/\bHexagon\b/);
  });

  it("مشاريع الأمن الصناعي: FolderKanban لا Rocket («إطلاق» ليست «إدارة مشاريع»)", () => {
    const src = code("src/routes/_authenticated/sec.projects.tsx");
    expect(src).toMatch(/<FolderKanban className=/);
    expect(src).not.toMatch(/<Rocket\b/);
  });

  it("التوأم الرقمي: كل كيان بأيقونته الدالة — لا Camera/Radar/Crown/ShieldCheck/KeyRound", () => {
    const src = code("src/routes/_authenticated/sec.twin.tsx");
    // ما يجب أن يكون:
    expect(src).toMatch(/icon=\{Cctv\}/); // كاميرات المراقبة
    expect(src).toMatch(/icon=\{DoorOpen\}/); // البوابات المادية (نمط sec.access وSEC-03)
    expect(src).toMatch(/icon=\{Monitor\}/); // غرف التحكم (البطاقة تعدّ «الشاشات»)
    expect(src).toMatch(/icon=\{Footprints\}/); // فرق الدوريات — شجرةً وتفصيلًا
    expect(src).toMatch(/icon=\{MapPin\}/); // المنطقة الجغرافية (كانونية RegionSwitcher)
    // وما يجب ألا يعود:
    expect(src).not.toMatch(/icon=\{Camera\}/);
    expect(src).not.toMatch(/icon=\{Radar\}/);
    expect(src).not.toMatch(/icon=\{Crown\}/);
    expect(src).not.toMatch(/icon=\{ShieldCheck\}/);
    expect(src).not.toMatch(/icon=\{KeyRound\}/);
  });

  it("متابعة الأعمال العاجلة: «طلبات المساندة» بعوّامة الإنقاذ لا بدرع الامتثال", () => {
    const src = code("src/routes/_authenticated/urgent-ops.tsx");
    expect(src).toMatch(/<LifeBuoy[^>]*\/>\s*طلبات المساندة/);
    expect(src).not.toMatch(/<ShieldCheck[^>]*\/>\s*طلبات المساندة/);
  });

  it("الهوية الصوتية لسَدِيد: مايكروفون لا بريقًا عامًا", () => {
    const src = code("src/components/sadeed-core/CanonicalVoiceStatus.tsx");
    expect(src).toMatch(/Icon=\{Mic\}\s*title="الهوية الصوتية"/);
    expect(src).not.toMatch(/Icon=\{Sparkles\}\s*title="الهوية الصوتية"/);
  });
});

describe("ج — لا أيقونة واحدة لمعنيين متجاورين", () => {
  it("فئات الوكلاء: التدقيق غير الاستجابة، والاسترجاع RAG بحث وثائق لا سماعات", () => {
    const src = code("src/routes/_authenticated/agents.tsx");
    const response = src.match(/response:\s*(\w+),/)?.[1];
    const audit = src.match(/audit:\s*(\w+),/)?.[1];
    expect(response).toBeTruthy();
    expect(audit).toBeTruthy();
    // كانت ShieldAlert للفئتين معًا — فلا تُميِّز بطاقةَ تدقيق من استجابة.
    expect(audit).not.toBe(response);
    expect(src).toMatch(/rag:\s*FileSearch,/);
    expect(src).not.toMatch(/rag:\s*Headphones,/);
  });

  it("مركز التدقيق في سجل التشغيل: سجل مراجعة (ScrollText) لا «شبكة»", () => {
    const src = read("src/routes/_authenticated/operations.tsx");
    expect(src).toMatch(/<ScrollText[^>]*\/>\s*\n\s*<h3[^>]*>Audit Center<\/h3>/);
  });
});

describe("عرف لوحات السلامة — لا يُمسّ (يكمل حارس stat-tone ولا يبدّله)", () => {
  // مثمّن = خطر · مثلث = تحذير · دائرة = سليم. حارس stat-tone يثبت أن
  // الأشكال «تختلف»؛ هذا البند يثبت أنها الأشكال المتعارف عليها بأعيانها.
  it("STAT_TONES تحمل أشكال العرف بأسمائها", () => {
    const src = read("src/components/sec/sec-shell.tsx");
    expect(src).toMatch(/danger:\s*\{[^}]*icon:\s*OctagonAlert/);
    expect(src).toMatch(/warning:\s*\{[^}]*icon:\s*AlertTriangle/);
    expect(src).toMatch(/success:\s*\{[^}]*icon:\s*CheckCircle2/);
  });
});
