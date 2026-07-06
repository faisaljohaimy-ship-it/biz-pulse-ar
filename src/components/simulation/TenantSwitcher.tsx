// Tenant switcher chip — shown in the command-center header.
// Uses a native <select> for perfect keyboard/screen-reader semantics and
// zero extra deps. When only one tenant exists (the seeded reference client)
// the control still renders so the label is visible; the underlying select
// simply lists that one option.
//
// The "active" tenant is the one flagged `is_default_view = true` in
// client_profile. Persisting the selection to the DB is out of scope for
// this component — writing back requires a manager-role mutation.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2 } from "lucide-react";
import { listClientTenants } from "@/lib/client-tenant.functions";

export function TenantSwitcher() {
  const fetchTenants = useServerFn(listClientTenants);
  const { data, isPending } = useQuery({
    queryKey: ["client-tenants"],
    queryFn: () => fetchTenants(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const tenants = data ?? [];
  const active = useMemo(
    () => tenants.find((t) => t.is_default_view) ?? tenants[0] ?? null,
    [tenants],
  );

  if (isPending) {
    return (
      <div
        dir="rtl"
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] opacity-60"
        style={{ borderColor: "rgba(148,163,184,0.35)", color: "rgba(226,232,240,0.7)" }}
      >
        <Building2 className="h-3.5 w-3.5" />
        <span style={{ fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}>
          جارٍ تحميل العميل…
        </span>
      </div>
    );
  }

  if (!active) return null;

  const flavor = active.is_simulation
    ? {
        border: "rgba(251,146,60,0.45)",
        bg: "rgba(251,146,60,0.10)",
        text: "#FDBA74",
        badge: "(محاكاة)",
      }
    : {
        border: "rgba(52,211,153,0.45)",
        bg: "rgba(52,211,153,0.10)",
        text: "#6EE7B7",
        badge: "(إنتاج)",
      };

  return (
    <label
      dir="rtl"
      className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold sm:text-xs"
      style={{
        borderColor: flavor.border,
        background: flavor.bg,
        color: flavor.text,
        fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")',
        minHeight: 36,
      }}
      data-testid="tenant-switcher"
    >
      <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">
        العرض: <span className="font-bold">{active.name_ar}</span>{" "}
        <span className="opacity-80">{flavor.badge}</span>
      </span>
      <select
        aria-label="اختيار العميل"
        defaultValue={active.id}
        className="cursor-pointer bg-transparent outline-none"
        style={{ color: flavor.text, fontFamily: 'var(--font-arabic, "IBM Plex Sans Arabic")' }}
        onChange={() => {
          // Persisting the active tenant requires manager-role RLS write.
          // Left as a follow-up: for now the switcher is read-only and
          // reflects `is_default_view` from the DB.
        }}
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name_ar} {t.is_simulation ? "(محاكاة)" : "(إنتاج)"}
          </option>
        ))}
      </select>
    </label>
  );
}
