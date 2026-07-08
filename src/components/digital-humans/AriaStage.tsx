/**
 * AriaStage — the permanent ARIA Digital Human anchor. Speaks the
 * current executive narrative line driven by real overview data, with
 * idle breathing/blinking when nothing is happening. Replaces the
 * previous Sparkles-only welcome glyph.
 */
import { useEffect } from "react";
import { ARIA } from "@/lib/digital-humans/registry";
import { useDigitalHuman } from "@/lib/digital-humans/engine";
import { DigitalHumanAvatar } from "./DigitalHumanAvatar";
import { cn } from "@/lib/utils";

interface Props {
  ar: boolean;
  line_ar?: string;
  line_en?: string;
  size?: number;
  className?: string;
  /** When true, place ARIA in a heroic glass card. */
  framed?: boolean;
}

export function AriaStage({ ar, line_ar, line_en, size = 120, className, framed = true }: Props) {
  const dh = useDigitalHuman(ARIA);

  useEffect(() => {
    if (line_ar || line_en) {
      dh.enqueue({
        id: `aria-${Date.now()}`,
        text_ar: line_ar ?? "",
        text_en: line_en ?? "",
        preState: "thinking",
        postState: "completed",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line_ar, line_en]);

  const body = (
    <div className="flex items-center gap-4">
      <DigitalHumanAvatar spec={ARIA} state={dh.state} size={size} ar={ar} ambient />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">
          {ar ? ARIA.title_ar : ARIA.title_en}
        </div>
        <div className="mt-1 text-lg md:text-xl text-white font-light">
          {ar ? ARIA.name_ar : ARIA.name_en}
        </div>
        {dh.currentTurn ? (
          <div className="mt-2 text-sm text-white/85 leading-relaxed max-w-xl">
            {ar ? dh.currentTurn.text_ar : dh.currentTurn.text_en}
          </div>
        ) : (
          <div className="mt-2 text-sm text-white/55">
            {ar ? "جاهزة لخدمتك. أستمع للأحداث الحية." : "Standing by. Monitoring live operations."}
          </div>
        )}
      </div>
    </div>
  );

  if (!framed) return <div className={className}>{body}</div>;
  return (
    <div
      className={cn(
        "rounded-2xl border border-cyan-400/20 bg-white/[0.03] backdrop-blur-xl p-5 md:p-6",
        className,
      )}
    >
      {body}
    </div>
  );
}
