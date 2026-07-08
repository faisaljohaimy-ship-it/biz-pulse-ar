// Central controller — orchestrates presence, buttons, voice, and turns.
import { HERO_ACTIONS } from "./hero-actions.server";
import { emitHeroEvent } from "./hero-events.server";
import {
  getHero,
  openHero,
  reconcileSingleHero,
  setHeroButton,
  setHeroPresence,
  updateHero,
} from "./hero-state.server";
import { derivePresence } from "./hero-presence.server";
import { openHeroTurn, closeHeroTurn } from "./hero-conversation-bridge.server";
import { heroBeginListening, heroVoiceReadiness } from "./hero-voice-bridge.server";
import { avatarDirectiveFor } from "./hero-avatar-bridge.server";
import { recordHeroMetric } from "./hero-metrics.server";
import { logHeroAudit } from "./hero-audit.server";
import { HeroClickButtonInputSchema } from "./contracts";
import type { HeroActionOutcome, HeroButtonId, HeroState } from "./types";

export function bootHero(lang: "ar" | "en" | "unknown" = "ar"): HeroState {
  const s = openHero(lang);
  reconcileSingleHero(s.instanceId);
  setHeroPresence(s.instanceId, "boot", "ambient");
  emitHeroEvent(s.instanceId, "boot", { lang });
  logHeroAudit(s.instanceId, "boot");
  return s;
}

export function greetHeroOnce(instanceId: string): HeroState | null {
  const cur = getHero(instanceId);
  if (!cur) return null;
  if (cur.greeted) return cur;
  updateHero(instanceId, { greeted: true });
  setHeroPresence(instanceId, "greeting", "radiant");
  emitHeroEvent(instanceId, "greet");
  logHeroAudit(instanceId, "greet");
  // Fall back to idle after the greeting frame.
  setHeroPresence(instanceId, "idle", "ambient");
  return getHero(instanceId);
}

export function heroSnapshot(instanceId: string) {
  const state = getHero(instanceId);
  if (!state) return null;
  const { presence, glow } = derivePresence({
    audio: state.audio,
    greeted: state.greeted,
    activeTurnId: state.activeTurnId,
    error: !!state.lastError && Date.now() - state.lastError.ts < 5_000,
  });
  return {
    state,
    presence,
    glow,
    avatar: avatarDirectiveFor(presence),
    voice: heroVoiceReadiness(),
  };
}

export function heroClickButton(rawInput: unknown): HeroActionOutcome {
  const parsed = HeroClickButtonInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      buttonId: "talk_to_aria",
      message_ar: "طلب غير صالح.",
      message_en: "Invalid request.",
      reason: parsed.error.message,
    };
  }
  const { instanceId, buttonId } = parsed.data;
  const state = getHero(instanceId);
  if (!state) {
    return {
      ok: false,
      buttonId,
      message_ar: "الجلسة غير موجودة.",
      message_en: "Session not found.",
      reason: "hero missing",
    };
  }
  const spec = HERO_ACTIONS[buttonId];
  setHeroButton(instanceId, buttonId, { status: "loading", startedAt: Date.now() });
  updateHero(instanceId, { activeButton: buttonId });

  if (spec.requiresVoice) {
    const ready = heroBeginListening(instanceId);
    if (!ready.ok) {
      setHeroButton(instanceId, buttonId, {
        status: "error",
        completedAt: Date.now(),
        message_ar: "الصوت غير متاح، يمكنك المتابعة كتابياً.",
        message_en: "Voice unavailable, continue by text.",
      });
      recordHeroMetric("button_error", buttonId);
      logHeroAudit(instanceId, "voice_result", { ok: false, reason: ready.reason });
      return {
        ok: false,
        buttonId,
        message_ar: "الصوت غير متاح، يمكنك المتابعة كتابياً.",
        message_en: "Voice unavailable, continue by text.",
        reason: ready.reason,
      };
    }
    setHeroButton(instanceId, buttonId, {
      status: "success",
      completedAt: Date.now(),
      message_ar: "أستمع إليك.",
      message_en: "I'm listening.",
    });
    recordHeroMetric("button_ok", buttonId);
    logHeroAudit(instanceId, "voice_result", { ok: true, stage: "listening" });
    return {
      ok: true,
      buttonId,
      message_ar: "أستمع إليك.",
      message_en: "I'm listening.",
    };
  }

  const turn = openHeroTurn({
    instanceId,
    prompt_ar: spec.prompt_ar,
    prompt_en: spec.prompt_en,
    buttonId,
    lang: state.lang === "unknown" ? "ar" : state.lang,
  });
  if (!turn.ok || !turn.turnId) {
    setHeroButton(instanceId, buttonId, {
      status: "error",
      completedAt: Date.now(),
      message_ar: "تعذّر بدء المهمة.",
      message_en: "Could not start the task.",
    });
    recordHeroMetric("button_error", buttonId);
    logHeroAudit(instanceId, "error", { buttonId, reason: turn.reason });
    return {
      ok: false,
      buttonId,
      message_ar: "تعذّر بدء المهمة.",
      message_en: "Could not start the task.",
      reason: turn.reason,
    };
  }
  setHeroButton(instanceId, buttonId, {
    status: "success",
    completedAt: Date.now(),
    message_ar: labelSuccessAr(buttonId),
    message_en: labelSuccessEn(buttonId),
  });
  recordHeroMetric("button_ok", buttonId);
  logHeroAudit(instanceId, "click_button", { buttonId, turnId: turn.turnId });
  return {
    ok: true,
    buttonId,
    turnId: turn.turnId,
    message_ar: labelSuccessAr(buttonId),
    message_en: labelSuccessEn(buttonId),
  };
}

export function heroCompleteTurn(instanceId: string, turnId: string, ok: boolean): void {
  closeHeroTurn(instanceId, turnId, ok);
  const state = getHero(instanceId);
  if (state?.activeButton) {
    updateHero(instanceId, { activeButton: null });
  }
}

function labelSuccessAr(id: HeroButtonId): string {
  switch (id) {
    case "executive_briefing":
      return "جاري تجهيز الإحاطة التنفيذية.";
    case "start_demo":
      return "بدأ العرض التنفيذي.";
    case "show_risks":
      return "أعرض أعلى المخاطر.";
    case "show_today_summary":
      return "ملخّص اليوم قيد التجهيز.";
    case "generate_report":
      return "جاري إنشاء التقرير التنفيذي.";
    case "talk_to_aria":
      return "أستمع إليك.";
  }
}
function labelSuccessEn(id: HeroButtonId): string {
  switch (id) {
    case "executive_briefing":
      return "Preparing executive briefing.";
    case "start_demo":
      return "Executive demo started.";
    case "show_risks":
      return "Surfacing top risks.";
    case "show_today_summary":
      return "Preparing today's summary.";
    case "generate_report":
      return "Generating executive report.";
    case "talk_to_aria":
      return "I'm listening.";
  }
}
