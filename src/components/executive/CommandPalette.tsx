import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Cmd = {
  id: string;
  title_ar: string;
  title_en: string;
  hint?: string;
  to?: string;
  action?: () => void;
  group: "Navigate" | "Agents" | "Reports" | "System";
};

export function CommandPalette({ onOpenCinema }: { onOpenCinema: () => void }) {
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands: Cmd[] = useMemo(
    () => [
      { id: "home", title_ar: "الرئيسية", title_en: "Home", to: "/", group: "Navigate" },
      {
        id: "hub",
        title_ar: "Runtime Hub",
        title_en: "Runtime Hub",
        to: "/runtime-hub",
        group: "Navigate",
      },
      {
        id: "command",
        title_ar: "مركز القيادة",
        title_en: "Command Center",
        to: "/command-center",
        group: "Navigate",
      },
      {
        id: "operations",
        title_ar: "العمليات",
        title_en: "Operations",
        to: "/operations",
        group: "Navigate",
      },
      {
        id: "twin",
        title_ar: "التوأم الرقمي",
        title_en: "Digital Twin",
        to: "/digital-twin",
        group: "Navigate",
      },
      {
        id: "hajj",
        title_ar: "نظام الحج",
        title_en: "Hajj Operations",
        to: "/hajj",
        group: "Navigate",
      },
      {
        id: "bridge",
        title_ar: "جسر تنفيذي",
        title_en: "Executive Bridge",
        to: "/bridge",
        group: "Navigate",
      },
      {
        id: "theater",
        title_ar: "المسرح التنفيذي",
        title_en: "Executive Theater",
        to: "/theater",
        group: "Navigate",
      },
      { id: "agents", title_ar: "الوكلاء", title_en: "Agents", to: "/agents", group: "Agents" },
      {
        id: "agent-run",
        title_ar: "تشغيل وكيل",
        title_en: "Run Agent",
        to: "/exec",
        group: "Agents",
      },
      {
        id: "reports",
        title_ar: "التقارير التنفيذية",
        title_en: "Executive Reports",
        to: "/executive-reports",
        group: "Reports",
      },
      {
        id: "briefing",
        title_ar: "إحاطة الصباح",
        title_en: "Morning Briefing",
        to: "/briefing",
        group: "Reports",
      },
      {
        id: "decisions",
        title_ar: "ذكاء القرار",
        title_en: "Decision Intelligence",
        to: "/decisions",
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
        title_ar: "تشخيص",
        title_en: "Diagnostics",
        to: "/diagnostics",
        group: "System",
      },
      {
        id: "cinema",
        title_ar: "التجربة التنفيذية",
        title_en: "Executive Experience",
        action: onOpenCinema,
        group: "System",
        hint: "Cinema",
      },
    ],
    [onOpenCinema],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return commands;
    return commands.filter(
      (c) =>
        c.title_ar.toLowerCase().includes(term) ||
        c.title_en.toLowerCase().includes(term) ||
        c.group.toLowerCase().includes(term),
    );
  }, [commands, q]);

  const grouped = useMemo(() => {
    const g: Record<string, Cmd[]> = {};
    for (const c of filtered) (g[c.group] ??= []).push(c);
    return g;
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
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-2">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-white/40">
                {group}
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
                        <div className="truncate text-sm text-white">
                          {ar ? c.title_ar : c.title_en}
                        </div>
                        <div className="truncate text-[10px] uppercase tracking-[0.2em] text-white/40">
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
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] text-white/40">
          <span>↵ {ar ? "تنفيذ" : "Enter"}</span>
          <span>⌘/Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
