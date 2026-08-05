import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { screenNameAr, screenNameEn } from "@/lib/nav/screen-names";

type CmdGroup = "Navigate" | "Agents" | "Reports" | "System";

type Cmd = {
  id: string;
  title_ar: string;
  title_en: string;
  hint?: string;
  to?: string;
  action?: () => void;
  group: CmdGroup;
};

// عناوين المجموعات — عربية أولًا. كانت تُطبع بمفاتيحها الإنجليزية داخل
// واجهة عربية، فبقيت آخر أثر لاتيني في اللوحة.
const GROUP_AR: Record<CmdGroup, string> = {
  Navigate: "التنقّل",
  Agents: "الوكلاء",
  Reports: "التقارير",
  System: "النظام",
};

/**
 * وجهات اللوحة — الجيل الكانوني وحده.
 *
 * كانت اللوحة (⌘K، مركّبة في قشرة التطبيق الحيّة) بابًا خلفيًا إلى الجيل
 * السابق: `/runtime-hub` و`/command-center` و`/operations`
 * و`/exec` و`/briefing` و`/decisions`. لا قيمة في تلميع الواجهة الجديدة
 * ثم ترك مفتاح لوحة المفاتيح يعيد الزائر إلى القديم في ضغطتين.
 *
 * قاعدة القرار لكل وجهة: ① لها مقابل كانوني ⇐ تُحوَّل إليه · ② مجرّد
 * تكرار لسطح قائم ⇐ تُسحب · ③ سطح فريد ولا بديل له ⇐ تبقى.
 *
 * المسحوبة ومآلها:
 *   /runtime-hub · /command-center → `/nx-cockpit` (القمرة الكانونية).
 *     و`/runtime-hub` نفسه شبكة أبواب تفتح `/command-center` و`/operations`
 *     و`/exec` — بابٌ إلى أبواب قديمة، لا وحدة.
 *   /operations → `/nx-ops` (مسرح العمليات الحيّ).
 *   /exec → `/nx-flow` (رحلة الوكلاء مع فِن) — والاسم صار صادقًا: الصفحة
 *     تقرأ الرحلة ولا تشغّل وكيلًا، فبقاء «تشغيل وكيل» كان وعدًا كاذبًا.
 *   /agents → `/nx-agents` (منظومة الوكلاء).
 *   /briefing → `/sec/exec` (اللوحة التنفيذية الحيّة) — الإحاطة الساكنة
 *     كانت تكرارًا لما تعرضه اللوحة من مصدر حيّ.
 *   /decisions → سُحبت: مصفوفتها ثابتة، ودرج «القرارات المعلقة» في القمرة
 *     والثانية مصفوفة قرارات ثابتة يغنّي عنها درج «القرارات المعلقة» في
 *     القمرة. لكلٍّ منهما روابط واردة أخرى، فلا تُيتَّم بسحبها من هنا.
 *
 * الباقيتان بقرار: `/health` و`/diagnostics` — سطحان هندسيان فريدان بلا
 * مقابل في الجيل الجديد (صحة الأنظمة والموصلات · ذيل الآثار الحيّ)،
 * و`/health` لا يبلغه أحد إلا من هنا.
 *
 * الأسماء تُقرأ من `screen-names` حيثما وُجدت — ووجهات `/nx-*` ليست في
 * السجل بعد، فعناوينها هنا مطابقة لعناوين ملفات مساراتها.
 */

// The cinema entry opens the ExecutiveCinema MODAL via this handler — it does
// not navigate to /cinematic-demo, which is hidden. Without a handler the
// entry is omitted entirely rather than dead-ending on a hidden route.
export function CommandPalette({ onOpenCinema }: { onOpenCinema?: () => void } = {}) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpenEvt = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("nx:open-command-palette", onOpenEvt);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nx:open-command-palette", onOpenEvt);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands: Cmd[] = useMemo(
    () => [
      {
        id: "home",
        title_ar: screenNameAr("/"),
        title_en: screenNameEn("/"),
        to: "/",
        group: "Navigate",
      },
      {
        id: "cockpit",
        title_ar: "قمرة القيادة التنفيذية",
        title_en: "Executive Cockpit",
        to: "/nx-cockpit",
        group: "Navigate",
      },
      {
        id: "ops",
        title_ar: "مسرح العمليات الحيّ",
        title_en: "Ops Theater",
        to: "/nx-ops",
        group: "Navigate",
      },
      {
        id: "sec",
        title_ar: screenNameAr("/sec"),
        title_en: screenNameEn("/sec"),
        to: "/sec",
        group: "Navigate",
      },
      {
        id: "hcis",
        title_ar: screenNameAr("/hcis"),
        title_en: screenNameEn("/hcis"),
        to: "/hcis",
        group: "Navigate",
      },
      {
        id: "twin",
        title_ar: screenNameAr("/digital-twin"),
        title_en: screenNameEn("/digital-twin"),
        to: "/digital-twin",
        group: "Navigate",
      },
      {
        id: "agents",
        title_ar: "منظومة الوكلاء",
        title_en: "Agent Network",
        to: "/nx-agents",
        group: "Agents",
      },
      {
        id: "agent-flow",
        title_ar: "رحلة الوكلاء مع فِن",
        title_en: "Agents Flow",
        to: "/nx-flow",
        group: "Agents",
      },
      {
        id: "reports",
        title_ar: screenNameAr("/sec/reports"),
        title_en: screenNameEn("/sec/reports"),
        to: "/sec/reports",
        group: "Reports",
      },
      {
        id: "exec-dashboard",
        title_ar: screenNameAr("/sec/exec"),
        title_en: screenNameEn("/sec/exec"),
        to: "/sec/exec",
        group: "Reports",
      },
      {
        id: "kpi",
        title_ar: screenNameAr("/sec/kpi"),
        title_en: screenNameEn("/sec/kpi"),
        to: "/sec/kpi",
        group: "Reports",
      },
      {
        id: "health",
        title_ar: "صحة النظام",
        title_en: "System Health",
        to: "/health",
        group: "System",
      },
      {
        id: "diag",
        title_ar: "تشخيص التشغيل",
        title_en: "Diagnostics",
        to: "/diagnostics",
        group: "System",
      },
      ...(onOpenCinema
        ? [
            {
              id: "cinema",
              title_ar: "التجربة التنفيذية",
              title_en: "Executive Experience",
              action: onOpenCinema,
              group: "System" as const,
              hint: "Cinema",
            },
          ]
        : []),
    ],
    // `navigate` لا تُقرأ هنا (القائمة تحمل `to` نصًّا)، فوجودها في
    // التبعيات كان يعيد بناء القائمة بلا سبب.
    [onOpenCinema],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return commands;
    return commands.filter(
      (c) =>
        c.title_ar.toLowerCase().includes(term) ||
        c.title_en.toLowerCase().includes(term) ||
        c.group.toLowerCase().includes(term) ||
        // اسم المجموعة العربي مبحوث أيضًا — وإلا كانت كتابة «الوكلاء» تعيد لا شيء.
        GROUP_AR[c.group].includes(term),
    );
  }, [commands, q]);

  const grouped = useMemo(() => {
    const g = new Map<CmdGroup, Cmd[]>();
    for (const c of filtered) {
      const bucket = g.get(c.group);
      if (bucket) bucket.push(c);
      else g.set(c.group, [c]);
    }
    return [...g];
  }, [filtered]);

  function run(cmd: Cmd) {
    setOpen(false);
    if (cmd.to) navigate({ to: cmd.to });
    else cmd.action?.();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Universal command"
      dir={ar ? "rtl" : "ltr"}
      className="fixed inset-0 z-[95] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-md"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#3AE8FF]/30 bg-[#061A2E]/95 shadow-[0_30px_80px_rgba(0,212,255,0.25)]"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-[#3AE8FF]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ar ? "ابحث، انتقل، شغّل وكيلاً…" : "Search, navigate, run an agent…"}
            aria-label={ar ? "ابحث أو انتقل" : "Search or navigate"}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered[0]) run(filtered[0]);
            }}
          />
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[12px] text-white/60">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {grouped.map(([group, items]) => (
            <div key={group} className="mb-2">
              <div className="px-3 py-1.5 text-[12px] font-bold tracking-[0.2em] text-white/72">
                {ar ? GROUP_AR[group] : group}
              </div>
              <ul>
                {items.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => run(c)}
                      className={`group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 ${ar ? "text-right" : "text-left"} transition hover:bg-[#3AE8FF]/10 focus:bg-[#3AE8FF]/10 focus:outline-none`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">
                          {ar ? c.title_ar : c.title_en}
                        </div>
                        <div className="truncate text-[12px] tracking-[0.12em] text-white/64">
                          {ar ? c.title_en : c.title_ar}
                          {c.hint ? ` · ${c.hint}` : ""}
                        </div>
                      </div>
                      <Arrow className="h-4 w-4 text-white/30 transition group-hover:text-[#3AE8FF]" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-white/50">
              <Sparkles className="h-5 w-5 text-[#3AE8FF]" />
              <p className="text-sm">{ar ? "لا توجد نتائج" : "No matches"}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[12px] text-white/40">
          <span>↵ {ar ? "تنفيذ" : "Enter"}</span>
          <span>⌘/Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
