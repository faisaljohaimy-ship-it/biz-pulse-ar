import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { ExecPublicDemoRoom } from "@/components/executive/ExecPublicDemoRoom";
import { ExecConsole } from "@/routes/_authenticated/exec-console";
import { CommandRoomPowerUp } from "@/components/cinema/CommandRoomPowerUp";

/**
 * Canonical /exec route.
 *
 * Public URL that branches on session state:
 *   • Authenticated → render the exact same executive command-room component
 *     used by the authenticated route (imported, not copied).
 *   • Unauthenticated → render the demo command room fed by demoDataProvider.
 *
 * There is no login wall on /exec. Sign-in is offered as an optional CTA
 * inside the demo body, and returns the user to /exec after auth.
 */
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
  component: ExecRouteSwitch,
});

function ExecRouteSwitch() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#02101e] text-white/70">
        …
      </div>
    );
  }

  return (
    <>
      <CommandRoomPowerUp />
      {user ? <ExecConsole /> : <ExecPublicDemoRoom />}
    </>
  );
}
