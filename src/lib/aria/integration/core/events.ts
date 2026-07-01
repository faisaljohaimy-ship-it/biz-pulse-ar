/**
 * Phase 9.1 — Event dispatcher (in-process fan-out).
 */

export type EventHandler<T> = (payload: T) => void | Promise<void>;

export interface EventBus<T> {
  emit(payload: T): void;
  on(handler: EventHandler<T>): () => void;
  clear(): void;
  count(): number;
}

export function createEventBus<T>(): EventBus<T> {
  const handlers = new Set<EventHandler<T>>();
  return {
    emit(payload: T): void {
      for (const h of handlers) {
        try { void h(payload); } catch { /* swallow: bus never breaks producer */ }
      }
    },
    on(handler: EventHandler<T>): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    clear(): void { handlers.clear(); },
    count(): number { return handlers.size; },
  };
}
