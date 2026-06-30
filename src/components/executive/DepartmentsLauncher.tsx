/**
 * DepartmentsLauncher — modal grid of executive departments. Locale-aware.
 */
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Shield, Building2, Users, Truck, FileCheck, Radio, BadgeCheck, Briefcase, X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const DEPTS = [
  { key: "security",   icon: Shield,     ar: "إدارة الأمن الصناعي",   en: "Industrial Security",     to: "/runtime-hub" as const },
  { key: "operations", icon: Building2,  ar: "العمليات والمنشآت",      en: "Operations & Facilities", to: "/runtime-hub" as const },
  { key: "hr",         icon: Users,      ar: "الموارد البشرية",         en: "Human Resources",         to: "/runtime-hub" as const },
  { key: "logistics",  icon: Truck,      ar: "اللوجستيات والنقل",      en: "Logistics & Transport",   to: "/runtime-hub" as const },
  { key: "permits",    icon: FileCheck,  ar: "التصاريح والامتثال",     en: "Permits & Compliance",    to: "/runtime-hub" as const },
  { key: "control",    icon: Radio,      ar: "مركز التحكم",             en: "Command & Control",       to: "/runtime-hub" as const },
  { key: "quality",    icon: BadgeCheck, ar: "الجودة والاعتماد",        en: "Quality & Audit",         to: "/runtime-hub" as const },
  { key: "executive",  icon: Briefcase,  ar: "المكتب التنفيذي",         en: "Executive Office",        to: "/runtime-hub" as const },
] as const;

export function DepartmentsLauncher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const heading = ar ? "نوافذ الإدارات التنفيذية" : "Executive Department Windows";
  const subtitle = ar
    ? "اختر إدارة لفتح نافذة مخصصة. مساحة قابلة للتوسعة لاحقاً لكل وحدة تنظيمية."
    : "Choose a department to open its dedicated window. Each unit is extensible.";

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-xl p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-3xl border border-[#3AE8FF]/35 bg-gradient-to-br from-[#02101e] via-[#04243c] to-[#061A2E] p-5 shadow-[0_0_80px_-20px_rgba(58,232,255,0.55)] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-[#3AE8FF]/80">Department Windows</div>
            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{heading}</h2>
            <p className="mt-1 max-w-xl text-xs text-white/55 sm:text-sm">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ar ? "إغلاق" : "Close"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {DEPTS.map((d) => {
            const Icon = d.icon;
            const title = ar ? d.ar : d.en;
            const sub = ar ? d.en : d.ar;
            return (
              <li key={d.key}>
                <Link
                  to={d.to}
                  onClick={onClose}
                  className="group flex h-full flex-col items-start gap-2 rounded-2xl border border-[#00D4FF]/25 bg-[#02101e]/70 p-4 transition hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/[0.06] hover:shadow-[0_0_28px_rgba(58,232,255,0.4)]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#00D4FF]/15 text-[#3AE8FF] shadow-[0_0_18px_rgba(0,212,255,0.45)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{title}</div>
                    <div className="truncate text-[10px] uppercase tracking-[0.2em] text-white/45">{sub}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
