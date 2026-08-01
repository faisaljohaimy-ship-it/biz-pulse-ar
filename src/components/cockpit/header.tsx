/**
 * SystemHeader — brand · ArchitectureLayerRail (01..05) · VisionClock ·
 * LIVE state · notifications · mobile menu. The layer rail is not
 * decoration: each layer is a real button opening the health drawer
 * (latency, error rate, inputs/outputs, last trace).
 */
import * as React from "react";
import { Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NxStatusIndicator } from "@/components/nx";
import type { ArchitectureLayerInfo, HealthState } from "./repository";
import { useCockpit } from "./use-cockpit";
import { emitCockpitAction, type CockpitActionId } from "./actions";

const LAYER_ACCENT: Record<ArchitectureLayerInfo["id"], string> = {
  shell: "border-nx-layer-shell/40 text-nx-layer-shell",
  intelligence: "border-nx-layer-knowledge/40 text-nx-layer-knowledge",
  platform: "border-nx-layer-runtime/40 text-nx-layer-runtime",
  agents: "border-nx-layer-agent/40 text-nx-layer-agent",
  output: "border-nx-warning/40 text-nx-warning",
};

const LAYER_ACTION: Record<ArchitectureLayerInfo["id"], CockpitActionId> = {
  shell: "architecture.shell.inspect",
  intelligence: "architecture.intelligence.inspect",
  platform: "architecture.platform.inspect",
  agents: "architecture.agents.inspect",
  output: "architecture.output.inspect",
};

const HEALTH_WORD: Record<HealthState, string> = {
  healthy: "سليمة",
  warning: "تحذير",
  critical: "حرجة",
  unknown: "غير معروفة",
};

const HEALTH_DOT: Record<HealthState, string> = {
  healthy: "bg-nx-success",
  warning: "bg-nx-warning",
  critical: "bg-nx-critical",
  unknown: "bg-nx-pearl/38",
};

/** Hexagonal SADEED brand mark — original SVG, no external asset. */
function BrandMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className="size-9 shrink-0 text-nx-cyan">
      <polygon
        points="20,3 35,11.5 35,28.5 20,37 5,28.5 5,11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.8"
      />
      <polygon
        points="20,11 28,15.5 28,24.5 20,29 12,24.5 12,15.5"
        fill="currentColor"
        opacity="0.35"
      />
      <circle cx="20" cy="20" r="2.5" fill="currentColor" />
    </svg>
  );
}

/** Live Riyadh clock: Arabic time + Gregorian date. Ticks once a minute. */
function VisionClock() {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden flex-col items-end gap-0.5 text-end sm:flex" aria-label="الساعة والرؤية">
      <span className="text-sm font-semibold tabular-nums text-nx-pearl" dir="ltr">
        {now ? now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—"}
      </span>
      <span className="text-[12px] text-nx-pearl/56" dir="ltr">
        {now ? now.toLocaleDateString("ar-SA") : ""}
      </span>
      <span className="text-[12px] font-semibold tracking-wide text-nx-cyan/80">رؤية 2030</span>
    </div>
  );
}

export function ArchitectureLayerRail({ layers }: { layers: readonly ArchitectureLayerInfo[] }) {
  const { openDrawer } = useCockpit();
  return (
    <nav
      aria-label="طبقات المعمارية الخمس"
      data-testid="architecture-layer-rail"
      className="-mx-1 flex items-stretch gap-2 overflow-x-auto px-1 py-1"
    >
      {layers.map((layer) => (
        <button
          key={layer.id}
          type="button"
          data-action={LAYER_ACTION[layer.id]}
          onClick={() => {
            emitCockpitAction(LAYER_ACTION[layer.id]);
            openDrawer({ type: "layer", id: layer.id });
          }}
          className={cn(
            "nx-glass-e1 rounded-nx-12 flex min-h-11 shrink-0 snap-start items-center gap-2.5 border px-3 py-1.5 text-start transition-[border-color,box-shadow] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] hover:border-current/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan",
            LAYER_ACCENT[layer.id],
          )}
        >
          <span className="text-xs font-bold tabular-nums" dir="ltr">
            0{layer.order}
          </span>
          <span className="flex flex-col">
            <span className="text-xs font-semibold text-nx-pearl">{layer.labelAr}</span>
            <span className="text-[12px] tracking-wide text-nx-pearl/48" dir="ltr">
              {layer.labelEn}
            </span>
          </span>
          <span
            aria-hidden
            className={cn("size-1.5 shrink-0 rounded-full", HEALTH_DOT[layer.status])}
          />
          <span className="sr-only">— الحالة {HEALTH_WORD[layer.status]}</span>
        </button>
      ))}
    </nav>
  );
}

export interface CockpitHeaderProps {
  layers: readonly ArchitectureLayerInfo[];
  onToggleNav: () => void;
}

export function CockpitHeader({ layers, onToggleNav }: CockpitHeaderProps) {
  const { openDrawer, unreadCount } = useCockpit();
  return (
    <header data-testid="system-header" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-action="nav.menu.toggle"
            aria-label="فتح أو إغلاق القائمة"
            onClick={() => {
              emitCockpitAction("nav.menu.toggle");
              onToggleNav();
            }}
            className="nx-holo-icon rounded-nx-12 inline-flex size-11 items-center justify-center text-nx-pearl transition-[border-color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan xl:hidden"
          >
            <Menu aria-hidden className="size-5" />
          </button>
          <BrandMark />
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight text-nx-pearl">SADEED</span>
            <span className="text-[12px] tracking-widest text-nx-pearl/56" dir="ltr">
              AI OPERATING SYSTEM
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NxStatusIndicator status="success" label="بث مباشر" live />
          <button
            type="button"
            data-action="notifications.open"
            aria-label={`فتح الإشعارات${unreadCount > 0 ? ` — ${unreadCount} غير مقروءة` : ""}`}
            onClick={() => {
              emitCockpitAction("notifications.open");
              openDrawer({ type: "notifications" });
            }}
            className="nx-holo-icon rounded-nx-12 relative inline-flex size-11 items-center justify-center text-nx-pearl transition-[border-color] duration-[var(--nx-anim-fast)] hover:border-nx-cyan/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
          >
            <Bell aria-hidden className="size-5" />
            {unreadCount > 0 ? (
              <span
                aria-hidden
                className="absolute -top-1 -start-1 inline-flex min-w-5 items-center justify-center rounded-full bg-nx-critical px-1 text-[12px] font-bold tabular-nums text-nx-obsidian"
              >
                {unreadCount}
              </span>
            ) : null}
          </button>
          <VisionClock />
        </div>
      </div>
      {/* Absolute-clarity law (Article 21): the page introduces itself in
          one visible sentence on EVERY viewport, simulation badge included. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-xl font-bold leading-tight text-nx-pearl md:text-2xl">
          قمرة القيادة التنفيذية
        </h1>
        <span className="rounded-nx-8 border border-nx-warning/40 px-2 py-0.5 text-[12px] text-nx-warning">
          محاكاة مرجعية
        </span>
        <p className="w-full text-xs text-nx-pearl/56 md:w-auto md:flex-1">
          لوحة القيادة العليا لسَدِيد — صحة النظام والمناطق والقرارات وFINN في شاشة واحدة، ببيانات
          محاكاة مرجعية موسومة.
        </p>
      </div>
      <ArchitectureLayerRail layers={layers} />
    </header>
  );
}
