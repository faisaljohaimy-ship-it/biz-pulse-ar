// Phase 11.8 — Cinematic Hero UI directive types (server-only).
export type HeroState =
  | "idle"
  | "greeting"
  | "listening"
  | "thinking"
  | "speaking"
  | "explaining"
  | "success"
  | "warning"
  | "unavailable";

export type HeroLanguage = "ar" | "en";
export type HeroDevice = "mobile" | "tablet" | "desktop";
export type HeroOrientation = "portrait" | "landscape";
export type HeroMotionPreference = "full" | "reduced";
export type HeroContrastPreference = "normal" | "high";

export interface HeroEnvironment {
  readonly device: HeroDevice;
  readonly orientation: HeroOrientation;
  readonly viewportW: number;
  readonly viewportH: number;
  readonly dpr: number;
  readonly motion: HeroMotionPreference;
  readonly contrast: HeroContrastPreference;
  readonly online: boolean;
}

export interface HeroLayoutDirective {
  readonly zone: "center" | "left" | "right";
  readonly maxWidthPx: number;
  readonly avatarSizePx: number;
  readonly panelSpacingPx: number;
  readonly safeAreaTopPx: number;
  readonly safeAreaBottomPx: number;
  readonly stackOrder: readonly ("avatar" | "caption" | "waveform" | "panels" | "overlay")[];
}

export interface HeroPresenceDirective {
  readonly state: HeroState;
  readonly presenceOpacity: number; // 0..1
  readonly glow: "ambient" | "focused" | "radiant";
  readonly ringActive: boolean;
  readonly pinned: boolean;
}

export interface HeroEntranceDirective {
  readonly phase: "off" | "reveal" | "settle" | "ready";
  readonly progress: number; // 0..1
  readonly durationMs: number;
  readonly startedAt: number | null;
}

export interface HeroLightingDirective {
  readonly key: string; // css color token
  readonly rim: string;
  readonly fill: string;
  readonly bloomStrength: number; // 0..1
  readonly saturation: number; // 0..1.5
  readonly warmth: number; // -1..1
}

export interface HeroBackgroundDirective {
  readonly layers: readonly ("gradient" | "aurora" | "grid" | "vignette")[];
  readonly hueShiftDeg: number;
  readonly speed: number; // 0..1
  readonly intensity: number; // 0..1
}

export interface HeroParticleDirective {
  readonly enabled: boolean;
  readonly count: number;
  readonly speed: number; // 0..1
  readonly size: number; // px
  readonly opacity: number; // 0..1
}

export interface HeroCameraDirective {
  readonly parallaxX: number; // -1..1
  readonly parallaxY: number;
  readonly zoom: number; // 0.9..1.1
  readonly focusPoint: "avatar" | "caption" | "panel";
  readonly easingMs: number;
}

export interface HeroDepthDirective {
  readonly foregroundZ: number;
  readonly avatarZ: number;
  readonly panelZ: number;
  readonly backgroundZ: number;
  readonly blurBackgroundPx: number;
}

export interface HeroOverlayDirective {
  readonly kind: "none" | "briefing" | "risk" | "success" | "unavailable";
  readonly visible: boolean;
  readonly severity: "info" | "warn" | "critical" | "positive";
}

export interface HeroPanelDirective {
  readonly id: string;
  readonly title_ar: string;
  readonly title_en: string;
  readonly variant: "kpi" | "action" | "insight" | "trust";
  readonly priority: number; // higher first
}

export interface HeroCaptionDirective {
  readonly visible: boolean;
  readonly language: HeroLanguage;
  readonly dir: "rtl" | "ltr";
  readonly text: string;
  readonly streaming: boolean;
  readonly fadeMs: number;
}

export interface HeroWaveformDirective {
  readonly active: boolean;
  readonly amplitude: number; // 0..1
  readonly bars: number;
  readonly smoothing: number; // 0..1
}

export interface HeroThinkingDirective {
  readonly active: boolean;
  readonly haloIntensity: number; // 0..1
  readonly ringSpeed: number; // rot/sec
}

export interface HeroListeningDirective {
  readonly active: boolean;
  readonly pulseHz: number;
  readonly pulseIntensity: number; // 0..1
}

export interface HeroSpeakingDirective {
  readonly active: boolean;
  readonly lipAmplitude: number; // 0..1
  readonly gestureBias: number; // -1..1
}

export interface HeroTransitionDirective {
  readonly from: HeroState;
  readonly to: HeroState;
  readonly durationMs: number;
  readonly stiffness: number;
  readonly damping: number;
  readonly cancelable: boolean;
}

export interface HeroAnimationTick {
  readonly frame: number;
  readonly tSec: number;
  readonly deltaMs: number;
  readonly fps: number;
}

export interface HeroPerformanceBudget {
  readonly targetFps: number;
  readonly maxParticles: number;
  readonly maxBackdropBlurPx: number;
  readonly allowAurora: boolean;
  readonly allowParticles: boolean;
}
