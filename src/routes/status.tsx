import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

interface Subsystem {
  status: "ok" | "degraded" | "down" | "unknown";
  latency_ms?: number;
  detail?: string;
}
interface Health {
  status: "ok" | "degraded" | "down";
  version: string;
  timestamp: string;
  uptime_hint: string;
  subsystems: Record<string, Subsystem>;
}

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "الحالة التشغيلية · System Status — NEXIOS AI OS" },
      {
        name: "description",
        content:
          "الحالة التشغيلية الحيّة لمنصة نكسيوس · Live operational status for the NEXIOS AI OS platform.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StatusPage,
});

const DOT: Record<Subsystem["status"], string> = {
  ok: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-rose-500",
  unknown: "bg-white/30",
};

const LABEL_AR: Record<Subsystem["status"], string> = {
  ok: "يعمل",
  degraded: "أداء منخفض",
  down: "متوقّف",
  unknown: "غير معروف",
};

function StatusPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchHealth() {
      try {
        const res = await fetch("/api/public/health", { cache: "no-store" });
        const data = (await res.json()) as Health;
        if (!cancelled) {
          setHealth(data);
          setLoadedAt(new Date());
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    fetchHealth();
    const id = setInterval(fetchHealth, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const overall = health?.status ?? "unknown";

  return (
    <main dir="rtl" className="min-h-dvh bg-[#04070F] px-4 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/5 px-3 py-1 text-xs font-medium text-[#00D4FF]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00D4FF]" />
          NEXIOS AI OS
        </div>
        <h1 className="text-3xl font-bold tracking-tight">الحالة التشغيلية · System Status</h1>
        <p className="mt-2 text-sm text-white/60">
          حالة المنصّة الحيّة، محدَّثة كل ٣٠ ثانية من نقطة النهاية{" "}
          <code dir="ltr" className="font-mono text-white/80">
            /api/public/health
          </code>
          .
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`inline-block h-3 w-3 rounded-full ${DOT[overall as Subsystem["status"]]} shadow-[0_0_20px_currentColor]`}
              />
              <span className="text-lg font-semibold">
                {overall === "ok"
                  ? "جميع الأنظمة تعمل بشكل طبيعي"
                  : overall === "degraded"
                    ? "أداء منخفض على بعض الأنظمة"
                    : overall === "down"
                      ? "خدمة أساسية متوقّفة"
                      : "جارٍ التحقق…"}
              </span>
            </div>
            {health?.version && (
              <span
                dir="ltr"
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60"
              >
                v{health.version}
              </span>
            )}
          </div>
          {loadedAt && (
            <p className="mt-2 text-xs text-white/40">
              آخر تحديث: {loadedAt.toLocaleTimeString("ar-SA")}
            </p>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            تعذّر الوصول إلى نقطة الفحص: {error}
          </div>
        )}

        {health && (
          <div className="mt-6 space-y-2">
            {Object.entries(health.subsystems).map(([name, sub]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[sub.status]}`} />
                  <span dir="ltr" className="font-mono text-sm uppercase text-white/80">
                    {name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50">
                  {typeof sub.latency_ms === "number" && (
                    <span dir="ltr" className="font-mono">
                      {sub.latency_ms}ms
                    </span>
                  )}
                  <span className="text-white/80">{LABEL_AR[sub.status]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 text-xs leading-relaxed text-white/40">
          هذه صفحة حالة صادقة — لا نعرض نسبة تشغيل مصنّعة. النسب طويلة الأمد ستضاف عند توفّر بيانات
          كافية من المُراقِب الخارجي. للحوادث والاتصال:{" "}
          <a
            href="mailto:ops@neexios.com"
            className="text-[#00D4FF] underline-offset-4 hover:underline"
          >
            ops@neexios.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
