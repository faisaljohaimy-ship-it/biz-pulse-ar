/**
 * SystemHeader — brand · ArchitectureLayerRail (01..05) · VisionClock ·
 * LIVE state · notifications · mobile menu. The layer rail is not
 * decoration: each layer is a real button opening the health drawer
 * (latency, error rate, inputs/outputs, last trace).
 */
import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { SadeedWordmark } from "@/components/brand/SadeedWordmark";
import { SadeedEmblem } from "@/components/brand/SadeedPlateLockup";
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

/**
 * العلامة الرسمية — الرمز السداسي «S» من لوحة المالك (أمر ٢٠٢٦/١٠/١٨ R5)،
 * المصدر نفسه لأيقونة التبويب والتطبيق. زخرفيّ لأن اسم العلامة الحيّ يُقرأ من
 * SadeedWordmark بجوارها.
 */
function BrandMark() {
  return <SadeedEmblem decorative className="size-9 shrink-0" />;
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
      className="-mx-1 hidden items-stretch gap-2 overflow-x-auto px-1 py-1 lg:flex"
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
            <span className="text-xs font-bold text-nx-pearl">{layer.labelAr}</span>
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
  // سقط `useCockpit()` هنا مع الجرس: كان `openDrawer` و`unreadCount`
  // يخدمان زرّ الإشعارات وحده في هذا المكوّن، فبقاؤهما بعده تفكيكٌ ميّت.
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
          {/* العلامة الكتابية الكانونية: الاسم يتبع اللغة، والوصف الرسمي
              «منظومة القرار والإنجاز الذكي» بدل نصٍّ لاتيني ثابت. */}
          <SadeedWordmark size="sm" showDescriptor />
        </div>
        <div className="flex items-center gap-3">
          <NxStatusIndicator status="success" label="بث مباشر" live />
          {/* **جرسٌ ثانٍ سقط مع الأوّل (أمر المالك ٢٠٢٦/٠٩/١٠).** كان
              هنا زرّ إشعارات كامل (مدار 44px + شارة غير المقروء + درج
              الإشعارات) — نسخةٌ ثانية من جرس الشريط العلوي، وأمر «أزل
              الجرس من النظام كاملًا» يشملها. ومساره `/nx-cockpit` محجوب
              ويعيد التوجيه للرئيسية، فلم يكن يُرسم لمستخدم؛ بقاؤه كان
              يجعل الإزالة ناقصةً في الشجرة لا في الشاشة. */}
          <VisionClock />
        </div>
      </div>
      {/* Absolute-clarity law (Article 21): the page introduces itself in
          one visible sentence on EVERY viewport. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-xl font-bold leading-tight text-nx-pearl md:text-2xl">
          قمرة القيادة التنفيذية
        </h1>
        <p className="w-full text-xs text-nx-pearl/56 md:w-auto md:flex-1">
          لوحة القيادة العليا لسَدِيد — صحة النظام والمناطق والقرارات والمساعد في شاشة واحدة.
        </p>
      </div>
      <ArchitectureLayerRail layers={layers} />
    </header>
  );
}
