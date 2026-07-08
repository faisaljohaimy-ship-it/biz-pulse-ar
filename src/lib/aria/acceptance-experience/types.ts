// Phase 11.6 — Executive Acceptance Experience types.
export type FirstImpressionStage = "cold" | "fade_in" | "settled" | "greeted";

export type EngagementLevel = "dormant" | "attentive" | "active" | "committed" | "disengaged";

export type AcceptanceStep =
  | "welcome"
  | "system_health"
  | "top_risks"
  | "recommendations"
  | "ask_next";

export type TrustSignal =
  | "evidence_linked"
  | "confidence_known"
  | "unavailable_stated"
  | "no_fabrication";

export type ResponseMode = "brief" | "detailed";

export type HandoffKind = "voice_to_text" | "text_to_voice" | "aria_to_operator" | "demo_to_free";

export interface ExecutiveGreetingInput {
  readonly userDisplayName?: string;
  readonly lang: "ar" | "en";
  readonly systemHealth?: "green" | "amber" | "red" | "unknown";
  readonly topAlerts?: readonly string[];
  readonly priorities?: readonly string[];
}

export interface ExecutiveGreeting {
  readonly text: string;
  readonly lang: "ar" | "en";
  readonly nextAction: string;
  readonly usedHealth: boolean;
  readonly usedAlerts: boolean;
  readonly usedPriorities: boolean;
}

export interface AcceptanceFlowState {
  readonly id: string;
  readonly startedAt: number;
  step: AcceptanceStep;
  completed: readonly AcceptanceStep[];
  lang: "ar" | "en";
  done: boolean;
}

export interface DemoReadiness {
  readonly ok: boolean;
  readonly reasons: readonly string[];
  readonly confidence: "unknown" | "low" | "medium" | "high";
}

export interface AcceptanceSignal {
  readonly kind:
    | "greeting_delivered"
    | "user_response"
    | "clarification_needed"
    | "step_completed"
    | "handoff"
    | "disengagement";
  readonly ts: number;
  readonly detail?: Record<string, unknown>;
}
