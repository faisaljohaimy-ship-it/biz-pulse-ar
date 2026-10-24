/**
 * ملخّص المشاريع (`getProjectsSummary`) — عقد الخصوصية والصدق (أمر المالك ٢٠٢٦/١٠/٢٤).
 *
 * الخطر هنا مزدوج: ① أن يعبر **اسم مدير** (SEC-01 — وأسماء المدراء مكشوفةٌ في `/sec/projects` بقرار
 * المالك لا في الرئيسية) إلى سطحٍ جديد؛ ② أن يملأ الاشتقاقُ غيابَ الصحّة بلونٍ («سليم»). وكلاهما
 * يُقاس على الكود والبيانات نفسها لا على نيّتهما.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PROJECTS_SUMMARY_COLUMNS,
  measuredHealth,
  summarizeProjects,
} from "@/lib/projects/projects-summary";
import { PROJECTS_REPORT_DATE, REAL_SEC_PROJECTS } from "@/lib/exec/projects-report.real.server";

const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const FN = strip(readFileSync("src/lib/projects-summary.functions.ts", "utf8"));
const PURE = strip(readFileSync("src/lib/projects/projects-summary.ts", "utf8"));
const READS = strip(readFileSync("src/components/home/home-reads.ts", "utf8"));

/** كل ما يُطلب من القاعدة بـ`.select(...)` في الشيفرة. */
const selects = (code: string) =>
  [...code.matchAll(/\.select\(\s*([^)]*)\)/g)].map((m) => m[1].trim());
/** أعمدة تحمل هويةً أو تُسرّب صفًّا كاملًا. */
const IDENTITY = /manager|contractor|name|\bref\b|notes|created_by|owner|["'`]\*["'`]/i;

describe("لا هوية في المسار — بالبنية لا بالنيّة", () => {
  it("الاستعلام الحيّ يطلب `status,health` وحدهما (ثابتٌ واحد)", () => {
    expect(PROJECTS_SUMMARY_COLUMNS).toBe("status,health");
    expect(selects(FN)).toEqual(["PROJECTS_SUMMARY_COLUMNS"]);
    expect(FN).toContain('.from("sec_projects")');
  });

  it("أعمدة الاستعلام لا تحمل اسمًا ولا مديرًا ولا مقاولًا ولا `*`", () => {
    expect(PROJECTS_SUMMARY_COLUMNS).not.toMatch(IDENTITY);
    // كاشف التجربة (المادة ٣٠): يحمرّ على استعلامٍ يسرّب.
    expect(
      selects('supabase.from("p").select("status,health,manager")').some((s) => IDENTITY.test(s)),
    ).toBe(true);
    expect(selects('supabase.from("p").select("*")').some((s) => IDENTITY.test(s))).toBe(true);
    expect(
      selects('supabase.from("p").select("status,health")').some((s) => IDENTITY.test(s)),
    ).toBe(false);
  });

  it("الدالّة لا تستورد `getProjects` (صفوف بأسماء المدراء) ولا تقرأ حقولهم", () => {
    expect(FN).not.toMatch(/\bgetProjects\b|\.manager\b|\.contractor\b|\.name_ar\b|\.name_en\b/);
    expect(PURE).not.toMatch(/\.manager\b|\.contractor\b|\.name_ar\b|\.name_en\b|\.ref\b/);
  });

  it("نوع الدخل حقلان فقط، ولا محاكاة ولا `resilient` (الصفوف حقيقية لا مرجعية)", () => {
    const row = PURE.match(/export type ProjectSummaryRow = \{([^}]*)\}/);
    expect(row?.[1].match(/readonly (\w+)/g)).toEqual(["readonly status", "readonly health"]);
    expect(FN).not.toMatch(/resilient|markSimulation|is_simulation/);
  });

  it("الكتابة غائبة: قراءةٌ فقط، بوابتها `optionalSupabaseAuth` لا `requireSupabaseAuth`", () => {
    expect(FN).toContain("optionalSupabaseAuth");
    expect(FN).not.toMatch(
      /requireSupabaseAuth|\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/,
    );
    expect(FN).toContain('method: "GET"');
  });

  it("الحمولة على بيانات التصدير الحقيقية لا تحمل أيّ اسمٍ من الصفوف الـ697", () => {
    const s = summarizeProjects(REAL_SEC_PROJECTS, "export", PROJECTS_REPORT_DATE);
    const blob = JSON.stringify(s);
    const managers = new Set(REAL_SEC_PROJECTS.map((p) => p.manager).filter(Boolean) as string[]);
    expect(managers.size).toBeGreaterThan(0);
    for (const m of managers) expect(blob).not.toContain(m);
    for (const p of REAL_SEC_PROJECTS.slice(0, 50)) expect(blob).not.toContain(p.name_ar);
  });
});

describe("الصدق العددي على التصدير المعتمد (٢٠٢٦/٠٨/٣٠)", () => {
  const s = summarizeProjects(REAL_SEC_PROJECTS, "export", PROJECTS_REPORT_DATE);

  it("العدّ يستوعب المجموعة، وحالاتها الثلاث لا تُهمل صفًّا", () => {
    expect(s.total).toBe(REAL_SEC_PROJECTS.length);
    expect(s.in_progress + s.completed + s.cancelled).toBe(s.total);
    expect(s.source).toBe("export");
    expect(s.exportDate).toBe(PROJECTS_REPORT_DATE);
  });

  it("صحّة الجارية تُقسم بلا باقٍ، وغير المقيَّم يبقى عددًا ظاهرًا لا «سليمًا»", () => {
    expect(s.at_risk + s.delayed + s.on_track + s.health_unmeasured).toBe(s.in_progress);
    const inProgress = REAL_SEC_PROJECTS.filter((p) => p.status === "in-progress");
    expect(s.health_unmeasured).toBe(inProgress.filter((p) => p.health === null).length);
    expect(s.health_unmeasured).toBeGreaterThan(0);
    expect(s.at_risk).toBe(inProgress.filter((p) => p.health === "red").length);
    expect(s.delayed).toBe(inProgress.filter((p) => p.health === "amber").length);
  });

  it("الصحّة المكتوبة خارج الثلاث تُقرأ غير مقيسة", () => {
    expect(measuredHealth("green")).toBe("green");
    expect(measuredHealth("amber")).toBe("amber");
    expect(measuredHealth("red")).toBe("red");
    expect(measuredHealth("unknown")).toBeNull();
    expect(measuredHealth(null)).toBeNull();
    expect(measuredHealth("")).toBeNull();
  });
});

describe("القراءة المشتركة `home-projects-summary`", () => {
  const block = READS.slice(READS.indexOf("const projects = useQuery"));
  const query = block.slice(0, block.indexOf("});") + 3);

  it("بوابتها `!authLoading` فقط وبلا إعادة صامتة", () => {
    expect(query).toContain('queryKey: ["home-projects-summary"]');
    expect(query).toContain("enabled: !authLoading");
    expect(query).toContain("retry: false");
    expect(query).not.toMatch(/enabled:\s*!!user/);
  });

  it("وتُصدَّر مع القراءات الأخرى (مفتاحٌ مشترك لا طلبٌ مضاعف)", () => {
    expect(READS).toMatch(/return \{[^}]*\bprojects\b[^}]*\}/);
    expect(READS).toContain('from "@/lib/projects-summary.functions"');
  });
});
