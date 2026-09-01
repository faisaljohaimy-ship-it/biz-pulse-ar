/**
 * Context Builder — normalizes the incoming BrainRequest into a compact,
 * model-friendly context block. Mirrors the block previously assembled
 * inline in `/api/public/sadeed-ask` so callers reuse one canonical shape.
 */
import type { BrainRequest } from "./types";
import { REAL_SEC_PROJECTS } from "@/lib/exec/projects-report.real.server";
import {
  buildOmsSimulation,
  buildSecProjectsSimulation,
} from "@/lib/exec/showcase-simulation.server";
import {
  buildMaintenanceContextSection,
  buildProjectsContextSection,
} from "@/lib/sadeed/projects-maintenance-context.server";

/**
 * قاعدة المعرفة الثابتة لكل الوكلاء — أمر المالك ٢٠٢٦/٠٩/٠١:
 * «اجعل جميع الوكلاء يتفاعلون ويحفظون بما فيهم سَدِيد مع البيانات المدخلة
 * **دائمًا وعلى جميع الأجهزة**».
 *
 * ── لماذا هنا بالذات ──
 * هذه الدالّة هي السياق الوحيد الذي يراه **مجلس الوكلاء** كلُّه
 * (`runAgentMission` ← `brain.server` ← هنا): قائد الحوادث ومحلّل المخاطر
 * ومراقب الامتثال ومشغّل المراقبة وقائد الدوريات وسَدِيد معهم. فوضعُ
 * البيانات هنا يبلغهم جميعًا بنقطة إدخالٍ واحدة — لا نسخةَ سياقٍ لكل وكيل
 * تفترق عن أختها.
 *
 * ── ولماذا هذا يحقّق «على جميع الأجهزة» ──
 * كان كل ما يعرفه الوكلاء يأتي من الطلب: الصفحة و`widgets` المعروضة
 * والمراسي. وتلك **تتبع المقاس**: الشاشة الضيّقة تُظهر بطاقاتٍ أقلّ، فيصل
 * الوكيل سياقٌ أفقر، فيجيب أضعف على الجوال منه على المكتب — من غير أن
 * يُخطئ أحد. هذه الكتلة تُبنى في الخادم من المجموعة كاملةً، فلا تتبع
 * مقاسًا ولا تُشتقّ ممّا صادف أن رُسم. وهي **دائمة** لا مشروطة بصفحةٍ ولا
 * بسؤال — الوكيل يعرف المشاريع وهو في شاشة الدوريات.
 *
 * ── والوسم لكل قسم ──
 * المشاريع إنتاجية `[PROD:*]` والصيانة محاكاة `[SIM:*]`، وكلٌّ يحمل وسمه
 * في متنه. الخلط في الاتجاهين خطأ (انظر `projects-maintenance-context`).
 *
 * ── وبوابة المستأجر: `orgId` ──
 * **مشاريع الإنتاج لا تبلغ نداءً بلا هوية.** صفحتها نفسها خلف
 * `_authenticated`، وأسماء المشاريع ومراجعها ومديروها وتصنيف تعثّرها
 * بياناتُ عملٍ لا تُقدَّم لمن لم يُعرَّف. فالقاعدة هنا هي قاعدة هذه الطبقة
 * نفسها المكتوبة في `BrainRequest.orgId` («بدونه تعيد حماية التسريب
 * كتلةً فارغة»): بوجوده تُقدَّم المجموعة الإنتاجية، وبغيابه تُقدَّم
 * **محاكاة المشاريع** موسومةً `[SIM:*]` — فيبقى الوكيل قادرًا على العرض
 * بلا كشف. والصيانة محاكاةٌ في الحالين فلا بوابة عليها.
 */
function buildEnterpriseKnowledgeBlock(orgId?: string | null): string {
  const projects = orgId
    ? buildProjectsContextSection(REAL_SEC_PROJECTS)
    : buildProjectsContextSection(buildSecProjectsSimulation(Date.now()), {
        provenance: "[SIM:PROJECTS]",
        note: "محاكاة مرجعية لعرض القدرة — ليست مشاريع المؤسسة.",
      });
  const lines = [
    ...projects,
    ...buildMaintenanceContextSection(buildOmsSimulation(Date.now()).work_orders),
  ];
  if (lines.length === 0) return "";
  return [
    "# ENTERPRISE DATA — دائمة ومستقلّة عن الجهاز والشاشة",
    "هذه المجموعة تُبنى في الخادم ولا تتبع ما هو معروض على الشاشة. اعتمدها حتى",
    "لو لم تكن الصفحة الحالية تعرضها. انسب كل رقم إلى وسم قسمه: [PROD:*] إنتاجي",
    "لا يُوصف بأنه محاكاة، و[SIM:*] محاكاةٌ تُوسم صراحةً.",
    ...lines,
  ].join("\n");
}

export function buildContextBlock(req: BrainRequest, memoryBlock: string): string {
  const parts: string[] = [];

  if (req.page) {
    const p = req.page;
    const line = [
      p.title ? `title=${p.title}` : null,
      p.path ? `path=${p.path}` : null,
      p.section ? `section=${p.section}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    parts.push(`# CURRENT PAGE\n${line || "(unknown)"}`);
    if (p.filters && Object.keys(p.filters).length) {
      parts.push(`# ACTIVE FILTERS\n${JSON.stringify(p.filters).slice(0, 1200)}`);
    }
    if (p.selected) {
      parts.push(`# SELECTED OBJECT\n${JSON.stringify(p.selected).slice(0, 1200)}`);
    }
  }

  if (req.widgets?.length) {
    const lines = req.widgets.slice(0, 24).map((w) => {
      const v = w.value === undefined ? "" : ` = ${JSON.stringify(w.value).slice(0, 220)}`;
      const hint = w.hint ? ` — ${w.hint}` : "";
      return `- [${w.kind}] ${w.label}${v}${hint}`;
    });
    parts.push(`# LIVE WIDGETS / KPIs ON SCREEN\n${lines.join("\n")}`);
  }

  if (req.anchors?.length) {
    parts.push(
      `# REFERENCEABLE ANCHORS (resolve "this" / "that" / "the previous X" from these)\n${req.anchors
        .map((a) => `- ${a.kind}: ${a.label ?? a.id} (${a.id})`)
        .join("\n")}`,
    );
  }

  if (req.history?.length) {
    parts.push(
      `# RECENT CONVERSATION (oldest → newest)\n${req.history
        .slice(-8)
        .map((t) => `${t.role.toUpperCase()}: ${t.text.slice(0, 400)}`)
        .join("\n")}`,
    );
  }

  if (memoryBlock) parts.push(memoryBlock);

  // قبل سطر الإسناد مباشرةً: الوكيل يقرأ البيانات ثم يُؤمر بألّا يتجاوزها.
  const enterprise = buildEnterpriseKnowledgeBlock(req.orgId);
  if (enterprise) parts.push(enterprise);

  parts.push(
    'GROUND every claim in the sections above and the GROUNDED EVIDENCE block. If a required datum is not present, say once: "Data unavailable / بيانات غير متوفرة" and stop. Never invent numbers, names, dates, or sources.',
  );

  return parts.join("\n\n");
}
