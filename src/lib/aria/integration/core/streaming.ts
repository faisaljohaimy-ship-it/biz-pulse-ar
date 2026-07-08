/**
 * Phase 9.1 — Streaming primitive.
 *
 * Generic async-iterator wrapper used by streaming connectors
 * (Kafka, Redis Streams, SSE, MongoDB change streams).
 */

export interface StreamHandle<T> {
  readonly connector_id: string;
  readonly topic: string;
  iterator(): AsyncIterableIterator<T>;
  close(): Promise<void>;
}

export interface StreamFactory<T> {
  connector_id: string;
  topic: string;
  produce: () => AsyncIterableIterator<T>;
  onClose?: () => Promise<void> | void;
}

export function createStream<T>(factory: StreamFactory<T>): StreamHandle<T> {
  let closed = false;
  return {
    connector_id: factory.connector_id,
    topic: factory.topic,
    iterator(): AsyncIterableIterator<T> {
      const inner = factory.produce();
      const wrapper: AsyncIterableIterator<T> = {
        [Symbol.asyncIterator]() {
          return wrapper;
        },
        async next(): Promise<IteratorResult<T>> {
          if (closed) return { value: undefined as unknown as T, done: true };
          return inner.next();
        },
        async return(): Promise<IteratorResult<T>> {
          closed = true;
          if (factory.onClose) await factory.onClose();
          return { value: undefined as unknown as T, done: true };
        },
      };
      return wrapper;
    },
    async close(): Promise<void> {
      closed = true;
      if (factory.onClose) await factory.onClose();
    },
  };
}
