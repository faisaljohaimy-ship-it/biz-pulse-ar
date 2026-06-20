import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type Tab = { to: string; en: string; ar: string };

const TABS: Tab[] = [
  { to: "/trust",         en: "Trust",         ar: "الثقة" },
  { to: "/security",      en: "Security",      ar: "الأمن" },
  { to: "/dpa",           en: "DPA",           ar: "ملحق المعالجة" },
  { to: "/subprocessors", en: "Subprocessors", ar: "المورّدون الفرعيون" },
  { to: "/sla",           en: "SLA",           ar: "اتفاقية الخدمة" },
];

export function TrustShell({
  isAr, eyebrow, eyebrowAr, title, titleAr, subtitle, subtitleAr, qualifier, qualifierAr,
  active, children,
}: {
  isAr: boolean;
  eyebrow: string; eyebrowAr: string;
  title: string;   titleAr: string;
  subtitle: string; subtitleAr: string;
  qualifier?: string; qualifierAr?: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <div dir={isAr ? "rtl" : "ltr"} className="relative min-h-screen overflow-hidden bg-[#06070d] text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,46,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.06),transparent_60%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(214,158,46,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(214,158,46,0.05)_1px,transparent_1px)] [background-size:56px_56px] opacity-25" />
      </div>

      <header className="relative z-10 mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <Link to="/" className="inline-flex min-w-0 items-center gap-2 truncate text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className={`h-4 w-4 shrink-0 ${isAr ? "rotate-180" : ""}`} />
          {isAr ? "العودة" : "Back"}
        </Link>
        <div className="text-[10px] uppercase tracking-[0.28em] text-amber-300/70 sm:text-xs sm:tracking-[0.32em]">
          {isAr ? "الثقة والأمان" : "Trust & Security"}
        </div>
      </header>

      <nav className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mx-1 flex gap-1 overflow-x-auto pb-2 sm:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const isActive = t.to === active;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition sm:text-xs ${
                  isActive
                    ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                    : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-amber-400/25 hover:text-foreground"
                }`}
              >
                {isAr ? t.ar : t.en}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">
        <section className="mb-10 max-w-3xl sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-300/80 sm:text-[11px] sm:tracking-[0.24em]">
            {isAr ? eyebrowAr : eyebrow}
          </div>
          <h1 className="mt-5 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-3xl font-semibold leading-tight text-transparent sm:text-5xl">
            {isAr ? titleAr : title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-lg">
            {isAr ? subtitleAr : subtitle}
          </p>
          {(qualifier || qualifierAr) && (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground/70">
              {isAr ? qualifierAr : qualifier}
            </p>
          )}
        </section>

        {children}
      </main>
    </div>
  );
}

export function SectionTitle({ isAr, en, ar, icon }: { isAr: boolean; en: string; ar: string; icon?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-amber-300/80 sm:text-xs sm:tracking-[0.28em]">
      {icon}
      {isAr ? ar : en}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 ${className}`}>{children}</div>
  );
}

export function Bullets({ items, isAr }: { items: { en: string; ar: string }[]; isAr: boolean }) {
  return (
    <ul className="space-y-2.5">
      {items.map((b, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-amber-300/80" />
          <span>{isAr ? b.ar : b.en}</span>
        </li>
      ))}
    </ul>
  );
}
