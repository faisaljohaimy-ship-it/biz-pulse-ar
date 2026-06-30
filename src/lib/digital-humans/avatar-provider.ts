/**
 * Avatar Provider abstraction — lets the Digital Human render layer swap
 * between the built-in SVG portrait and future high-fidelity providers
 * (Azure AI Avatar, HeyGen, D-ID, Synthesia, ReadyPlayerMe + WebGL, etc.)
 * without changing call sites.
 *
 * The contract is intentionally small and renderer-agnostic:
 *   - `id`           — stable provider name
 *   - `capabilities` — what the provider can do
 *   - `Render`       — React component that paints the avatar
 *
 * Concrete provider adapters live alongside this file (e.g. an Azure
 * adapter would expose a `Render` that mounts a `<video>` and streams the
 * provider's media into it). All providers receive identical props so the
 * dock/stage layer never branches on provider type.
 */
import type { ComponentType } from "react";
import type { DigitalHumanSpec, DigitalHumanState } from "./registry";

export interface AvatarSpeakTurn {
  /** Stable id; provider uses it to dedupe and to fire `onSpeechEnd`. */
  id: string;
  text: string;
  lang: "ar" | "en";
}

export interface AvatarRenderProps {
  spec: DigitalHumanSpec;
  state: DigitalHumanState;
  size?: number;
  /** 0..1 audio-driven mouth opening (overrides built-in lip frames). */
  mouthAmplitude?: number;
  ambient?: boolean;
  ar?: boolean;
  showLabel?: boolean;
  className?: string;
  /**
   * Streaming-video providers (HeyGen / D-ID / Azure) own audio + lip-sync.
   * When set, the dock hands over the spoken turn and waits for `onSpeechEnd`.
   * Built-in SVG / R3F providers ignore these props.
   */
  speakTurn?: AvatarSpeakTurn | null;
  onSpeechEnd?: (id: string) => void;
  onSpeechError?: (id: string, message: string) => void;
}

export interface AvatarProvider {
  id: "svg" | "azure" | "heygen" | "did" | "synthesia" | "readyplayerme";
  label: string;
  capabilities: {
    realtimeLipSync: boolean;
    photorealistic: boolean;
    streamingVideo: boolean;
    requiresNetwork: boolean;
  };
  Render: ComponentType<AvatarRenderProps>;
}

// Provider registry — additional adapters register themselves by importing
// this module and pushing into PROVIDERS. The default SVG provider is
// registered from `DigitalHumanAvatar.tsx` to avoid a circular dependency.
export const PROVIDERS = new Map<AvatarProvider["id"], AvatarProvider>();

export function registerAvatarProvider(provider: AvatarProvider) {
  PROVIDERS.set(provider.id, provider);
}

export function getAvatarProvider(id?: AvatarProvider["id"]): AvatarProvider {
  const fallback = PROVIDERS.get("svg");
  if (!fallback) throw new Error("SVG avatar provider not registered");
  if (!id) return fallback;
  return PROVIDERS.get(id) ?? fallback;
}
