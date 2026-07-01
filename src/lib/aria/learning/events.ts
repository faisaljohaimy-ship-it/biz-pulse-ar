export type LearningEventName =
  | "LearningStarted"
  | "LearningCompleted"
  | "LessonCreated"
  | "KnowledgeUpdated"
  | "PatternDetected"
  | "CapabilityImproved"
  | "CapabilityRegressed";

export interface LearningEvent {
  readonly name: LearningEventName;
  readonly at: string;
  readonly payload: Readonly<Record<string, string | number | boolean | null>>;
}

type Listener = (event: LearningEvent) => void;
const listeners = new Set<Listener>();

export function onLearningEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitLearningEvent(
  name: LearningEventName,
  payload: LearningEvent["payload"],
): LearningEvent {
  const event: LearningEvent = { name, at: new Date().toISOString(), payload };
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // isolate listener failures
    }
  }
  return event;
}
