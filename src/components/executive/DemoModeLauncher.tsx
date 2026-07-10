// Executive Showcase launcher — routes to the full-screen cinematic
// showcase (/executive-showcase). Keeps hero button placement/label.
import { Link } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function DemoModeLauncher({ className = "" }: { className?: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const label = ar ? "العرض التنفيذي" : "Executive Showcase";
  const sub = ar ? "جولة سينمائية على مكوّنات النظام" : "Cinematic tour of every module";

  return (
    <Link
      to="/executive-showcase"
      title={sub}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-[#3AE8FF]/60 bg-[#3AE8FF]/15 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_24px_rgba(58,232,255,0.4)] transition hover:-translate-y-0.5 hover:bg-[#3AE8FF]/25 sm:text-sm ${className}`}
    >
      <Clapperboard className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
