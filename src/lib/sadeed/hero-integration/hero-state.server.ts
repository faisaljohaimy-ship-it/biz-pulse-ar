// Hero state store — single active hero instance per app process.
import type { HeroButtonId, HeroButtonState, HeroState, HeroPresence, HeroGlow } from "./types";
import type { AudioState, VoiceLang } from "../live-voice/types";

const HERO_INSTANCES = new Map<string, HeroState>();

const BUTTON_IDS: readonly HeroButtonId[] = [
  "talk_to_aria",
  "executive_briefing",
  "start_demo",
  "show_risks",
  "show_today_summary",
  "generate_report",
];

function uid(): string {
  return `hero_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function initialButtons(): Record<HeroButtonId, HeroButtonState> {
  const out: Partial<Record<HeroButtonId, HeroButtonState>> = {};
  for (const id of BUTTON_IDS) out[id] = { id, status: "idle" };
  return out as Record<HeroButtonId, HeroButtonState>;
}

export function openHero(lang: VoiceLang = "ar"): HeroState {
  const s: HeroState = {
    instanceId: uid(),
    startedAt: Date.now(),
    presence: "boot",
    glow: "ambient",
    audio: "idle",
    lang,
    greeted: false,
    activeTurnId: null,
    activeButton: null,
    buttons: initialButtons(),
  };
  HERO_INSTANCES.set(s.instanceId, s);
  return s;
}

export function getHero(id: string): HeroState | null {
  return HERO_INSTANCES.get(id) ?? null;
}

export function updateHero(id: string, patch: Partial<HeroState>): HeroState | null {
  const cur = HERO_INSTANCES.get(id);
  if (!cur) return null;
  const next: HeroState = { ...cur, ...patch };
  HERO_INSTANCES.set(id, next);
  return next;
}

export function setHeroPresence(
  id: string,
  presence: HeroPresence,
  glow?: HeroGlow,
): HeroState | null {
  return updateHero(id, { presence, ...(glow ? { glow } : {}) });
}

export function setHeroAudio(id: string, audio: AudioState): HeroState | null {
  return updateHero(id, { audio });
}

export function setHeroButton(
  id: string,
  buttonId: HeroButtonId,
  patch: Partial<HeroButtonState>,
): HeroState | null {
  const cur = HERO_INSTANCES.get(id);
  if (!cur) return null;
  const nextButton: HeroButtonState = { ...cur.buttons[buttonId], ...patch, id: buttonId };
  const buttons = { ...cur.buttons, [buttonId]: nextButton };
  const next: HeroState = { ...cur, buttons };
  HERO_INSTANCES.set(id, next);
  return next;
}

/** Enforces single active hero — closes older instances. */
export function reconcileSingleHero(currentId: string): void {
  for (const [id] of HERO_INSTANCES) {
    if (id !== currentId) HERO_INSTANCES.delete(id);
  }
}

export function closeHero(id: string): void {
  HERO_INSTANCES.delete(id);
}
