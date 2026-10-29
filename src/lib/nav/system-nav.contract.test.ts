/**
 * عقد الشريط الجانبي للنظام — «تفعيل جميع الأيقونات» (أمر المالك ٢٠٢٦/٠٩/٢٩).
 * ومنذ ٢٠٢٦/١٠/٢٩ يحرس أيضًا أمر «احذف الموجود فالمرفق من النافذه فقط» (الفصل
 * «حُذفت من النافذة فقط» أدناه).
 *
 * الرابط الميّت من النوع الذي لا يكسر بناءً ولا اختبارًا: `<Link to="/x">`
 * إلى مسارٍ محذوف أو محجوب يمرّ tsc (المسار نصّ) ويمرّ البناء، ولا يظهر إلا
 * لمن ينقر. فالوجهات تُقاس هنا على **شجرة المسارات المولَّدة نفسها**، لا على
 * قائمةٍ تُكتب بجانبها.
 */
import { existsSync, globSync, readFileSync, readdirSync } from "node:fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { isRouteHidden } from "@/lib/nav/hidden-routes";
import { SYSTEM_NAV, systemNavDestinations, type SystemNavItem } from "@/lib/nav/system-nav";
import { SCREEN_NAMES } from "@/lib/nav/screen-names";

const TREE = readFileSync("src/routeTree.gen.ts", "utf8");
const strip = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("كلُّ وجهةٍ حيّة — لا رابط ميّت", () => {
  const dests = systemNavDestinations();

  it("كلُّ وجهة مسارٌ موجود في شجرة المسارات المولَّدة", () => {
    const missing = dests.filter((d) => !TREE.includes(`'${d}'`));
    expect(missing, "وجهةٌ لا مسار لها").toEqual([]);
  });

  it("ولا وجهة محجوبة — قرار المالك «أقرب بديلٍ حيّ» بلا فكّ حجب", () => {
    // المحجوب يُعيد التوجيه، فأيقونته تفتح غير ما تسمّيه — أسوأ من غيابها.
    expect(dests.filter((d) => isRouteHidden(d))).toEqual([]);
  });

  it("ولا وجهةٌ مكرّرة — فلا يُضاء عنصران على صفحةٍ واحدة", () => {
    // كانت «الصيانة» ابنًا لـ«المرافق» ووجهةَ «الأصول والمعدات» معًا، فقِيس
    // `aria-current="page"` على عنصرين. الإضاءة المزدوجة لا يراها اختبارٌ عرضيّ.
    const dup = dests.filter((d, i) => dests.indexOf(d) !== i);
    expect(dup, "وجهةٌ في عنصرين").toEqual([]);
  });

  it("ولا وجهةٌ صفحةُ «قريباً» — البديل الحيّ ليس لافتةً فارغة", () => {
    // `/team` كانت وجهة «الأفراد» فقِيست صفحة «قريباً». والملفّ يُقرأ من
    // اسم المسار نفسه: `/sec/shifts` ← `_authenticated/sec.shifts.tsx`.
    const soon = dests.filter((d) => {
      if (d === "/") return false;
      const base = d.slice(1).replace(/\//g, ".");
      const files = [
        `src/routes/_authenticated/${base}.tsx`,
        `src/routes/_authenticated/${base}.index.tsx`,
        `src/routes/${base}.tsx`,
        `src/routes/${base}.index.tsx`,
      ].filter((f) => existsSync(f));
      return files.some((f) => readFileSync(f, "utf8").includes("coming_soon"));
    });
    expect(soon, "وجهةٌ تحمل شارة «قريباً»").toEqual([]);
    expect(readFileSync("src/routes/_authenticated/team.tsx", "utf8")).toContain("coming_soon");
  });

  it("والحارس يحمرّ على الرابط الميّت فعلًا (المادة ٣٠)", () => {
    expect(TREE.includes("'/mission-control'"), "المسار المحجوب ما زال ملفًّا").toBe(true);
    expect(isRouteHidden("/mission-control")).toBe(true);
    expect(TREE.includes("'/people'")).toBe(false);
  });
});

describe("عناصر التصميم الاثنا عشر، وبدائلُها معلنة", () => {
  it("اثنا عشر عنصرًا في المستوى الأعلى — عشرون من التصميم ناقصَ ثمانية بأمر ٢٠٢٦/١٠/٢٩", () => {
    expect(SYSTEM_NAV.length).toBe(12);
  });

  it("«مركز القيادة» يقرأ اسمه الكانوني والوجهةُ بديله الحيّ", () => {
    const cmd = SYSTEM_NAV.find((i) => i.id === "command");
    expect(cmd && cmd.kind === "link" && cmd.labelRoute).toBe("/mission-control");
    expect(cmd && cmd.kind === "link" && cmd.to).toBe("/sec/exec");
    expect(SCREEN_NAMES["/mission-control"]?.ar).toBe("مركز القيادة");
  });

  it("المناطق تُولَّد من `REGIONS` لا من قائمةٍ ثانية", () => {
    const regions = SYSTEM_NAV.find((i) => i.id === "regions");
    expect(regions && regions.kind === "group" && regions.children).toBe("regions");
    const src = strip(readFileSync("src/components/nav/SystemSidebar.tsx", "utf8"));
    expect(src).toContain("REGIONS.map");
    expect(src, "اسم منطقةٍ مكتوبٌ في الشريط").not.toMatch(/الوسطى|الغربية|الشرقية|الجنوبية/);
  });
});

/**
 * **أمر المالك ٢٠٢٦/١٠/٢٩ (المادة ٣٥):** «احذف الموجود فالمرفق من النافذه فقط».
 *
 * المرفق لقطةٌ من نافذة الشريط الجانبي تُظهر ثمانية صفوف بعينها، وصفٌّ تاسع تحتها
 * مشطوبٌ لا يُقرأ. فالمحروس ثلاثة أشياء معًا: الثمانية غائبة من السجلّ معرّفًا
 * **واسمًا** (إعادة الصفّ باسمٍ عربيٍّ ومعرّفٍ جديد عودةٌ بصمت)؛ وصفحاتها حيّة
 * غير محجوبة ومبلوغة من سطحٍ آخر («من النافذه فقط» لا «من النظام»)؛ والتاسع
 * المشطوب — التقارير والتحليلات — باقٍ لأنّ ما لم يُقرأ لم يُؤمر به. الكواشف دوالّ
 * خالصة على مصفوفة عناصر، فيُختبر المزروع عليها (المادة ٣٠).
 */
describe("أمر المالك ٢٠٢٦/١٠/٢٩ — حُذفت من النافذة فقط", () => {
  const REMOVED = [
    { id: "patrols", ar: "الدوريات", to: "/sec/patrols" },
    { id: "people", ar: "الأفراد", to: "/sec/shifts" },
    { id: "contractors", ar: "المقاولون", to: "/sec/contractors" },
    { id: "assets", ar: "الأصول والمعدات", to: "/sec/maintenance" },
    { id: "incidents", ar: "إدارة الحوادث", to: "/sec/incidents" },
    { id: "risks", ar: "إدارة المخاطر", to: "/sec/risks" },
    { id: "compliance", ar: "الامتثال والتدقيق", to: "/sec/governance" },
    { id: "investigations", ar: "التحقيقات والأدلة", to: "/sec/timeline" },
  ] as const;
  const REMOVED_IDS = new Set<string>(REMOVED.map((r) => r.id));
  const REMOVED_AR = new Set<string>(REMOVED.map((r) => r.ar));

  /** كل عنصرٍ على كل مستوى — الأبناء المكتوبون أيضًا، لا «regions» المولَّدة. */
  const flatten = (items: readonly SystemNavItem[]) =>
    items.flatMap((i) =>
      i.kind === "group" && i.children !== "regions" ? [i, ...i.children] : [i],
    );
  type Names = Readonly<Record<string, { readonly ar: string }>>;
  /**
   * الاسم العربي كما يُعرض: من سجلّ الأسماء إن كان محروسًا (`labelRoute`)، وإلا من
   * العنصر. السجلّ معاملٌ لا مرجعٌ ثابت، فيُزرع عليه اسمٌ محروس في (هـ) بلا اعتمادٍ
   * على ما يصادف أن يحويه `screen-names` اليوم (لا يحوي أيًّا من الثمانية — قِيس).
   */
  const arLabel = (i: { ar?: string; labelRoute?: string }, names: Names = SCREEN_NAMES) =>
    i.labelRoute ? names[i.labelRoute]?.ar : i.ar;
  /** (أ) معرّفات الثمانية الحاضرة. */
  const removedIdsIn = (items: readonly SystemNavItem[]) =>
    flatten(items)
      .map((i) => i.id)
      .filter((id) => REMOVED_IDS.has(id));
  /** (ب) أسماء الثمانية العربية الحاضرة — بأيّ معرّف، مكتوبةً أو محروسة. */
  const removedLabelsIn = (items: readonly SystemNavItem[], names: Names = SCREEN_NAMES) =>
    flatten(items)
      .map((i) => arLabel(i, names))
      .filter((ar): ar is string => !!ar && REMOVED_AR.has(ar));
  /**
   * رابطٌ إلى المسار في سياق ربطٍ فعلًا — `to="/x"` في JSX أو `to: "/x"` في سجلّ —
   * لا ذكرٌ عابر: وجهةُ توجيهٍ أو المسار نصًّا في قائمةٍ لا تربط يحويانه ولا يصلانه.
   */
  const linksTo = (surface: string, route: string) =>
    new RegExp(`\\bto(?:=|:\\s*)"${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(surface);
  /** مسارٌ لا يصله رابطٌ من أيٍّ من السطوح المقروءة. */
  const unreachable = (routes: readonly string[], surfaces: readonly string[]) =>
    routes.filter((r) => !surfaces.some((s) => linksTo(s, r)));

  it("(أ) ولا معرّف من الثمانية في السجلّ", () => {
    expect(removedIdsIn(SYSTEM_NAV)).toEqual([]);
  });

  it("(ب) ولا اسم من أسمائها العربية — بأيّ معرّف", () => {
    expect(removedLabelsIn(SYSTEM_NAV)).toEqual([]);
  });

  it("(ج) وصفحاتها حيّة: في الشجرة المولَّدة، غير محجوبة، ومبلوغة من سطحٍ آخر", () => {
    const routes = REMOVED.map((r) => r.to);
    expect(
      routes.filter((r) => !TREE.includes(`'${r}'`)),
      "مسارٌ سقط من الشجرة",
    ).toEqual([]);
    expect(
      routes.filter((r) => isRouteHidden(r)),
      "مسارٌ حُجب — والأمر «من النافذه فقط»",
    ).toEqual([]);
    // المقيس ٢٠٢٦/١٠/٢٩: شريط الأمن الصناعي يصل سبعةً، و`/sec/contractors` من صفحة
    // التحكم في الدخول ولوحة القيادة. السطوح تُقرأ منزوعةَ التعليقات (المادة ٣١).
    const surfaces = [
      "src/components/sec/sec-shell.tsx",
      "src/routes/_authenticated/sec.access.tsx",
      "src/routes/_authenticated/dashboard.tsx",
      "src/components/home/HomeMapCard.tsx",
    ].map((f) => strip(readFileSync(f, "utf8")));
    expect(unreachable(routes, surfaces), "صفحةٌ بلا رابطٍ من أيّ سطح").toEqual([]);
  });

  it("(د) والصفّ التاسع المشطوب — التقارير والتحليلات — باقٍ حتى يحسمه المالك", () => {
    const reports = SYSTEM_NAV.find((i) => i.id === "reports");
    expect(reports && reports.kind === "link" && reports.to).toBe("/sec/reports");
    expect(reports && arLabel(reports)).toBe("التقارير والتحليلات");
  });

  it("(هـ) والكواشف تحمرّ على المزروع (المادة ٣٠)", () => {
    const icon = SYSTEM_NAV[0].icon;
    // صفٌّ محذوف يعود بمعرّفه.
    const byId: SystemNavItem = { kind: "link", id: "patrols", to: "/sec/patrols", icon };
    expect(removedIdsIn([...SYSTEM_NAV, byId])).toEqual(["patrols"]);
    // أو باسمه العربي تحت معرّفٍ جديد — وفي مجموعةٍ لا في المستوى الأعلى.
    const byLabel: SystemNavItem = {
      kind: "group",
      id: "ops",
      ar: "العمليات",
      en: "Operations",
      icon,
      children: [{ id: "x1", to: "/sec/patrols", ar: "الدوريات", en: "Patrols", icon }],
    };
    expect(removedIdsIn([...SYSTEM_NAV, byLabel])).toEqual([]);
    expect(removedLabelsIn([...SYSTEM_NAV, byLabel])).toEqual(["الدوريات"]);
    // أو باسمٍ محروس يُقرأ من سجلّ الأسماء لا يُكتب في العنصر — على سجلٍّ مزروع، فلا
    // شرط يُسقط الفحص حين لا يحوي `screen-names` الاسم (وهو لا يحويه اليوم).
    const byRoute: SystemNavItem = { kind: "link", id: "x2", to: "/sec", labelRoute: "/x", icon };
    const planted: Names = { ...SCREEN_NAMES, "/x": { ar: "إدارة الحوادث" } };
    expect(removedLabelsIn([...SYSTEM_NAV, byRoute], planted)).toEqual(["إدارة الحوادث"]);
    expect(removedLabelsIn([...SYSTEM_NAV, byRoute])).toEqual([]);
    expect(
      Object.values(SCREEN_NAMES).filter((n) => REMOVED_AR.has(n.ar)),
      "صار في screen-names اسمٌ من الثمانية — فالكاشف (ب) يقرؤه عبر labelRoute",
    ).toEqual([]);
    // وحذف الصفحة نفسها يُمسَك: مسارٌ بلا رابط في أيّ سطح. والرابط بصيغتيه يُرضي
    // الكاشف، أمّا الذكر العابر (وجهة توجيهٍ، أو المسار في قائمةٍ لا تربط) فلا.
    expect(unreachable(["/sec/patrols"], ['<Link to="/sec/shifts">'])).toEqual(["/sec/patrols"]);
    expect(unreachable(["/sec/patrols"], ['<Link to="/sec/patrols">'])).toEqual([]);
    expect(unreachable(["/sec/patrols"], ['{ to: "/sec/patrols", label: "x" }'])).toEqual([]);
    expect(
      unreachable(
        ["/sec/patrols"],
        ['redirect({ href: "/sec/patrols" })', 'const HIDDEN = ["/sec/patrols"];'],
      ),
    ).toEqual(["/sec/patrols"]);
    // ولا يحمرّ على السجلّ كما هو.
    expect(removedIdsIn(SYSTEM_NAV)).toEqual([]);
    expect(removedLabelsIn(SYSTEM_NAV)).toEqual([]);
  });
});

describe("السند يتبع الشريط المثبَّت في كل قاعدة — لا تغطية ولا فجوة", () => {
  /**
   * الشريط `fixed` خارج المسار، فالمحتوى يُزاح بسندٍ في المسار. وكل قاعدةٍ
   * تغيّر عرض الشريط أو ظهوره ولا تغيّر السند تفصل بينهما بصمت: قِيس ٦٦٧×٣٧٥
   * شريطًا 56px فوق المحتوى والسندُ مخفيّ، و٨٤٤×٣٩٠ فجوةً 168px، و٢٤٠٠
   * تغطيةً 64px، ووضعَ العرض عمودًا فارغًا 287px. tsc والبناء لا يريان شيئًا.
   */
  const SIZING = new Set([
    "display",
    "width",
    "inline-size",
    "min-width",
    "max-width",
    "min-inline-size",
    "max-inline-size",
  ]);

  /**
   * **القشرة القديمة سقطت كلّها — أمر المالك ٢٠٢٦/١٠/١٨ (المادة ٣٥):** «اجعل جميع
   * صفحات النظام بنفس تخطيط وهيئة الصفحة الرئيسية». فالشريط الأيمن `.nexus-sidebar`
   * وسنده `.nexus-sidebar-spacer` وشريطه الأفقي 56px (وبطاقة الختام فيه) وترويسة
   * الجوال `.nexus-mobile-header` وسطح `.glass-sidebar` حُذفت من القشرة والأنماط
   * معًا، والشريط الواحد يسارًا (`.nx-sysnav[data-side="left"]`) في كل صفحة — وعقده
   * أدناه. **فسقطت بنود السند الأيمن والشريط الأفقي لزوال موضوعها، لا تخفيفًا**: كانت
   * ستمرّ فارغةً على أنماطٍ لا قاعدة فيها (`unmatched` على ملفٍّ بلا `.nexus-sidebar`
   * يعيد `[]` دائمًا). وحلّ محلّها حارسُ الغياب: لا محدِّد في أيّ ورقة أنماط، ولا صنفَ
   * مكتوبًا في أيّ مكوّن، من القشرة القديمة — فعودةُ أيٍّ منها تعيد شريطًا ثانيًا أو
   * ترويسةً ثانية بلا سندٍ يحرسه.
   */
  const OLD_SHELL_NAMES =
    "nexus-sidebar(?:-spacer)?|nexus-mobile-header|nexus-app-shell|glass-sidebar";
  const OLD_SHELL_SELECTOR = new RegExp(`\\.(?:${OLD_SHELL_NAMES})(?![\\w-])`);
  const OLD_SHELL_TOKEN = new RegExp(`(?<![\\w-])(?:${OLD_SHELL_NAMES})(?![\\w-])`, "g");
  /** محدِّداتٌ من القشرة القديمة كما يراها المحلِّل — شرحٌ في تعليق لا يُعدّ قاعدة. */
  const oldShellSelectors = (css: string): string[] => {
    const out: string[] = [];
    postcss.parse(css).walkRules((rule) => {
      for (const s of rule.selectors) if (OLD_SHELL_SELECTOR.test(s)) out.push(s.trim());
    });
    return out;
  };
  /** أصنافٌ من القشرة القديمة في الكود منزوعَ التعليقات — `className` و`cn()` والقوالب معًا. */
  const oldShellClasses = (code: string): string[] => strip(code).match(OLD_SHELL_TOKEN) ?? [];

  it("لا محدِّد ولا صنف من القشرة القديمة — شريطٌ واحد يسارًا في كل صفحة", () => {
    const sheets = ["src/styles.css", ...globSync("src/styles/**/*.css")];
    expect(sheets.length, "لم تُقرأ أنماط الرئيسية").toBeGreaterThan(1);
    for (const file of sheets) {
      expect(oldShellSelectors(readFileSync(file, "utf8")), file).toEqual([]);
    }
    const components = globSync("src/**/*.tsx").filter((f) => !/\.test\.tsx$/.test(f));
    expect(components.length, "لم تُقرأ المكوّنات").toBeGreaterThan(100);
    for (const file of components) {
      expect(oldShellClasses(readFileSync(file, "utf8")), file).toEqual([]);
    }

    // يحمرّ على المزروع (المادة ٣٠): الشريط الأفقي 56px يعود، وسنده، وصنفاه في مكوّن —
    // ولا يحمرّ على شرحٍ في تعليق، ولا على صنف الشريط الجديد.
    expect(oldShellSelectors(".nexus-sidebar { width: 56px }")).toEqual([".nexus-sidebar"]);
    expect(
      oldShellSelectors(
        "@media (min-width: 2200px) { .nexus-sidebar-spacer, html.dark .glass-sidebar { width: 22rem; } }",
      ),
    ).toEqual([".nexus-sidebar-spacer", "html.dark .glass-sidebar"]);
    expect(oldShellSelectors("/* .nexus-sidebar { width: 56px } */")).toEqual([]);
    expect(oldShellSelectors('.nx-sysnav[data-side="left"] { inline-size: 14rem; }')).toEqual([]);
    expect(
      oldShellClasses('<aside className="nexus-sidebar glass-sidebar hidden lg:flex" />'),
    ).toEqual(["nexus-sidebar", "glass-sidebar"]);
    expect(oldShellClasses('<header className={cn("nexus-mobile-header", x)} />')).toEqual([
      "nexus-mobile-header",
    ]);
    expect(oldShellClasses("// كانت `nexus-sidebar` هنا\nconst a = 1;")).toEqual([]);
  });

  it("ووضع العرض يُخفي ترويسة النظام وسندها، والشريط وسنده", () => {
    const header = readFileSync("src/components/nav/SystemHeader.tsx", "utf8");
    expect(header).toMatch(/<header\s+data-nx-presentation-hide/);
    const side = readFileSync("src/components/nav/SystemSidebar.tsx", "utf8");
    expect(side).toMatch(
      /<div\s+aria-hidden\s+data-nx-presentation-hide\s+className="nx-sysnav-spacer /,
    );
    expect(side).toMatch(/<aside\s+data-nx-presentation-hide\s+className="nx-sysnav /);
    // وسند الترويسة المثبَّتة دون 1024 (M5) يُخفى معها — وإلا بقي في وضع العرض
    // شريطٌ فارغٌ بارتفاعها فوق الصفحة.
    const spacer = /<div aria-hidden data-nx-presentation-hide className="nx-hdr-spacer"/;
    expect(header).toMatch(spacer);
    // يحمرّ على المزروع (المادة ٣٠): سندٌ بلا سمة وضع العرض.
    const bare = header.replace(
      '<div aria-hidden data-nx-presentation-hide className="nx-hdr-spacer"',
      '<div aria-hidden className="nx-hdr-spacer"',
    );
    expect(bare).not.toBe(header);
    expect(bare).not.toMatch(spacer);
  });

  /**
   * الشريط يسارًا في كل صفحة (قرار المالك D5، ٢٠٢٦/١٠/١٣، ممدودًا بأمر ٢٠٢٦/١٠/١٨:
   * «اجعل جميع صفحات النظام بنفس تخطيط وهيئة الصفحة الرئيسية») — بصنفه (`.nx-sysnav`)
   * وسنده (`.nx-sysnav-spacer`) وقواعدِ جهته في `home-chrome.css`. والقاعدة تُفحص
   * على كل ورقة (المادة ٣١): كل قاعدة عرضٍ على الشريط الأيسر تسمّي سنده الأيسر في
   * المحدِّد نفسه، والجهة مكتوبةٌ على الاثنين معًا — والعرض نفسه **رمزٌ واحد**
   * (`--nx-sysnav-w`، CRITIC M13) يقرؤه الشريط وسنده ومُطلق سَدِيد و`sizes` البانر.
   */
  const LEFT = '.nx-sysnav[data-side="left"]';
  const LEFT_SPACER = '.nx-sysnav-spacer[data-side="left"]';
  const leftSizing = (css: string) => {
    const unpaired: string[] = [];
    let sized = 0;
    postcss.parse(css).walkRules((rule) => {
      const own = rule.selectors.filter((s) => s.trim().endsWith(LEFT));
      if (own.length === 0) return;
      if (!rule.nodes.some((n) => n.type === "decl" && SIZING.has(n.prop))) return;
      sized += 1;
      for (const s of own) {
        const twin = s.trim().slice(0, -LEFT.length) + LEFT_SPACER;
        if (!rule.selectors.some((x) => x.trim() === twin)) unpaired.push(s.trim());
      }
    });
    return { sized, unpaired };
  };
  /** أدوات العرض في صنفٍ مكتوب — `lg:w-56` · `xl:w-72`. */
  const widths = (cls: string | undefined) =>
    (cls?.match(/(?:^|\s)(?:(?:sm|md|lg|xl|2xl):)?w-\S+/g) ?? []).map((s) => s.trim()).sort();
  /** عرض الشريط من رمزه بالبكسل (rem × 16) — `NaN` إن غاب الرمز. */
  const tokenPx = (css: string) => {
    const m = /--nx-sysnav-w:\s*([\d.]+)rem\s*;/.exec(css);
    return m ? Number(m[1]) * 16 : NaN;
  };
  /** أداة العرض `lg:w-N` بالبكسل — سلّم Tailwind ‏N × 4px. */
  const utilityPx = (cls: string | undefined) => {
    const m = /(?:^|\s)lg:w-(\d+)(?=\s|$)/.exec(cls ?? "");
    return m ? Number(m[1]) * 4 : NaN;
  };
  /** قيم العرض المكتوبة على الشريط الأيسر في ورقة — كلّها يجب أن تقرأ الرمز لا رقمًا ثانيًا. */
  const leftWidths = (css: string) => {
    const out: string[] = [];
    postcss.parse(css).walkRules((rule) => {
      if (!rule.selectors.some((s) => s.trim().endsWith(LEFT))) return;
      rule.walkDecls(/^(?:inline-size|width)$/, (d) => {
        out.push(d.value.trim());
      });
    });
    return out;
  };

  it("الشريط يسارًا في كل صفحة: كل قاعدة عرضٍ تسمّي سنده، والعرض رمزٌ واحد (D5 · M13)", () => {
    const sheets = [
      "src/styles.css",
      ...readdirSync("src/styles/home")
        .filter((f) => f.endsWith(".css"))
        .map((f) => `src/styles/home/${f}`),
    ];
    let sized = 0;
    for (const file of sheets) {
      const r = leftSizing(readFileSync(file, "utf8"));
      expect(r.unpaired, `${file}: قاعدةٌ بلا نظيرٍ للسند الأيسر`).toEqual([]);
      sized += r.sized;
    }
    // لا حلقة فوق فراغ: عرض الشريط الأيسر مكتوبٌ في الأنماط فعلًا.
    expect(sized, "لا قاعدة عرضٍ للشريط الأيسر — بطل الفحص").toBeGreaterThan(0);
    // والجهة مكتوبةٌ حرفيًّا على الشريط وسنده معًا (لا خاصيّة `side` بعد اليوم — الشريط
    // يسارًا في كل صفحة)، وعرضاهما في المكوّن واحد.
    const side = readFileSync("src/components/nav/SystemSidebar.tsx", "utf8");
    const spacerCls = /className="(nx-sysnav-spacer [^"]*)"\s+data-side="left"/.exec(side)?.[1];
    const asideCls = /<aside[\s\S]{0,200}?className="(nx-sysnav [^"]*)"\s+data-side="left"/.exec(
      side,
    )?.[1];
    expect(spacerCls, "السند لا يحمل الجهة").toBeDefined();
    expect(asideCls, "الشريط لا يحمل الجهة").toBeDefined();
    expect(widths(spacerCls).length, "لا عرض مكتوب للسند").toBeGreaterThan(0);
    expect(widths(asideCls), "عرض الشريط غير عرض سنده").toEqual(widths(spacerCls));
    // **والعرض رمزٌ واحد (CRITIC M13):** `--nx-sysnav-w` في home-chrome.css، تقرؤه قاعدة
    // العرض بالاسم لا برقمٍ ثانٍ، وأداة المكوّن (`lg:w-56`) تساويه بكسلًا بكسلًا — وفي مدى
    // المواصفة (§4.0: ‏216–232px على المكتب). فرقمٌ ثانٍ في أيّ موضعٍ يفترق يومًا بصمت.
    const chromeCss = readFileSync("src/styles/home/home-chrome.css", "utf8");
    const px = tokenPx(chromeCss);
    expect(px, "لا رمز لعرض الشريط في home-chrome.css").not.toBeNaN();
    expect(px).toBeGreaterThanOrEqual(216);
    expect(px).toBeLessThanOrEqual(232);
    expect(utilityPx(asideCls), "أداة الشريط غير رمزه").toBe(px);
    expect(utilityPx(spacerCls), "أداة السند غير رمز الشريط").toBe(px);
    const values = leftWidths(chromeCss);
    expect(values.length, "لا قاعدة عرضٍ تقرأ الرمز").toBeGreaterThan(0);
    expect(new Set(values), "قاعدة عرضٍ برقمٍ لا بالرمز").toEqual(new Set(["var(--nx-sysnav-w)"]));

    // يحمرّ على المزروع (المادة ٣٠): عرضٌ للشريط بلا سنده، وعرضان مختلفان، ورمزٌ ورقمٌ
    // يفترقان.
    expect(
      leftSizing(`@media (min-width: 1536px) { ${LEFT} { inline-size: 16rem; } }`).unpaired,
    ).toEqual([LEFT]);
    expect(leftSizing(`${LEFT_SPACER}, ${LEFT} { inline-size: 14rem; }`).unpaired).toEqual([]);
    // ولا يحمرّ على قواعد الأبناء — تلك لا تغيّر عرض الشريط.
    expect(leftSizing(`${LEFT} .nx-sysnav-scroll { inline-size: 100%; }`).sized).toBe(0);
    const drifted = asideCls?.replace("lg:w-56", "lg:w-60");
    expect(drifted).not.toBe(asideCls);
    expect(widths(drifted)).not.toEqual(widths(spacerCls));
    expect(utilityPx(drifted)).not.toBe(px);
    const wider = chromeCss.replace(/--nx-sysnav-w:\s*14rem/, "--nx-sysnav-w: 16rem");
    expect(wider).not.toBe(chromeCss);
    expect(tokenPx(wider), "16rem بجانب lg:w-56").not.toBe(utilityPx(asideCls));
    expect(leftWidths(`${LEFT_SPACER}, ${LEFT} { inline-size: 14rem; }`)).toEqual(["14rem"]);
  });
});

/**
 * **قشرةٌ واحدة في كل صفحة نظام — أمر المالك ٢٠٢٦/١٠/١٨ (المادة ٣٥):** «اجعل جميع
 * صفحات النظام بنفس تخطيط وهيئة الصفحة الرئيسية».
 *
 * كان هذا الفصل «نسخةٌ واحدة في السطحين»: القشرة الداخلية (`app-shell`) والرئيسية
 * تركّب كلٌّ منهما الشريط بنفسها — الرئيسية يسارًا (D5) والقشرة يمينًا («وبقية الصفحات
 * على شريطها الأيمن»). ونسخ الأمرُ الجديد العبارتين معًا: الشريط والترويسة ولوحة
 * الأوامر والخلفية في `SystemChrome` وحدها، تُركَّب **مرّةً في الجذر** حول كل صفحة نظام
 * خارج انتقال المسارات. فالحارس يحرس آخر المحطّات: تركيبٌ واحد بلا جهة، ولا جزءٌ منه في
 * القشرة الداخلية ولا في الرئيسية — جزءٌ يُركَّب هناك نسخةٌ ثانية تتراكب على الأولى.
 */
describe("قشرةٌ واحدة في كل صفحة نظام", () => {
  /** تركيبات الشريط الكامل — `<SystemSidebarNav` (القائمة وحدها) لا يُحسب منها. */
  const sidebarMounts = (code: string) => code.match(/<SystemSidebar\b[^>]*\/>/g) ?? [];
  /** قائمة عناصر مكتوبة داخل ملفّ = نسخةٌ ثانية تفترق يومًا بصمت. */
  const secondList = (code: string) => code.match(/\bto: "\//g) ?? [];
  /** أجزاء القشرة — تملكها `SystemChrome` وحدها. */
  const chromeParts = (code: string) =>
    [...code.matchAll(/<(SystemSidebar|SystemHeader|CommandPalette|HoloVideoEngine)\b/g)].map(
      (m) => m[1],
    );
  const code = (p: string) => strip(readFileSync(p, "utf8"));
  /** الكود منزوع التعليقات لكل مكوّنٍ وصفحة (لا الاختبارات) — المادة ٣١: المسح بالأثر. */
  const sources = (): [string, string][] =>
    [...globSync("src/**/*.tsx"), ...globSync("src/**/*.ts")]
      .filter((f) => !/\.test\.tsx?$/.test(f))
      .map((f) => [f, code(f)]);

  it("القشرة تركّب الشريط مرّةً بلا جهة، والجذر يركّب القشرة مرّةً — ولا جزء منها في غيرها", () => {
    const chrome = code("src/components/nav/SystemChrome.tsx");
    const shell = code("src/components/app-shell.tsx");
    const home = code("src/routes/-blueprint-page.tsx");
    const root = code("src/routes/__root.tsx");
    expect(sidebarMounts(chrome), "القشرة لا تركّب الشريط مرّةً واحدة").toEqual([
      "<SystemSidebar />",
    ]);
    // الجهة لم تعد خاصيّة: الشريط يسارًا في كل صفحة («بنفس تخطيط … الرئيسية»).
    expect(chrome, "عادت الجهة خاصيّةً تُمرَّر").not.toMatch(/\bside=/);
    expect(root.match(/<SystemChrome\b/g) ?? [], "الجذر لا يركّب القشرة مرّةً واحدة").toHaveLength(
      1,
    );
    expect(chromeParts(shell), "القشرة الداخلية تركّب جزءًا من القشرة").toEqual([]);
    expect(chromeParts(home), "الرئيسية تركّب جزءًا من القشرة").toEqual([]);
    expect(secondList(shell), "قائمة تنقّل ثانية في القشرة الداخلية").toEqual([]);
    expect(secondList(chrome), "قائمة تنقّل ثانية في القشرة").toEqual([]);

    // يحمرّ على المزروع (المادة ٣٠): شريطٌ في القشرة الداخلية، وشريطٌ ثانٍ بجهة في
    // القشرة، وقشرةٌ ثانية في الجذر، وقائمةٌ مكتوبة.
    expect(chromeParts(`${shell}\n<SystemSidebar />`)).toEqual(["SystemSidebar"]);
    expect(chromeParts(`${home}\n<CommandPalette />\n<HoloVideoEngine />`)).toEqual([
      "CommandPalette",
      "HoloVideoEngine",
    ]);
    const doubled = `${chrome}\n<SystemSidebar side="start" />`;
    expect(sidebarMounts(doubled)).toHaveLength(2);
    expect(doubled).toMatch(/\bside=/);
    expect(`${root}\n<SystemChrome mode="system" />`.match(/<SystemChrome\b/g)).toHaveLength(2);
    expect(secondList(`${chrome}\nconst ITEMS = [{ to: "/sec" }];`)).toHaveLength(1);
    expect(sidebarMounts("<SystemSidebarNav />")).toEqual([]);
  });

  it("زرّ البحث حيّ في كل صفحة — لوحة أوامرٍ واحدة في التطبيق كلّه", () => {
    // اللوحة في القشرة وحدها: زرّ البحث في الترويسة وCtrl/⌘+K يفتحانها في كل صفحة
    // نظام. ولوحةٌ ثانية تُركَّب في صفحةٍ تُفتح مرّتين على الضغطة الواحدة.
    const chrome = code("src/components/nav/SystemChrome.tsx");
    expect(chrome).toContain("<CommandPalette />");
    expect(chrome).toContain("<SystemHeader />");
    expect(readFileSync("src/components/executive/CommandPalette.tsx", "utf8")).toContain(
      '"nx:open-command-palette"',
    );
    expect(readFileSync("src/components/nav/SystemHeader.tsx", "utf8")).toContain(
      '"nx:open-command-palette"',
    );
    const paletteMounts = (files: readonly (readonly [string, string])[]) =>
      files
        .filter(([f]) => f.endsWith(".tsx") && !f.endsWith("/CommandPalette.tsx"))
        .reduce((n, [, c]) => n + (c.match(/<CommandPalette\b/g) ?? []).length, 0);
    const all = sources();
    expect(paletteMounts(all), "لوحة الأوامر ليست مركَّبةً مرّةً واحدة").toBe(1);
    // يحمرّ على المزروع (المادة ٣٠): لوحةٌ ثانية في صفحة.
    expect(paletteMounts([...all, ["src/routes/x.tsx", "<CommandPalette />"]])).toBe(2);
  });

  /** الأسماء المستوردة بعينها من وحدةٍ ينتهي مسارها بـ`/<leaf>`. */
  const importedNames = (src: string, leaf: string) =>
    [...src.matchAll(new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*"[^"]*/${leaf}"`, "g"))]
      .flatMap((m) => m[1].split(","))
      .map((n) =>
        n
          .replace(/^\s*type\s+/, "")
          .split(/\s+as\s+/)[0]
          .trim(),
      )
      .filter(Boolean);
  /** يركّب الشريط الكامل والترويسة معًا — أي يبني قشرة. */
  const composesChrome = (src: string) =>
    importedNames(src, "SystemSidebar").includes("SystemSidebar") &&
    importedNames(src, "SystemHeader").includes("SystemHeader");

  it("ملفٌّ واحد يستورد الشريط والترويسة معًا: `SystemChrome` — لا قشرة ثانية تُبنى", () => {
    const builders = sources()
      .filter(([, c]) => composesChrome(c))
      .map(([f]) => f);
    expect(builders, "قشرةٌ ثانية تُبنى خارج SystemChrome").toEqual([
      "src/components/nav/SystemChrome.tsx",
    ]);
    // يحمرّ على المزروع (المادة ٣٠): صفحةٌ تستورد الاثنين — ولا يحمرّ على الترويسة التي
    // تستورد القائمة وبطاقتها من ملفّ الشريط (`SystemSidebarNav` ليست الشريط).
    expect(
      composesChrome(
        'import { SystemSidebar } from "@/components/nav/SystemSidebar";\nimport { SystemHeader } from "./SystemHeader";',
      ),
    ).toBe(true);
    expect(
      composesChrome(
        'import { SystemSidebarCard, SystemSidebarNav } from "@/components/nav/SystemSidebar";\nimport { SystemHeader } from "@/components/nav/SystemHeader";',
      ),
    ).toBe(false);
  });
});
