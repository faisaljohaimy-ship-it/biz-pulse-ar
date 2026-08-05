/**
 * سجلّ روايات FINN — حارس العقد (المادة ٢٢).
 *
 * لماذا يوجد هذا الحارس
 * السجلّ كان يحمل صفوفًا لشاشات مُزالة (`/hajj`, `/hajj-prime`, `/films`,
 * `/executive-showcase`, `/theater`, `/learn`, `/analytics`,
 * `/executive-reports`) ومفاتيح بصيغة مُعرّف الملف (`/_authenticated/sec.kpi`)
 * لا بصيغة مسار الموجّه (`/sec/kpi`). العطلان يتكاملان بأسوأ صورة: مفتاح لا
 * يطابق شيئًا يجعل الشاشة تسقط على أوّل مفتاح يبتلعها، وصفّ لشاشة محذوفة
 * يجعل FINN تصف نافذة لا وجود لها.
 *
 * ثلاث خصائص تُفحص هنا:
 *   ① كل مفتاح يشير إلى مسار حيّ فعلًا في src/routes.
 *   ② كل مسار حيّ ظاهر له صفّ — لا شاشة تُروى بنصّ عام (المادة ٢٢/ز).
 *   ③ المطابقة بالمقاطع لا بالحروف — `/` لا تبتلع كل شيء، و`/sec` لا تلتقط
 *      `/security-center`.
 *
 * المصدر الحيّ للمسارات هو `routeTree.gen.ts` لا قائمة مكتوبة بيد: قائمة
 * مكتوبة بيد تصير هي نفسها السجلّ الثاني الذي يجب أن يبقى متزامنًا.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HIDDEN_ROUTES } from "../nav/hidden-routes";
import { ENTRIES_A } from "./page-narrations.entries.a";
import { ENTRIES_B } from "./page-narrations.entries.b";
import { ENTRIES_C } from "./page-narrations.entries.c";
import { isSilentRoute, narrationFor } from "./page-narrations";

const ROOT = resolve(__dirname, "../../..");

const KEYS = [...ENTRIES_A, ...ENTRIES_B, ...ENTRIES_C].map(([k]) => k);

/** أبواب ليست شاشات: واجهات برمجية، خطّافات، خريطة الموقع. */
const NON_SCREEN_PREFIXES = [
  "/api",
  "/lovable",
  "/.well-known",
  "/.mcp",
  "/mcp",
  "/email",
  "/sitemap.xml",
] as const;

const isNonScreen = (p: string) =>
  NON_SCREEN_PREFIXES.some((s) => p === s || p.startsWith(s + "/"));

/** `/sec/` و`/sec` شاشة واحدة؛ الجذر يبقى `/`. */
function normalize(p: string): string {
  const trimmed = p.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** كل مسار كامل يعرفه الموجّه المولَّد. */
function routerFullPaths(): string[] {
  const src = readFileSync(join(ROOT, "src/routeTree.gen.ts"), "utf8");
  const start = src.indexOf("interface FileRoutesByFullPath");
  expect(start, "routeTree.gen.ts must expose FileRoutesByFullPath").toBeGreaterThan(-1);
  const body = src.slice(start, src.indexOf("\n}", start));
  return [...body.matchAll(/^\s+'([^']+)':/gm)].map((m) => m[1]);
}

/**
 * المسارات التي تُعيد التوجيه فورًا (جذوع توافق مثل `/hcis-compliance`
 * و`/permits`) لا تُعرض أبدًا، فلا رواية لها — ورواية لها تعني وصف شاشة
 * يغادرها الزائر قبل أن ينطق السطر.
 */
function redirectOnlyRoutes(): Set<string> {
  const out = new Set<string>();
  const files: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(p)) files.push(p);
    }
  })(join(ROOT, "src/routes"));
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const m = src.match(/createFileRoute\("([^"]+)"\)/);
    if (!m) continue;
    const routePath = normalize(m[1].replace(/^\/_authenticated/, "") || "/");
    // بلا `component:` = مسار خادم لا شاشة.
    if (/throw redirect\(/.test(src) || !/component:/.test(src)) out.add(routePath);
  }
  return out;
}

/** الشاشات الحيّة الظاهرة: ما يقف عليه زائر ويرى محتوى. */
function liveScreens(): string[] {
  const redirects = redirectOnlyRoutes();
  return [...new Set(routerFullPaths().map(normalize))]
    .filter((p) => !p.includes("$")) // المقاطع المتغيّرة تُغطّى بالسابقة
    .filter((p) => !isNonScreen(p))
    .filter((p) => !HIDDEN_ROUTES.has(p))
    .filter((p) => !redirects.has(p))
    .sort();
}

/** مسارات صالحة كسابقة لمسار متغيّر — `/verify/permit` أمام `/verify/permit/$id`. */
function dynamicParents(): Set<string> {
  const out = new Set<string>();
  for (const p of routerFullPaths()) {
    if (!p.includes("$") || isNonScreen(p)) continue;
    const head = p.slice(0, p.indexOf("$")).replace(/\/+$/, "");
    if (head) out.add(head);
  }
  return out;
}

describe("سجلّ الروايات لا يصف شاشة غير موجودة", () => {
  it("كل مفتاح مسار حيّ في src/routes", () => {
    const allowed = new Set([...liveScreens(), ...dynamicParents()]);
    const dead = KEYS.filter((k) => !allowed.has(k));
    expect(dead, "صفوف تشير إلى مسارات محذوفة أو مخفية").toEqual([]);
  });

  it("لا مفتاح بصيغة مُعرّف الملف — المفاتيح مسارات موجِّه", () => {
    expect(KEYS.filter((k) => k.startsWith("/_authenticated") || /\w\.\w/.test(k))).toEqual([]);
  });

  it("لا مفتاح مكرّر — صفّان لشاشة واحدة روايتان لمنظر واحد", () => {
    expect(KEYS.length).toBe(new Set(KEYS).size);
  });
});

describe("كل شاشة حيّة لها صفّ (المادة ٢٢)", () => {
  it("لا شاشة تسقط على النصّ العام", () => {
    const keys = new Set(KEYS);
    const uncovered = liveScreens().filter((p) => !isSilentRoute(p) && !keys.has(p));
    expect(uncovered, "شاشات حيّة بلا رواية خاصّة").toEqual([]);
  });
});

describe("المطابقة بالمقاطع لا بالحروف", () => {
  it("الجذر لا يبتلع بقيّة المسارات", () => {
    // العطل الأصلي: `startsWith("/")` صحيحة لكل مسار، فكانت رواية الصفحة
    // الرئيسية تُنطق على شاشات أخرى. المادة ٣٠: الفحص يُظهر العطل لا يفترضه.
    expect(narrationFor("/sec/kpi")!.ar).not.toBe(narrationFor("/")!.ar);
  });

  it("«/sec» لا تلتقط «/security-center»", () => {
    expect(narrationFor("/security-center")!.ar).not.toBe(narrationFor("/sec")!.ar);
  });

  it("الشرطة الأخيرة لا تُنشئ شاشة ثانية", () => {
    expect(narrationFor("/sec/")!.ar).toBe(narrationFor("/sec")!.ar);
  });

  it("المسار المتغيّر يرث رواية سابقته", () => {
    expect(narrationFor("/sec/incidents/INC-9")!.ar).toBe(narrationFor("/sec/incidents")!.ar);
  });

  it("المسارات الصامتة تبقى صامتة", () => {
    expect(narrationFor("/api/chat")).toBeNull();
  });
});
