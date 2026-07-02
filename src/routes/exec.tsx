import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { LogIn, Radio } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { MissionControlStrip } from "@/components/executive/MissionControlStrip";
import { PublicAgentsDemoGrid } from "@/components/executive/PublicAgentsDemoGrid";
import { DemoDataBadge } from "@/components/executive/DemoDataBadge";

export const Route = createFileRoute("/exec")({
  head: () => ({
    meta: [
      { title: "غرفة القيادة التنفيذية — NEXIOS AI OS" },
      { name: "description", content: "غرفة القيادة التنفيذية — نبض العمليات المباشر ومؤشرات الأداء الحيّة على منصة NEXIOS AI OS." },
      { property: "og:title", content: "غرفة القيادة التنفيذية — NEXIOS AI OS" },
      { property: "og:description", content: "نبض العمليات الحيّ، حوادث، أوامر عمل، صيانة وقائية، ومشاريع تنفيذية." },
      { property: "og:url", content: "https://neexios.com/exec" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://neexios.com/exec" }],
  }),
  component: ExecRoomPublic,
});

function ExecRoomPublic() {
  const { user, loading } = useAuth();
  const { locale } = useI18n();
  const ar = locale === "ar";

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center bg-[#02101e] text-white/70">…</div>;
  }
  // Authed users: defer to the real executive command room (unchanged).
  if (user) return <Navigate to="/sec/exec" />;

  return (
    <main
      dir={ar ? "rtl" : "ltr"}
      className="relative min-h-dvh overflow-hidden bg-[#02101e] text-white"
    >
      {/* Ambient background wash — no new heavy deps */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(80% 60% at 50% -10%, rgba(0,212,255,0.18), transparent 60%), radial-gradient(60% 50% at 90% 100%, rgba(58,232,255,0.12), transparent 60%)",
        }}
      />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/30 bg-[#3AE8FF]/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[#3AE8FF]">
              <Radio className="h-3 w-3 animate-pulse" aria-hidden />
              {ar ? "غرفة القيادة التنفيذية · عرض توضيحي" : "Executive Command Room · Demo"}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {ar ? "غرفة القيادة التنفيذية" : "Executive Command Room"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/60">
              {ar
                ? "عرض للقراءة فقط ببيانات محاكاة واقعية. سجّل الدخول للاتصال بالبيانات الحيّة على مستأجرك."
                : "A read-only preview powered by realistic simulated data. Sign in to connect to your tenant's live feed."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DemoDataBadge />
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_24px_rgba(0,212,255,0.25)] transition hover:bg-[#3AE8FF]/20 hover:shadow-[0_0_32px_rgba(0,212,255,0.4)]"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {ar ? "سجّل الدخول للبيانات الحيّة" : "Sign in for live data"}
            </Link>
          </div>
        </div>

        {/* Reuse the exact same strip used by the authenticated experience —
            it auto-detects public visitors and falls back to demoDataProvider. */}
        <MissionControlStrip />

        <div className="mt-10">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--nx-cyan-2,#3AE8FF)]/75">
                Executive Agents
              </div>
              <h2 className="text-base font-semibold">{ar ? "الوكلاء التنفيذيون" : "Executive Agents"}</h2>
            </div>
          </div>
          <PublicAgentsDemoGrid ar={ar} />
        </div>
      </section>
    </main>
  );
}
