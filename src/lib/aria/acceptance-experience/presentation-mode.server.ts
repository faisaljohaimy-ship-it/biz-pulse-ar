// Presentation mode — enables demo pacing and reduced noise.
export type PresentationMode = "off" | "acceptance" | "demo" | "boardroom";

interface Row {
  mode: PresentationMode;
  since: number;
}
const R = new Map<string, Row>();

export function setPresentationMode(id: string, mode: PresentationMode): PresentationMode {
  R.set(id, { mode, since: Date.now() });
  return mode;
}

export function getPresentationMode(id: string): PresentationMode {
  return R.get(id)?.mode ?? "off";
}

export interface PresentationProfile {
  readonly mode: PresentationMode;
  readonly reduceMotion: boolean;
  readonly reduceChrome: boolean;
  readonly slowerSpeech: boolean;
  readonly captionsAlwaysOn: boolean;
  readonly delightCooldownMs: number;
}

export function presentationProfile(mode: PresentationMode): PresentationProfile {
  switch (mode) {
    case "off":
      return {
        mode,
        reduceMotion: false,
        reduceChrome: false,
        slowerSpeech: false,
        captionsAlwaysOn: false,
        delightCooldownMs: 30_000,
      };
    case "acceptance":
      return {
        mode,
        reduceMotion: false,
        reduceChrome: true,
        slowerSpeech: false,
        captionsAlwaysOn: true,
        delightCooldownMs: 45_000,
      };
    case "demo":
      return {
        mode,
        reduceMotion: false,
        reduceChrome: true,
        slowerSpeech: true,
        captionsAlwaysOn: true,
        delightCooldownMs: 60_000,
      };
    case "boardroom":
      return {
        mode,
        reduceMotion: true,
        reduceChrome: true,
        slowerSpeech: true,
        captionsAlwaysOn: true,
        delightCooldownMs: 90_000,
      };
  }
}
