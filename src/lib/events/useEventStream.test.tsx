import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEventStream, type EnterpriseEventRow } from "./useEventStream";

const fake = vi.hoisted(() => ({
  finishHydration: null as ((value: unknown) => void) | null,
  emitInsert: null as ((payload: { new: unknown }) => void) | null,
  likeCalls: [] as Array<[string, string]>,
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
    like(column: string, pattern: string) {
      fake.likeCalls.push([column, pattern]);
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
  fake.likeCalls = [];
});

describe("useEventStream initial hydration race", () => {
  it("ignores malformed realtime records without breaking later valid inserts", async () => {
    const { result } = renderHook(() => useEventStream({ topicPrefix: "incident." }));
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    await act(async () => {
      fake.finishHydration?.({ data: [], error: null });
    });

    expect(() => {
      act(() => {
        fake.emitInsert?.({ new: null });
        fake.emitInsert?.({ new: { id: "broken", severity: "high" } });
      });
    }).not.toThrow();
    expect(result.current.events).toEqual([]);

    act(() => {
      fake.emitInsert?.({ new: row("healthy") });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["healthy"]);
  });

  it("does not insert incomplete records when realtime has no active topic filter", async () => {
    const { result } = renderHook(() => useEventStream());
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    await act(async () => {
      fake.finishHydration?.({ data: [], error: null });
    });
    act(() => {
      fake.emitInsert?.({ new: { topic: "incident.created", severity: "high" } });
      fake.emitInsert?.({ new: { id: "no-severity", topic: "incident.created" } });
    });
    expect(result.current.events).toEqual([]);

    act(() => {
      fake.emitInsert?.({ new: row("valid") });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["valid"]);
  });

  it("shows realtime INSERTs when severity is an empty filter", async () => {
    const { result } = renderHook(() => useEventStream({ severity: [] }));
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    await act(async () => {
      fake.finishHydration?.({ data: [row("snapshot")], error: null });
    });

    act(() => {
      fake.emitInsert?.({ new: row("live") });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["live", "snapshot"]);
  });

  it("still excludes realtime INSERTs outside a non-empty severity filter", async () => {
    const { result } = renderHook(() => useEventStream({ severity: ["critical"] }));
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    await act(async () => {
      fake.finishHydration?.({ data: [], error: null });
    });

    act(() => {
      fake.emitInsert?.({ new: row("high-severity") });
    });
    expect(result.current.events).toEqual([]);
  });

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

    const previousHydration = fake.finishHydration;
    rerender({ topicPrefix: "risk." });
    expect(result.current.loading).toBe(true);
    expect(result.current.events).toEqual([]);
    // The mocked PostgREST thenable registers its next resolver in a microtask.
    await waitFor(() => expect(fake.finishHydration).not.toBe(previousHydration));

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
    const { result, rerender } = renderHook(({ topicPrefix }) => useEventStream({ topicPrefix }), {
      initialProps: { topicPrefix: "incident." },
    });
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    await act(async () => {
      fake.finishHydration?.({ data: null, error: { message: "temporary_failure" } });
    });
    expect(result.current.error).toBe("temporary_failure");

    const previousHydration = fake.finishHydration;
    rerender({ topicPrefix: "risk." });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(fake.finishHydration).not.toBe(previousHydration));

    await act(async () => {
      fake.finishHydration?.({ data: [], error: null });
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("resubscribes when distinct filters collide under the legacy pipe delimiter", async () => {
    const { result, rerender } = renderHook(
      ({ topicPrefix, subjectType }) => useEventStream({ topicPrefix, subjectType }),
      { initialProps: { topicPrefix: "incident|risk", subjectType: "zone" } },
    );
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    await act(async () => {
      fake.finishHydration?.({ data: [row("old-filter")], error: null });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["old-filter"]);

    const previousHydration = fake.finishHydration;
    rerender({ topicPrefix: "incident", subjectType: "risk|zone" });
    expect(result.current.loading).toBe(true);
    expect(result.current.events).toEqual([]);
    await waitFor(() => expect(fake.finishHydration).not.toBe(previousHydration));
    await act(async () => {
      fake.finishHydration?.({ data: [row("new-filter")], error: null });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["new-filter"]);
  });

  it("resubscribes when a comma inside a severity is not two severities", async () => {
    const { result, rerender } = renderHook(({ severity }) => useEventStream({ severity }), {
      initialProps: { severity: ["critical,high"] },
    });
    await waitFor(() => expect(fake.finishHydration).not.toBeNull());
    await act(async () => {
      fake.finishHydration?.({ data: [row("old-filter")], error: null });
    });
    const previousHydration = fake.finishHydration;

    rerender({ severity: ["critical", "high"] });
    expect(result.current.loading).toBe(true);
    expect(result.current.events).toEqual([]);
    await waitFor(() => expect(fake.finishHydration).not.toBe(previousHydration));
    await act(async () => {
      fake.finishHydration?.({ data: [row("new-filter")], error: null });
    });
    expect(result.current.events.map((event) => event.id)).toEqual(["new-filter"]);
  });

  it.each([
    ["incident_", String.raw`incident\_%`],
    ["risk%", String.raw`risk\%%`],
    ["ops\\", String.raw`ops\\%`],
  ])(
    "treats SQL LIKE metacharacters as literal topic-prefix content: %s",
    async (topicPrefix, pattern) => {
      renderHook(() => useEventStream({ topicPrefix }));
      await waitFor(() => expect(fake.likeCalls).toContainEqual(["topic", pattern]));
    },
  );
});
