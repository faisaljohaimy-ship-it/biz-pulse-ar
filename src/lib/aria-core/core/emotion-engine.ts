/**
 * EmotionEngine — deterministic mapping from executive signals to Emotion.
 *
 * Reads risk level + priority + intent and returns a stable emotion.
 * No random selection, no cartoon behavior.
 */
import type { Emotion } from "./avatar-state-manager";
import type { RiskLevel, PriorityLevel } from "../types/executive";
import type { AriaIntent } from "../types/aria";

class EmotionEngine {
  fromSignals(input: {
    risk?: RiskLevel;
    priority?: PriorityLevel;
    intent?: AriaIntent;
  }): Emotion {
    if (input.risk === "critical" || input.priority === "P0") return "critical";
    if (input.risk === "high" || input.priority === "P1") return "concerned";
    if (input.intent === "analytical" || input.intent === "operational") return "focused";
    if (input.intent === "strategic") return "executive";
    if (input.intent === "conversational") return "friendly";
    if (input.priority === "P3" || input.priority === "INFO") return "confident";
    return "executive";
  }

  forSuccess(): Emotion { return "success"; }
  forIdle(): Emotion { return "neutral"; }
}

export const emotionEngine = new EmotionEngine();
