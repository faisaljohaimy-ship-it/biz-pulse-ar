// Composes every hero directive into a single frame the UI can consume.
import type {
  HeroBackgroundDirective,
  HeroCameraDirective,
  HeroCaptionDirective,
  HeroDepthDirective,
  HeroEntranceDirective,
  HeroEnvironment,
  HeroLayoutDirective,
  HeroLightingDirective,
  HeroListeningDirective,
  HeroOverlayDirective,
  HeroPanelDirective,
  HeroParticleDirective,
  HeroPerformanceBudget,
  HeroPresenceDirective,
  HeroSpeakingDirective,
  HeroState,
  HeroThinkingDirective,
  HeroTransitionDirective,
  HeroWaveformDirective,
  HeroAnimationTick,
  HeroLanguage,
} from "./types";
import { computeHeroLayout } from "./hero-layout.server";
import { computePresence } from "./hero-presence.server";
import { beginEntrance, sampleEntrance } from "./hero-entrance.server";
import { computeLighting } from "./hero-lighting.server";
import { computeBackground } from "./hero-background.server";
import { computeParticles } from "./hero-particles.server";
import { computeCamera } from "./hero-camera.server";
import { computeDepth } from "./hero-depth.server";
import { computeOverlay } from "./hero-overlay.server";
import { computePanels } from "./hero-panels.server";
import { computeCaption } from "./hero-caption.server";
import { computeWaveform } from "./hero-waveform.server";
import { computeThinking } from "./hero-thinking.server";
import { computeListening } from "./hero-listening.server";
import { computeSpeaking } from "./hero-speaking.server";
import { computeTransition } from "./hero-transitions.server";
import { tickAnimation } from "./hero-animation.server";
import { computePerformanceBudget, noteFrame } from "./hero-performance.server";
import { logHero } from "./hero-audit.server";
import { noteRender, noteStateChange, noteCaption, noteFpsSample } from "./hero-metrics.server";

interface RuntimeRow {
  state: HeroState;
  prev: HeroState;
  pinned: boolean;
  language: HeroLanguage;
  captionText: string;
  streaming: boolean;
  voiceLevel: number;
  lipAmplitude: number;
  pointerX: number;
  pointerY: number;
}

const RUNTIME = new Map<string, RuntimeRow>();

export interface HeroRuntimeInput {
  readonly instanceId: string;
  readonly env: HeroEnvironment;
  readonly initialState?: HeroState;
  readonly initialLanguage?: HeroLanguage;
}

export interface HeroFrame {
  readonly instanceId: string;
  readonly tick: HeroAnimationTick;
  readonly env: HeroEnvironment;
  readonly state: HeroState;
  readonly transition: HeroTransitionDirective | null;
  readonly presence: HeroPresenceDirective;
  readonly entrance: HeroEntranceDirective;
  readonly layout: HeroLayoutDirective;
  readonly lighting: HeroLightingDirective;
  readonly background: HeroBackgroundDirective;
  readonly particles: HeroParticleDirective;
  readonly camera: HeroCameraDirective;
  readonly depth: HeroDepthDirective;
  readonly overlay: HeroOverlayDirective;
  readonly panels: readonly HeroPanelDirective[];
  readonly caption: HeroCaptionDirective;
  readonly waveform: HeroWaveformDirective;
  readonly thinking: HeroThinkingDirective;
  readonly listening: HeroListeningDirective;
  readonly speaking: HeroSpeakingDirective;
  readonly budget: HeroPerformanceBudget;
}

export function initHeroRuntime(input: HeroRuntimeInput): RuntimeRow {
  const cur = RUNTIME.get(input.instanceId);
  if (cur) return cur;
  const row: RuntimeRow = {
    state: input.initialState ?? "idle",
    prev: input.initialState ?? "idle",
    pinned: false,
    language: input.initialLanguage ?? "ar",
    captionText: "",
    streaming: false,
    voiceLevel: 0,
    lipAmplitude: 0,
    pointerX: 0.5,
    pointerY: 0.5,
  };
  RUNTIME.set(input.instanceId, row);
  beginEntrance(input.instanceId);
  logHero(input.instanceId, "entrance");
  return row;
}

export interface HeroUpdate {
  readonly state?: HeroState;
  readonly pinned?: boolean;
  readonly language?: HeroLanguage;
  readonly captionText?: string;
  readonly streaming?: boolean;
  readonly voiceLevel?: number;
  readonly lipAmplitude?: number;
  readonly pointerX?: number;
  readonly pointerY?: number;
}

export function updateHero(instanceId: string, patch: HeroUpdate): void {
  const row = RUNTIME.get(instanceId);
  if (!row) return;
  if (patch.state && patch.state !== row.state) {
    row.prev = row.state;
    row.state = patch.state;
    noteStateChange();
    logHero(instanceId, "state_change", { from: row.prev, to: row.state });
  }
  if (typeof patch.pinned === "boolean") row.pinned = patch.pinned;
  if (patch.language) row.language = patch.language;
  if (typeof patch.captionText === "string") {
    row.captionText = patch.captionText;
    if (patch.captionText.length > 0) {
      noteCaption();
      logHero(instanceId, "caption");
    }
  }
  if (typeof patch.streaming === "boolean") row.streaming = patch.streaming;
  if (typeof patch.voiceLevel === "number") row.voiceLevel = patch.voiceLevel;
  if (typeof patch.lipAmplitude === "number") row.lipAmplitude = patch.lipAmplitude;
  if (typeof patch.pointerX === "number") row.pointerX = patch.pointerX;
  if (typeof patch.pointerY === "number") row.pointerY = patch.pointerY;
  RUNTIME.set(instanceId, row);
}

export function renderHeroFrame(instanceId: string, env: HeroEnvironment): HeroFrame | null {
  const row = RUNTIME.get(instanceId);
  if (!row) return null;
  const tick = tickAnimation(instanceId);
  noteFrame(instanceId, tick.fps);
  noteFpsSample(tick.fps);
  const budget = computePerformanceBudget(env);
  const transition =
    row.prev !== row.state ? computeTransition(row.prev, row.state, env.motion) : null;
  const frame: HeroFrame = {
    instanceId,
    tick,
    env,
    state: row.state,
    transition,
    presence: computePresence({ state: row.state, pinned: row.pinned, focused: env.online }),
    entrance: sampleEntrance(instanceId),
    layout: computeHeroLayout(env),
    lighting: computeLighting(row.state, env.contrast === "high"),
    background: computeBackground(env, row.state),
    particles: computeParticles(env, row.state, budget),
    camera: computeCamera({
      env,
      state: row.state,
      pointerX: row.pointerX,
      pointerY: row.pointerY,
    }),
    depth: computeDepth(env),
    overlay: computeOverlay(row.state),
    panels: computePanels(row.state),
    caption: computeCaption({
      text: row.captionText,
      language: row.language,
      streaming: row.streaming,
    }),
    waveform: computeWaveform(row.state, row.voiceLevel),
    thinking: computeThinking(row.state),
    listening: computeListening(row.state, row.voiceLevel),
    speaking: computeSpeaking(row.state, row.lipAmplitude),
    budget,
  };
  noteRender();
  return frame;
}

export function disposeHero(instanceId: string): void {
  RUNTIME.delete(instanceId);
  logHero(instanceId, "reset");
}

export function currentHeroState(instanceId: string): HeroState | null {
  return RUNTIME.get(instanceId)?.state ?? null;
}
