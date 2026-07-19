import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, LockKeyhole } from "lucide-react";
import { CanonicalAriaRoute } from "@/components/aria-core/CanonicalAriaRoute";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { NexusPage, NexusCard } from "@/components/nexus-frame";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/aria")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: AriaGate,
});

/**
 * Governance rule (public demo mode): the FULL ARIA conversation — chat,
 * voice and the auth-gated aria_knowledge base — stays behind sign-in.
 * Guests get a short introduction and a sign-in button instead of a dead
 * or half-broken chat surface.
 */
function AriaGate() {
  const { user, loading } = useAuth();
  const { locale } = useI18n();
  const ar = locale === "ar";

  if (loading) return null;
  if (user) return <CanonicalAriaRoute />;

  return (
    <NexusPage
      eyebrow="ARIA ENGINE"
      title={ar ? "آريا — المحرك التنفيذي الذكي" : "ARIA — the executive AI engine"}
      subtitle={
        ar
          ? "مساعدة تنفيذية ثنائية اللغة بصوت طبيعي وذاكرة حيّة، مقيّدة ببيانات النظام وقاعدة معرفة محمية."
          : "A bilingual executive copilot with natural voice and live memory, grounded in system data and a protected knowledge base."
      }
    >
      <NexusCard className="border-emerald-400/25">
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="nx-module-icon grid h-14 w-14 place-items-center rounded-2xl">
            <Sparkles className="nx-icon-soft h-7 w-7" aria-hidden />
          </span>
          <p className="max-w-lg text-sm leading-relaxed text-white/80">
            {ar
              ? "تجيب آريا من مؤشرات النظام ولوائح الأمن الصناعي وقاعدة معرفتها، وتتحدث بصوتها الطبيعي، وتنفّذ مهامًا تشغيلية خلف بوابات اعتماد بشرية. المحادثة الكاملة — نصًا وصوتًا — تتطلب تسجيل الدخول."
              : "ARIA answers from live system data, the industrial-security framework and her protected knowledge base, speaks with her natural voice, and executes governed actions. The full conversation requires sign-in."}
          </p>
          <Link
            to="/auth"
            search={{ redirect: "/aria" }}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-6 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 active:scale-[0.97]"
          >
            <LockKeyhole className="h-4 w-4" aria-hidden />
            {ar ? "تسجيل الدخول لمحادثة آريا" : "Sign in to talk to ARIA"}
          </Link>
        </div>
      </NexusCard>
    </NexusPage>
  );
}
