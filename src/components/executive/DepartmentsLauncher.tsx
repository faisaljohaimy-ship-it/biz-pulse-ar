/** DepartmentsLauncher — Industrial Security: 4 sections × 6 districts. Compact centered modal. */
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wrench, FolderKanban, BadgeCheck, ShieldAlert, LifeBuoy, Siren, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const DISTRICTS = [
  { key: "jeddah",  ar: "جدة",             en: "Jeddah"  },
  { key: "makkah",  ar: "مكة المكرمة",     en: "Makkah"  },
  { key: "taif",    ar: "الطائف",          en: "Taif"    },
  { key: "madinah", ar: "المدينة المنورة", en: "Madinah" },
  { key: "rabigh",  ar: "رابغ",            en: "Rabigh"  },
  { key: "tabuk",   ar: "تبوك",            en: "Tabuk"   },
] as const;

const SECTIONS = [
  { key: "maintenance", icon: Wrench,       ar: "الصيانة",             en: "Maintenance" },
  { key: "projects",    icon: FolderKanban, ar: "المشاريع",            en: "Projects" },
  { key: "permits",     icon: BadgeCheck,   ar: "البطاقات والتصاريح",  en: "Cards & Permits" },
  { key: "incidents",   icon: ShieldAlert,  ar: "الحوادث الأمنية",     en: "Security Incidents" },
] as const;

export function DepartmentsLauncher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [district, setDistrict] = useState<(typeof DISTRICTS)[number]["key"]>("jeddah");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const heading = ar ? "الأمن الصناعي" : "Industrial Security";

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
        className="relative w-full max-w-sm rounded-2xl border border-[#3AE8FF]/35 bg-gradient-to-br from-[#02101e] via-[#04243c] to-[#061A2E] p-5 shadow-[0_0_60px_-20px_rgba(58,232,255,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-[#3AE8FF]/80">Industrial Security</div>
            <h2 className="mt-1 text-lg font-semibold text-white">{heading}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ar ? "إغلاق" : "Close"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1.5 text-[10px] uppercase tracking-[0.25em] text-white/50">
          {ar ? "الدائرة" : "District"}
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {DISTRICTS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDistrict(d.key)}
              className={
                "rounded-full px-3 py-1.5 text-xs font-medium transition " +
                (district === d.key
                  ? "bg-[#3AE8FF]/20 text-[#3AE8FF] ring-1 ring-[#3AE8FF]/60"
                  : "bg-white/5 text-white/60 ring-1 ring-white/10 hover:bg-white/10")
              }
            >
              {ar ? d.ar : d.en}
            </button>
          ))}
        </div>

        <div className="mb-1.5 text-[10px] uppercase tracking-[0.25em] text-white/50">
          {ar ? "القسم" : "Section"}
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.key}>
                <Link
                  to="/runtime-hub"
                  search={{ district, section: s.key }}
                  onClick={onClose}
                  className="group flex h-full flex-col items-start gap-2 rounded-xl border border-[#00D4FF]/25 bg-[#02101e]/70 p-3 transition hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/[0.06] hover:shadow-[0_0_24px_rgba(58,232,255,0.35)]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#00D4FF]/15 text-[#3AE8FF] shadow-[0_0_14px_rgba(0,212,255,0.45)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="text-xs font-semibold text-white leading-tight">
                    {ar ? s.ar : s.en}
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
