import { SCREEN_NAMES } from "@/lib/nav/screen-names";
import { isRouteHidden } from "@/lib/nav/hidden-routes";

type Locale = "ar" | "en";
const runtimeStates = ["failed", "error", "running", "pending", "succeeded", "completed"] as const;
type RuntimeState = (typeof runtimeStates)[number];

/** Only existing diagnostics.trace values with non-sensitive, closed meanings are shared. */
export function pageContextDraft(pathname: string, search: string, locale: Locale) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const name =
    !isRouteHidden(path) && Object.hasOwn(SCREEN_NAMES, path) ? SCREEN_NAMES[path] : undefined;
  const route = name ? path : null;
  const label = name?.[locale] ?? (locale === "ar" ? "الصفحة الحالية" : "Current page");
  const trace =
    path === "/diagnostics" ? new URLSearchParams(search.slice(0, 2048)).get("trace") : null;
  const filter = runtimeStates.includes(trace as RuntimeState) ? (trace as RuntimeState) : null;
  const hint = filter
    ? `${locale === "ar" ? "تلميح الرابط لمرشح التشخيص" : "URL hint for diagnostics filter"}: ${filter}`
    : null;
  const lines =
    locale === "ar"
      ? [
          "مسودة للمراجعة؛ هذه تلميحات تنقّل وليست بيانات تشغيلية متحققة.",
          `الصفحة: ${label}${route ? ` (${route})` : ""}`,
          ...(hint ? [hint] : []),
          "سؤالي: اشرح وظيفة هذه الصفحة ومعنى حقولها، وبيّن ما لا يتوافر لديك.",
        ]
      : [
          "Review this draft. Page and filter hints are not verified operational data.",
          `Page: ${label}${route ? ` (${route})` : ""}`,
          ...(hint ? [hint] : []),
          "My question: Explain this page and its fields, and identify what is unavailable.",
        ];
  return { route, label, hint, draft: lines.join("\n") };
}

export interface DeterministicPageCommand {
  readonly to: string;
  readonly trace?: "failed" | "running";
  readonly ar: string;
  readonly en: string;
}

/** Closed navigation grammar. No model call, arbitrary URL, IDs or invented query filters. */
export function resolvePageCommand(
  query: string,
  currentPath: string,
): DeterministicPageCommand | null {
  const term = query
    .slice(0, 160)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .trim()
    .replace(/^(?:افتح|اعرض|open|show)\s+/, "");
  const routes = [
    {
      to: "/sec/incidents",
      aliases: ["البلاغات", "الحوادث", "incidents"],
    },
    {
      to: "/sec/cctv",
      aliases: ["الكاميرات", "المراقبة البصرية", "cctv", "cameras"],
    },
    { to: "/sec/patrols", aliases: ["الدوريات", "patrols"] },
    {
      to: "/sec/maintenance",
      aliases: ["الصيانة", "اوامر العمل", "maintenance", "work orders"],
    },
    {
      to: "/diagnostics",
      aliases: ["تشخيص التشغيل", "التشخيص", "diagnostics"],
    },
  ];
  const direct = routes.find((item) => item.aliases.includes(term));
  if (direct && !isRouteHidden(direct.to))
    return { to: direct.to, ar: SCREEN_NAMES[direct.to].ar, en: SCREEN_NAMES[direct.to].en };
  const trace = ["العمليات الفاشلة", "failed runs"].includes(term)
    ? "failed"
    : ["العمليات الجارية", "running runs"].includes(term)
      ? "running"
      : null;
  // Diagnostics currently reads trace into local state only on mount. Do not promise an
  // ignored same-page filter change; the existing in-page filter remains available there.
  if (!trace || currentPath.replace(/\/+$/, "") === "/diagnostics" || isRouteHidden("/diagnostics"))
    return null;
  return {
    to: "/diagnostics",
    trace,
    ar: trace === "failed" ? "عمليات وأدوات فاشلة" : "عمليات وأدوات جارية",
    en: trace === "failed" ? "Failed runs and tools" : "Running runs and tools",
  };
}
