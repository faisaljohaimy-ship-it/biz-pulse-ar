/**
 * RegionSwitcher — compact four-way picker for the Industrial Security
 * regional administrations. Selecting a region sets the active sector via
 * `useRegion().setRegion()` and navigates to `/sec`, which reads the same
 * context so the entire Nexios system boots into the chosen region.
 */
import { useNavigate } from "@tanstack/react-router";
import { MapPin, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGION_ACCENT_HEX } from "@/lib/regions";
import { cn } from "@/lib/utils";

export function RegionSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { region, regionId, regions, setRegion } = useRegion();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const label = ar ? region.labelAr : region.labelEn;
  const activeColor = REGION_ACCENT_HEX[regionId];

  return (
    <div ref={ref} className="relative" dir={ar ? "rtl" : "ltr"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border bg-[#04111f]/60 px-3 py-2 text-start text-xs font-semibold text-sidebar-foreground transition hover:bg-[#04111f]/85 focus-visible:outline-none focus-visible:ring-2"
        style={{
          borderColor: `${activeColor}66`,
          boxShadow: `inset 0 0 12px ${activeColor}0D, 0 0 14px -7px ${activeColor}`,
          outlineColor: activeColor,
        }}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: activeColor }} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border bg-[#04111f]/95 shadow-lg backdrop-blur-md"
          style={{
            borderColor: `${activeColor}66`,
            boxShadow: `0 14px 34px -12px ${activeColor}66`,
          }}
        >
          {regions.map((r) => {
            const active = r.id === region.id;
            const optionColor = REGION_ACCENT_HEX[r.id];
            return (
              <li key={r.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setRegion(r.id);
                    setOpen(false);
                    onNavigate?.();
                    navigate({ to: "/sec" });
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-start text-xs transition",
                    active
                      ? "text-white"
                      : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white",
                  )}
                  style={{
                    backgroundColor: active ? `${optionColor}20` : undefined,
                    boxShadow: active ? `inset 3px 0 0 ${optionColor}` : undefined,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: active ? optionColor : `${optionColor}66`,
                      boxShadow: active ? `0 0 8px ${optionColor}` : undefined,
                    }}
                  />
                  <span className="truncate">{ar ? r.shortAr : r.shortEn}</span>
                  <span className="ms-auto truncate text-[10px] text-muted-foreground">
                    {ar ? "الأمن الصناعي" : "Industrial Security"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
