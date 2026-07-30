export type CognitiveEventName =
  | "ReasoningStarted"
  | "EvidenceCollected"
  | "HypothesisGenerated"
  | "TradeoffCompleted"
  | "ContradictionDetected"
  | "SimulationCompleted"
  | "DecisionGenerated"
  | "ConfidenceCalculated"
  | "ExplanationGenerated"
  | "ReasoningCompleted";

export interface CognitiveEvent {
  readonly name: CognitiveEventName;
  readonly at: string;
  readonly payload: Readonly<Record<string, string | number | boolean | null>>;
}

type Listener = (event: CognitiveEvent) => void;
const listeners = new Set<Listener>();

export function onCognitiveEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitCognitiveEvent(
  name: CognitiveEventName,
  payload: CognitiveEvent["payload"],
): CognitiveEvent {
  const event: CognitiveEvent = { name, at: new Date().toISOString(), payload };
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      // isolate
    }
  }
  return event;
}
