/**
 * Vision2030Seal — a subtle holographic emblem for the ARIA premium hero.
 * Executive-quality, never advertisement-loud: a thin ring wordmark with
 * a soft cyan/emerald aura and a slow rotating conic sheen. RTL-aware.
 */
import { useI18n } from "@/lib/i18n";

export function Vision2030Seal({ className }: { className?: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <div
      className={
        "pointer-events-none inline-flex items-center gap-2 rounded-full " +
        "border border-[#3AE8FF]/30 bg-[#061A2E]/60 px-3 py-1 " +
        "backdrop-blur-md shadow-[0_0_24px_rgba(58,232,255,0.18)] " +
        (className ?? "")
      }
      aria-label={ar ? "متوائم مع رؤية المملكة 2030" : "Aligned with Saudi Vision 2030"}
      title={ar ? "متوائم مع رؤية المملكة 2030" : "Aligned with Saudi Vision 2030"}
    >
      <span
        aria-hidden
        className="relative grid h-5 w-5 place-items-center rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(58,232,255,0.9), rgba(16,185,129,0.7), rgba(58,232,255,0.9))",
          boxShadow: "0 0 12px rgba(58,232,255,0.55), inset 0 0 6px rgba(16,185,129,0.5)",
          animation: "aria-seal-spin 14s linear infinite",
        }}
      >
        <span className="block h-3 w-3 rounded-full bg-[#061A2E]" />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#DDF7FF]/85">
        {ar ? "رؤية 2030" : "Vision 2030"}
      </span>
      <style>{`@keyframes aria-seal-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default Vision2030Seal;
