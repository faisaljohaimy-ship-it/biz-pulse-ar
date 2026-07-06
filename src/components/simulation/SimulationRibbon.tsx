// Persistent simulation ribbon — appears on every authenticated screen
// whenever the active default tenant is a simulated one. Reads the
// `client_profile.ribbon_text_ar` for the visible label (default text
// enforced by the DB migration).
//
// Uses TanStack Query so it stays cheap (one request per session).
// Renders NOTHING when the query is pending, empty, or the active
// tenant is not simulated — no flashing, no fabricated labels.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";
import { listClientTenants } from "@/lib/client-tenant.functions";

export function SimulationRibbon() {
  const fetchTenants = useServerFn(listClientTenants);
  const { data } = useQuery({
    queryKey: ["client-tenants"],
    queryFn: () => fetchTenants(),
    // Ribbon can be stale for the duration of the session — tenant switching
    // is deliberate, not high-frequency.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const activeTenant = data?.find((t) => t.is_default_view) ?? data?.[0];
  if (!activeTenant || !activeTenant.is_simulation) return null;

  return (
    <div
      role="status"
      dir="rtl"
      aria-live="polite"
      data-testid="simulation-ribbon"
      className="flex w-full items-center justify-center gap-2 border-b px-3 py-1.5 text-[11px] font-semibold sm:text-xs"
      style={{
        borderColor: "rgba(251,146,60,0.35)",
        background:
          "linear-gradient(180deg, rgba(251,146,60,0.14) 0%, rgba(251,146,60,0.06) 100%)",
        color: "#FDBA74",
        fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")',
      }}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {activeTenant.ribbon_text_ar} · العميل النموذجي:{" "}
        <span className="font-bold">{activeTenant.name_ar}</span>
      </span>
    </div>
  );
}
