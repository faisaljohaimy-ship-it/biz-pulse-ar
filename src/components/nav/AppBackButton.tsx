/**
 * AppBackButton — unified back-navigation control mounted on every non-home
 * route. If the user has valid in-app history it goes back one step,
 * otherwise it falls back to the provided route (defaults to "/").
 *
 * Accessible (aria-label, ≥44px touch target), RTL-aware (arrow flips with
 * document direction), and cheap: no context, no state beyond a single
 * history probe on mount.
 */
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function AppBackButton({
  fallback = "/",
  className = "",
}: {
  readonly fallback?: string;
  readonly className?: string;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const Arrow = ar ? ArrowRight : ArrowLeft;

  const onClick = () => {
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;
    if (hasHistory) {
      window.history.back();
    } else {
      router.navigate({ to: fallback });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ar ? "رجوع" : "Back"}
      className={
        "nx-back-btn inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl border border-[#3AE8FF]/30 bg-[#04070F]/60 px-3.5 py-2 text-xs font-semibold text-white/85 backdrop-blur-md transition hover:border-[#3AE8FF]/70 hover:bg-[#3AE8FF]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60 " +
        className
      }
    >
      <Arrow className="h-4 w-4" />
      <span>{ar ? "رجوع" : "Back"}</span>
    </button>
  );
}
