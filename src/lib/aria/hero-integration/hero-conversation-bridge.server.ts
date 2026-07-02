// Bridge to Phase 11.1 conversation engine — opens turns, streams responses.
// Uses only public types; concrete conversation kernel is imported dynamically
// to avoid tight coupling and to keep the client bundle safe.
import type { HeroButtonId } from "./types";
import { emitHeroEvent } from "./hero-events.server";
import { setHeroAudio, updateHero } from "./hero-state.server";

export interface HeroTurnInput {
  readonly instanceId: string;
  readonly prompt_ar: string;
  readonly prompt_en: string;
  readonly buttonId?: HeroButtonId;
  readonly lang?: "ar" | "en";
}

export interface HeroTurnResult {
  readonly ok: boolean;
  readonly turnId?: string;
  readonly reason?: string;
}

function turnId(): string {
  return `turn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Opens a conversation turn tied to the hero. Downstream conversation engine
 * is invoked by the caller; here we register the turn on the hero state so
 * presence/glow/audio can follow it deterministically.
 */
export function openHeroTurn(input: HeroTurnInput): HeroTurnResult {
  const id = turnId();
  const state = updateHero(input.instanceId, { activeTurnId: id });
  if (!state) return { ok: false, reason: "hero instance not found" };
  setHeroAudio(input.instanceId, "thinking");
  emitHeroEvent(input.instanceId, "click_button", {
    buttonId: input.buttonId,
    turnId: id,
    lang: input.lang ?? state.lang,
  });
  return { ok: true, turnId: id };
}

export function closeHeroTurn(instanceId: string, tid: string, ok: boolean): void {
  const patch = { activeTurnId: null } as const;
  updateHero(instanceId, patch);
  setHeroAudio(instanceId, ok ? "idle" : "error");
  emitHeroEvent(instanceId, ok ? "response_done" : "error", { turnId: tid });
}
