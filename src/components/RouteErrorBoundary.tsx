/**
 * RouteErrorBoundary — branded Arabic fallback used by per-route
 * `errorComponent`. Never leaves the user staring at a blank screen; the
 * caught error is logged with route context so operators can trace it.
 */
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

interface Props {
  error: Error;
  reset: () => void;
  routeLabel?: string;
}

export function RouteErrorBoundary({ error, reset, routeLabel }: Props) {
  const router = useRouter();

  useEffect(() => {
    // Structured console log with route context; system_events insertion
    // would require an authed server fn and is not guaranteed to succeed
    // from an already-broken client tree, so we stay client-only here.
    console.error("[RouteErrorBoundary]", {
      route: routeLabel ?? "unknown",
      message: error?.message,
      stack: error?.stack,
    });
  }, [error, routeLabel]);

  return (
    <div
      dir="rtl"
      role="alert"
      className="min-h-[60vh] flex items-center justify-center px-6 py-16 bg-[#04070F] text-white"
    >
      <div className="max-w-lg w-full text-center space-y-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 backdrop-blur p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
          خطأ في المسار
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          حدث خطأ — جارٍ الاستعادة
        </h1>
        <p className="text-sm text-white/70 leading-relaxed">
          تعذّر تحميل هذا القسم مؤقتاً. تم تسجيل الحادثة وسيبقى بقية النظام يعمل. يمكنك إعادة
          المحاولة الآن.
        </p>
        {error?.message ? (
          <pre className="text-xs text-rose-200/80 bg-black/30 rounded-lg p-3 text-left overflow-auto max-h-32 font-mono">
            {error.message}
          </pre>
        ) : null}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              reset();
              router.invalidate();
            }}
            className="px-4 py-2 rounded-lg bg-[#00D4FF] text-[#04070F] font-medium hover:bg-[#3AE8FF] transition"
          >
            إعادة المحاولة
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/5 transition"
          >
            تحديث الصفحة
          </button>
        </div>
      </div>
    </div>
  );
}
