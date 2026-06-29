/**
 * Alive State machine for Executive Digital Humans.
 *
 * Maps the existing narrator + TTS lifecycle to the cinematic "alive" states
 * the 3D rig animates (camera, lighting, breathing tempo, gesture intensity).
 * Pure data — no React, no DOM. Consumed by the R3F provider and any future
 * vendor adapter (Azure / HeyGen / D-ID).
 */
export type AliveState =
  | "idle"
  | "listening"
  | "thinking"
  | "analyzing"
  | "speaking"
  | "presenting"
  | "warning"
  | "critical"
  | "success"
  | "waiting"
  | "offline";

/** Map the narrator's DigitalHumanState onto richer AliveStates. */
export function toAliveState(
  state: string,
  severity?: "low" | "medium" | "high" | "critical" | null,
): AliveState {
  if (severity === "critical") return "critical";
  if (severity === "high") return "warning";
  switch (state) {
    case "speaking":   return "speaking";
    case "thinking":   return "thinking";
    case "searching":  return "thinking";
    case "reading":    return "analyzing";
    case "analyzing":  return "analyzing";
    case "listening":  return "listening";
    case "waiting":    return "waiting";
    case "completed":  return "success";
    case "error":      return "warning";
    default:           return "idle";
  }
}

/** Tempo/intensity preset used by the 3D rig per state. */
export interface AlivePreset {
  breathHz: number;        // chest oscillation Hz
  swayDeg: number;         // body sway amplitude
  cameraZ: number;         // dolly distance
  ringIntensity: number;   // halo glow 0..1
  blinkBoost: number;      // multiplies base blink rate
}

export const ALIVE_PRESETS: Record<AliveState, AlivePreset> = {
  idle:       { breathHz: 0.25, swayDeg: 1.2, cameraZ: 2.4, ringIntensity: 0.25, blinkBoost: 1.0 },
  listening:  { breathHz: 0.30, swayDeg: 0.8, cameraZ: 2.2, ringIntensity: 0.45, blinkBoost: 1.4 },
  thinking:   { breathHz: 0.35, swayDeg: 1.6, cameraZ: 2.3, ringIntensity: 0.55, blinkBoost: 1.6 },
  analyzing:  { breathHz: 0.35, swayDeg: 1.4, cameraZ: 2.3, ringIntensity: 0.65, blinkBoost: 1.4 },
  speaking:   { breathHz: 0.45, swayDeg: 2.0, cameraZ: 2.1, ringIntensity: 0.85, blinkBoost: 1.2 },
  presenting: { breathHz: 0.50, swayDeg: 2.4, cameraZ: 2.0, ringIntensity: 1.00, blinkBoost: 1.1 },
  warning:    { breathHz: 0.40, swayDeg: 1.8, cameraZ: 2.1, ringIntensity: 0.90, blinkBoost: 1.5 },
  critical:   { breathHz: 0.55, swayDeg: 2.6, cameraZ: 2.0, ringIntensity: 1.00, blinkBoost: 1.7 },
  success:    { breathHz: 0.30, swayDeg: 1.0, cameraZ: 2.3, ringIntensity: 0.60, blinkBoost: 1.0 },
  waiting:    { breathHz: 0.22, swayDeg: 0.6, cameraZ: 2.4, ringIntensity: 0.20, blinkBoost: 0.8 },
  offline:    { breathHz: 0.00, swayDeg: 0.0, cameraZ: 2.5, ringIntensity: 0.05, blinkBoost: 0.0 },
};
