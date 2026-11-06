import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEventStream, type EnterpriseEventRow } from "./useEventStream";

const fake = vi.hoisted(() => ({
  finishHydration: null as ((value: unknown) => void) | null,
  emitInsert: null as ((payload: { new: unknown }) => void) | null,
}));

vi.mock("@/integrations/supabase/client", () => {
  const query = {
    select() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return this;
    },
    like() {
      return this;
    },
    in() {
      return this;
    },
    eq() {
      return this;
    },
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      return new Promise<unknown>((finish) => {
        fake.finishHydration = finish;
      }).then(resolve, reject);
    },
  };
  return {
    supabase: {
      from: () => query,
      channel: () => ({
        on(_kind: unknown, _options: unknown, callback: (payload: { new: unknown }) => void) {
          fake.emitInsert = callback;
          return this;
        },
        subscribe() {
          return this;
        },
      }),
      removeChannel: () => Promise.resolve(),
    },
  };
});

const row = (id: string): EnterpriseEventRow =>
  ({
    id,
    topic: "incident.created",
    severity: "high",
    subject_type: null,
    subject_id: null,
    correlation_id: null,
  }) as EnterpriseEventRow;

beforeEach(() => {
  fake.finishHydration = null;
  fake.emitInsert = null;
});

describe("useEventStream initial hydration race", () => {
  it("preserves an INSERT delivered while the initial snapshot is pending", async () => {
    const { result } = renderHook(() => useEventStream({ limit: 3 }));
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    act(() => {
      fake.emitInsert?.({ new: row("live") });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["live"]);

    await act(async () => {
      fake.finishHydration?.({ data: [row("old")], error: null });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["live", "old"]);
    expect(result.current.loading).toBe(false);
  });

  it("keeps the realtime version once when the same event is in hydration", async () => {
    const { result } = renderHook(() => useEventStream({ limit: 2 }));
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    act(() => {
      fake.emitInsert?.({ new: row("same") });
    });
    await act(async () => {
      fake.finishHydration?.({ data: [row("same"), row("old")], error: null });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["same", "old"]);
  });

  it("removes previous-filter rows during the next filter hydration", async () => {
    const { result, rerender } = renderHook(
      ({ topicPrefix }) => useEventStream({ topicPrefix, limit: 3 }),
      { initialProps: { topicPrefix: "incident." } },
    );
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    await act(async () => {
      fake.finishHydration?.({ data: [row("prior-filter")], error: null });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["prior-filter"]);

    rerender({ topicPrefix: "risk." });
    expect(result.current.loading).toBe(true);
    expect(result.current.events).toEqual([]);

    await act(async () => {
      fake.finishHydration?.({
        data: [{ ...row("new-filter"), topic: "risk.created" }],
        error: null,
      });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["new-filter"]);
    expect(result.current.loading).toBe(false);
  });

  it("clears a previous hydration error when a changed filter starts loading", async () => {
    const { result, rerender } = renderHook(
      ({ topicPrefix }) => useEventStream({ topicPrefix }),
      { initialProps: { topicPrefix: "incident." } },
    );
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    await act(async () => {
      fake.finishHydration?.({ data: null, error: { message: "temporary_failure" } });
    });
    expect(result.current.error).toBe("temporary_failure");

    rerender({ topicPrefix: "risk." });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      fake.finishHydration?.({ data: [], error: null });
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
