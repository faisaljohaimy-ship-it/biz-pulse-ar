/**
 * عقد الشريط الجانبي للنظام — «تفعيل جميع الأيقونات» (أمر المالك ٢٠٢٦/٠٩/٢٩).
 *
 * الرابط الميّت من النوع الذي لا يكسر بناءً ولا اختبارًا: `<Link to="/x">`
 * إلى مسارٍ محذوف أو محجوب يمرّ tsc (المسار نصّ) ويمرّ البناء، ولا يظهر إلا
 * لمن ينقر. فالوجهات تُقاس هنا على **شجرة المسارات المولَّدة نفسها**، لا على
 * قائمةٍ تُكتب بجانبها.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { isRouteHidden } from "@/lib/nav/hidden-routes";
import { SYSTEM_NAV, systemNavDestinations } from "@/lib/nav/system-nav";
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

describe("عناصر التصميم العشرون، وبدائلُها معلنة", () => {
  it("عشرون عنصرًا في المستوى الأعلى كما في التصميم", () => {
    expect(SYSTEM_NAV.length).toBe(20);
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
  const unmatched = (css: string) => {
    const out: string[] = [];
    postcss.parse(css).walkRules((rule) => {
      const own = rule.selectors.filter((s) => /\.nexus-sidebar$/.test(s.trim()));
      if (own.length === 0) return;
      const sizes = rule.nodes.some((n) => n.type === "decl" && SIZING.has(n.prop));
      if (!sizes) return;
      for (const s of own) {
        const twin = s.trim().replace(/\.nexus-sidebar$/, ".nexus-sidebar-spacer");
        if (!rule.selectors.some((x) => x.trim() === twin)) out.push(s.trim());
      }
    });
    return out;
  };

  it("كل قاعدة عرضٍ أو إظهار على `.nexus-sidebar` تسمّي السندَ في المحدِّد نفسه", () => {
    expect(unmatched(readFileSync("src/styles.css", "utf8")), "قاعدةٌ بلا نظيرٍ للسند").toEqual([]);
  });

  it("والسند يحمل الصنف في القشرة", () => {
    const shell = strip(readFileSync("src/components/app-shell.tsx", "utf8"));
    expect(shell).toMatch(/<div\s+aria-hidden\s+className="nexus-sidebar-spacer /);
  });

  it("والحارس يحمرّ على قاعدةٍ بلا نظير (المادة ٣٠)", () => {
    const bad = "@media (min-width: 2200px) { .nexus-sidebar { width: 22rem !important; } }";
    expect(unmatched(bad)).toEqual([".nexus-sidebar"]);
    const presenting = "html.nx-presenting .nexus-sidebar { display: none !important; }";
    expect(unmatched(presenting)).toEqual(["html.nx-presenting .nexus-sidebar"]);
    // ولا يحمرّ على قواعد الأبناء — تلك لا تغيّر عرض الشريط.
    expect(unmatched(".nexus-sidebar nav a { display: none; }")).toEqual([]);
  });

  it("ووضع العرض يُخفي ترويسة النظام وشريط الرئيسية وسنده", () => {
    expect(readFileSync("src/components/nav/SystemHeader.tsx", "utf8")).toMatch(
      /<header\s+data-nx-presentation-hide/,
    );
    const side = readFileSync("src/components/nav/SystemSidebar.tsx", "utf8");
    expect(side).toMatch(
      /<div\s+aria-hidden\s+data-nx-presentation-hide\s+className="nx-sysnav-spacer /,
    );
    expect(side).toMatch(/<aside\s+data-nx-presentation-hide\s+className="nx-sysnav /);
  });

  /**
   * وعلى الرئيسية الشريط يسارًا (قرار المالك D5، ٢٠٢٦/١٠/١٣) — بصنفٍ آخر
   * (`.nx-sysnav`) وسندٍ آخر (`.nx-sysnav-spacer`)، وقواعدِ جهةٍ في أنماط الرئيسية
   * لا يراها الفحص أعلاه (يقرأ `.nexus-sidebar` في `styles.css` وحده). فالقاعدة
   * نفسها تُفحص على السطح الثاني (المادة ٣١): كل قاعدة عرضٍ على الشريط الأيسر
   * تسمّي سنده الأيسر في المحدِّد نفسه، والجهة مكتوبةٌ على الاثنين معًا.
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
  /** أدوات العرض في صنفٍ مكتوب — `lg:w-64` · `xl:w-72`. */
  const widths = (cls: string | undefined) =>
    (cls?.match(/(?:^|\s)(?:(?:sm|md|lg|xl|2xl):)?w-\S+/g) ?? []).map((s) => s.trim()).sort();

  it("وعلى الرئيسية يسارًا (D5): كل قاعدة عرضٍ على الشريط الأيسر تسمّي سنده الأيسر", () => {
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
    // والجهة تُكتب على الشريط وسنده معًا، وعرضاهما في المكوّن واحد.
    const side = readFileSync("src/components/nav/SystemSidebar.tsx", "utf8");
    const spacerCls = /className="(nx-sysnav-spacer [^"]*)"\s+data-side=\{side\}/.exec(side)?.[1];
    const asideCls = /<aside[\s\S]{0,200}?className="(nx-sysnav [^"]*)"\s+data-side=\{side\}/.exec(
      side,
    )?.[1];
    expect(spacerCls, "السند لا يحمل الجهة").toBeDefined();
    expect(asideCls, "الشريط لا يحمل الجهة").toBeDefined();
    expect(widths(spacerCls).length, "لا عرض مكتوب للسند").toBeGreaterThan(0);
    expect(widths(asideCls), "عرض الشريط غير عرض سنده").toEqual(widths(spacerCls));

    // يحمرّ على المزروع (المادة ٣٠): عرضٌ للشريط بلا سنده، وعرضان مختلفان.
    expect(
      leftSizing(`@media (min-width: 1536px) { ${LEFT} { inline-size: 16rem; } }`).unpaired,
    ).toEqual([LEFT]);
    expect(leftSizing(`${LEFT_SPACER}, ${LEFT} { inline-size: 14rem; }`).unpaired).toEqual([]);
    // ولا يحمرّ على قواعد الأبناء — تلك لا تغيّر عرض الشريط.
    expect(leftSizing(`${LEFT} .nx-sysnav-scroll { inline-size: 100%; }`).sized).toBe(0);
    const drifted = asideCls?.replace("xl:w-72", "xl:w-80");
    expect(drifted).not.toBe(asideCls);
    expect(widths(drifted)).not.toEqual(widths(spacerCls));
  });
});

describe("نسخةٌ واحدة في السطحين", () => {
  /** تركيبات الشريط الكامل — `<SystemSidebarNav` (القائمة وحدها) لا يُحسب منها. */
  const sidebarMounts = (code: string) => code.match(/<SystemSidebar\b[^>]*\/>/g) ?? [];
  /** قائمة عناصر مكتوبة داخل ملفّ = نسخةٌ ثانية تفترق يومًا بصمت. */
  const secondList = (code: string) => code.match(/\bto: "\//g) ?? [];
  /** القائمة تُركَّب بالجهة اليسرى — وهي للرئيسية وحدها (D5). */
  const leftList = (code: string) => code.match(/<SystemSidebarNav\b[^>]*\bside="left"/g) ?? [];

  it("القشرة والرئيسية تركّبان المكوّن نفسه — ولا قائمة ثانية في القشرة", () => {
    const shell = strip(readFileSync("src/components/app-shell.tsx", "utf8"));
    const home = strip(readFileSync("src/routes/-blueprint-page.tsx", "utf8"));
    expect(shell).toContain("<SystemSidebarNav");
    // **الرئيسية تركّب الشريط يسارًا — قرار المالك D5 (٢٠٢٦/١٠/١٣، المواصفة ١٠ §٢
    // و§4.0): «كما في الصورة حرفيًّا».** المكوّن نفسه بجهةٍ (`side="left"`) لا نسخةٌ
    // ثانية، ومرّةً واحدة: شريطان على صفحةٍ واحدة قائمتان تفترقان.
    expect(sidebarMounts(home), "الرئيسية لا تركّب الشريط يسارًا مرّةً واحدة").toEqual([
      '<SystemSidebar side="left" />',
    ]);
    // «وبقية الصفحات على شريطها الأيمن» (D5): القشرة لا تمرّر الجهة اليسرى.
    expect(leftList(shell), "القشرة نقلت الشريط إلى اليسار").toEqual([]);
    expect(secondList(shell), "قائمة تنقّل ثانية في القشرة").toEqual([]);

    // يحمرّ على المزروع (المادة ٣٠): شريطٌ بلا جهة، وشريطٌ مكرّر، وقشرةٌ يسرى،
    // وقائمةٌ في القشرة.
    const unsided = home.replace('<SystemSidebar side="left" />', "<SystemSidebar />");
    expect(unsided).not.toBe(home);
    expect(sidebarMounts(unsided)).toEqual(["<SystemSidebar />"]);
    expect(sidebarMounts(`${home}\n<SystemSidebar side="left" />`)).toHaveLength(2);
    const leftShell = shell.replace(
      "<SystemSidebarNav onNavigate={onNavigate} />",
      '<SystemSidebarNav side="left" onNavigate={onNavigate} />',
    );
    expect(leftShell).not.toBe(shell);
    expect(leftList(leftShell)).toHaveLength(1);
    expect(secondList(`${shell}\nconst ITEMS = [{ to: "/sec" }];`)).toHaveLength(1);
    expect(sidebarMounts('<SystemSidebarNav side="left" />')).toEqual([]);
  });

  it("زرّ البحث حيّ على الرئيسية — لوحة الأوامر مركَّبة فيها", () => {
    // القشرة تركّب اللوحة على غير `/` وحده، فبدون هذا يصير الزرّ ميتًا.
    const home = strip(readFileSync("src/routes/-blueprint-page.tsx", "utf8"));
    expect(home).toContain("<CommandPalette />");
    expect(home).toContain("<SystemHeader withMenu />");
    expect(readFileSync("src/components/executive/CommandPalette.tsx", "utf8")).toContain(
      '"nx:open-command-palette"',
    );
    expect(readFileSync("src/components/nav/SystemHeader.tsx", "utf8")).toContain(
      '"nx:open-command-palette"',
    );
  });
});
