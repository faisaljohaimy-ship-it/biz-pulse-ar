/**
 * FinnExecutivePanel — presence · connection state · executive
 * recommendation (follows the selected region) · quick actions · voice.
 *
 * Voice adapter honesty (package §9): the cockpit never opens the
 * microphone itself. The voice button routes to the ONE existing FINN
 * integration (FinnCopilot) through the canonical useFinn() API — the
 * mic permission is requested there, behind the user's explicit gesture,
 * with FINN's exclusive server-side voice. The chip below the button
 * mirrors the live voice state from the FINN store.
 */
import * as React from "react";
import { ClipboardList, FileBarChart2, MessageCircle, PlusCircle, ShieldAlert } from "lucide-react";
import { useFinn } from "@/lib/aria-core/hooks/useFinn";
import { useFinnStore } from "@/lib/aria-core/store";
import {
  NxButton,
  NxFinnPresence,
  NxStatusIndicator,
  NxPanel,
  NxSkeleton,
  NxVoiceButton,
  type NxFinnState,
} from "@/components/nx";
import type { FinnSnapshot } from "./repository";
import { useCockpit } from "./use-cockpit";
import { emitCockpitAction, type CockpitActionId } from "./actions";

const VOICE_LABEL: Record<string, string> = {
  idle: "اضغط للتحدث — كيف يمكنني مساعدتك اليوم؟",
  listening: "FINN يستمع إليك الآن",
  recording: "جارٍ الالتقاط…",
  transcribing: "جارٍ تحويل حديثك إلى نص…",
  speaking: "FINN يتحدث…",
  processing: "جارٍ المعالجة…",
};

interface QuickActionDef {
  actionId: CockpitActionId;
  labelAr: string;
  icon: React.ComponentType<{ className?: string }>;
  run: (cockpit: ReturnType<typeof useCockpit>, openFinn: () => void) => void;
}

const QUICK_ACTIONS: readonly QuickActionDef[] = [
  {
    actionId: "quick.initiative.create",
    labelAr: "إنشاء مبادرة جديدة",
    icon: PlusCircle,
    run: (cockpit) => cockpit.openWorkflow("initiative-create"),
  },
  {
    actionId: "quick.sectorReport.create",
    labelAr: "تقرير أداء القطاعات",
    icon: FileBarChart2,
    run: (cockpit) => cockpit.openWorkflow("sector-report"),
  },
  {
    actionId: "quick.riskAnalysis.open",
    labelAr: "تحليل المخاطر",
    icon: ShieldAlert,
    run: (cockpit) => cockpit.openDrawer({ type: "risk-analysis" }),
  },
  {
    actionId: "quick.decisions.review",
    labelAr: "مراجعة القرارات المعلقة",
    icon: ClipboardList,
    run: (cockpit) => cockpit.openDrawer({ type: "decision-review" }),
  },
  {
    actionId: "finn.chat.open",
    labelAr: "محادثة FINN",
    icon: MessageCircle,
    run: (_cockpit, openFinn) => openFinn(),
  },
];

export function FinnExecutivePanel({ finn }: { finn: FinnSnapshot }) {
  const cockpit = useCockpit();
  const { open } = useFinn();
  const storeVoice = useFinnStore((s) => s.voice);
  const { regionDetail, regionLoading, openDrawer } = cockpit;

  const recommendation = regionDetail?.recommendationAr ?? finn.recommendationAr;
  const presenceState: NxFinnState =
    storeVoice === "listening"
      ? "listening"
      : storeVoice === "speaking"
        ? "speaking"
        : finn.status === "busy"
          ? "thinking"
          : "idle";

  const openFinnChat = React.useCallback(() => {
    emitCockpitAction("finn.chat.open");
    open({ focus: true });
  }, [open]);

  const toggleVoice = React.useCallback(() => {
    emitCockpitAction("finn.voice.toggle");
    // The mic itself lives in FinnCopilot (exclusive FINN voice, server
    // keys). Opening focused = the explicit gesture that surface expects.
    open({ focus: true });
    cockpit.announce("فُتحت لوحة FINN — ابدأ المحادثة الصوتية من زر المايكروفون فيها");
  }, [open, cockpit]);

  return (
    <NxPanel
      data-testid="finn-panel"
      title="FINN"
      layer="agent"
      density="command"
      headerSlot={
        <NxStatusIndicator
          status={
            finn.status === "connected" ? "success" : finn.status === "busy" ? "info" : "warning"
          }
          label={
            finn.status === "connected"
              ? "متصل"
              : finn.status === "busy"
                ? "مشغول"
                : finn.status === "not-configured"
                  ? "غير مهيأ"
                  : "غير متصل"
          }
          live={finn.status === "connected"}
        />
      }
      footer={
        <span>لا تنفيذ دون اعتماد بشري · ثقة التوصية {Math.round(finn.confidence * 100)}٪</span>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <NxFinnPresence state={presenceState} mode="advisory" size="lg" />
        <p className="text-center text-xs font-semibold text-nx-pearl/56">المساعد التنفيذي</p>

        <section aria-label="التوصية الرئيسية" className="w-full">
          <h4 className="mb-1 text-sm font-semibold text-nx-cyan">التوصية الرئيسية</h4>
          {regionLoading ? (
            <div className="flex flex-col gap-2">
              <NxSkeleton className="h-4 w-full" />
              <NxSkeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <p aria-live="polite" className="text-sm leading-relaxed text-nx-pearl/80">
              {recommendation}
            </p>
          )}
          <p className="mt-1 text-[11px] text-nx-pearl/64">
            مبنية على {finn.sourceCount} مصدرًا · محاكاة مرجعية
          </p>
          <NxButton
            variant="executive"
            size="lg"
            data-action="finn.recommendation.open"
            className="mt-3 w-full"
            onClick={() => {
              emitCockpitAction("finn.recommendation.open");
              openDrawer({ type: "recommendation" });
            }}
          >
            عرض القرار بالتفصيل
          </NxButton>
        </section>

        <section aria-label="إجراءات سريعة" data-testid="quick-actions" className="w-full">
          <h4 className="mb-2 text-sm font-semibold text-nx-pearl/72">إجراءات سريعة</h4>
          <ul className="flex flex-col gap-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.actionId}>
                  <button
                    type="button"
                    data-action={action.actionId}
                    onClick={() => {
                      emitCockpitAction(action.actionId);
                      action.run(cockpit, openFinnChat);
                    }}
                    className="nx-glass-e1 rounded-nx-12 flex min-h-11 w-full items-center gap-3 border border-white/10 px-3 py-2 text-start text-sm text-nx-pearl/80 transition-[border-color,color] duration-[var(--nx-anim-fast)] ease-[var(--nx-ease-out)] hover:border-nx-cyan/50 hover:text-nx-pearl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-cyan"
                  >
                    <Icon aria-hidden className="size-4 shrink-0 text-nx-cyan/80" />
                    {action.labelAr}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          aria-label="التحدث مع FINN"
          data-testid="finn-voice"
          className="flex w-full flex-col items-center gap-2 border-t border-white/10 pt-4"
        >
          <NxVoiceButton
            state={storeVoice === "listening" ? "listening" : "idle"}
            data-action="finn.voice.toggle"
            onClick={toggleVoice}
          />
          <p data-voice-state={storeVoice} className="text-center text-xs text-nx-pearl/56">
            {VOICE_LABEL[storeVoice] ?? VOICE_LABEL.idle}
          </p>
        </section>
      </div>
    </NxPanel>
  );
}
