/**
 * HomeTopNav — the primary navigation, moved to the TOP of the homepage.
 *
 * OWNER DIRECTIVE (items 6 + 7). Two lines of the review contradicted each
 * other: "التنقّل في الأعلى ويشمل الإعدادات" وَ"حذف الإعدادات من قائمة التنقل".
 * Resolution applied: navigation at the top, WITHOUT الإعدادات. [افتراض]
 * Settings stays reachable from the right rail alone (app-shell.tsx), which is
 * also what G2 asked for — so the two directives agree once Settings is
 * treated as a rail-only entry.
 *
 * Every `to` below is a REAL existing route (constitution art. 6: no dead
 * icons) and none of them is hidden — the labels were mapped to the closest
 * live screen rather than inventing destinations:
 *   الأداء    → /sec/kpi          مؤشرات الأداء
 *   المشاريع  → /sec/projects
 *   الموارد   → /sec/assets       الأصول والموارد
 *   المخاطر   → /risk
 *   التقارير  → /sec/reports
 *   الذكاء الاصطناعي → /finn      FINN التنفيذية
 */
import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { isRouteHidden } from "@/lib/nav/hidden-routes";
import { useTheme } from "@/lib/theme";

interface TopNavItem {
  readonly to: string;
  readonly ar: string;
  readonly en: string;
}

const ITEMS: readonly TopNavItem[] = [
  { to: "/", ar: "الرئيسية", en: "Home" },
  { to: "/sec/kpi", ar: "الأداء", en: "Performance" },
  { to: "/sec/projects", ar: "المشاريع", en: "Projects" },
  { to: "/sec/assets", ar: "الموارد", en: "Resources" },
  { to: "/risk", ar: "المخاطر", en: "Risk" },
  { to: "/sec/reports", ar: "التقارير", en: "Reports" },
  { to: "/finn", ar: "الذكاء الاصطناعي", en: "AI" },
];

/**
 * مبدّل الوضع على الصفحة الرئيسية.
 *
 * الرئيسية لا تملك الشريط الأيمن (هي خارج AppShell)، فلو بقي المبدّل في
 * الشريط وحده لَما وُجد له أثر هنا إطلاقًا — وهو ما جعل الوضع الفاتح يبدو
 * معطّلًا. مكانه هنا هو الطرف الوحيد المتاح للزائر على هذه الصفحة.
 */
function HomeThemeToggle({ ar }: { readonly ar: boolean }) {
  const { theme, setTheme } = useTheme();
  const light = theme === "light";
  const label = light
    ? ar
      ? "التحويل إلى الوضع الداكن"
      : "Switch to dark mode"
    : ar
      ? "التحويل إلى الوضع الفاتح"
      : "Switch to light mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(light ? "dark" : "light")}
      // aria-pressed يجعل الحالة مسموعة لقارئ الشاشة، لا مرئية بالأيقونة فقط.
      aria-pressed={light}
      aria-label={label}
      title={label}
      className="nx-glass-icon inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-[color:var(--ink-2)] transition hover:bg-[color:var(--chip-hover)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
    >
      {light ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
      <span className="hidden sm:inline">
        {light ? (ar ? "داكن" : "Dark") : ar ? "فاتح" : "Light"}
      </span>
    </button>
  );
}

export function HomeTopNav() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // A hidden screen must never appear here — the same guard the command map
  // uses, so hiding a route in one file removes it from every surface.
  const items = ITEMS.filter((i) => !isRouteHidden(i.to));

  return (
    <nav
      aria-label={ar ? "التنقّل الرئيسي" : "Primary navigation"}
      dir={ar ? "rtl" : "ltr"}
      className="relative z-20 w-full border-b border-[color:var(--hairline)] bg-[color:var(--surface)]/70 backdrop-blur-sm"
    >
      {/* Scrolls horizontally on narrow screens so the row never wraps into a
          ragged block and never forces the PAGE to scroll sideways. */}
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-2 px-3 py-1.5 sm:px-6">
        <ul className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <li key={item.to} className="shrink-0">
              <Link
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                // ≥44px touch target via min-h-11, per the accessibility floor.
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-[13px] font-semibold text-[color:var(--ink-2)] transition hover:bg-[color:var(--chip-hover)] hover:text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500 aria-[current=page]:bg-cyan-400/15 aria-[current=page]:text-[color:var(--ink)] sm:text-sm"
              >
                {ar ? item.ar : item.en}
              </Link>
            </li>
          ))}
        </ul>
        <HomeThemeToggle ar={ar} />
      </div>
    </nav>
  );
}
