import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const realtime = vi.hoisted(() => ({ onChange: undefined as undefined | (() => void) }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({}),
    channel: () => ({
      on(_type: unknown, _filter: unknown, callback: () => void) {
        realtime.onChange = callback;
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: () => Promise.resolve(),
  },
}));

import { fmtDuration, fmtRel, useLiveRows } from "./useLiveRows";

afterEach(() => {
  vi.restoreAllMocks();
  realtime.onChange = undefined;
});

describe("useLiveRows synchronous query failures", () => {
  it("exposes a thrown query-builder error instead of trapping the page in loading", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() =>
      useLiveRows("enterprise_events", () => {
        throw new Error("query_builder_failed");
      }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe("query_builder_failed");
    expect(result.current.rows).toEqual([]);
  });

  it("allows the existing manual refetch to recover after a synchronous builder failure", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let shouldThrow = true;
    const build = () => {
      if (shouldThrow) throw new Error("temporary_builder_failure");
      return Promise.resolve({ data: [{ id: "recovered" }], error: null });
    };
    const { result } = renderHook(() => useLiveRows<{ id: string }>("tasks", build));
    await waitFor(() => expect(result.current.error?.message).toBe("temporary_builder_failure"));
    expect(result.current.loading).toBe(false);

    shouldThrow = false;
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.rows).toEqual([{ id: "recovered" }]));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe("realtime timestamp formatting", () => {
  it("does not display NaN for unparseable relative or duration timestamps", () => {
    expect(fmtRel("not-a-date")).toBe("—");
    expect(fmtDuration("not-a-date")).toBe("—");
    expect(fmtDuration("2026-11-10T12:00:00Z", "not-a-date")).toBe("—");
  });

  it("labels a future timestamp as future rather than an event in the past", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-11-10T12:00:00Z"));
      expect(fmtRel("2026-11-10T12:10:00Z")).toBe("—");
      expect(fmtRel("2026-11-10T11:58:00Z")).toBe("2m ago");
      expect(fmtRel(null)).toBe("—");
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserves valid duration formatting and zero-clamps reversed periods", () => {
    expect(fmtDuration("2026-11-10T12:00:00Z", "2026-11-10T12:01:01Z")).toBe("1m 1s");
    expect(fmtDuration("2026-11-10T12:01:01Z", "2026-11-10T12:00:00Z")).toBe("0s");
  });
});

describe("useLiveRows overlapping realtime reads", () => {
  it("never replaces newer realtime data with an older slow query result", async () => {
    type Snapshot = { data: { id: string }[]; error: null };
    const pending: Array<(value: Snapshot) => void> = [];
    const build = () =>
      new Promise<Snapshot>((resolve) => {
        pending.push(resolve);
      });

    const { result } = renderHook(() => useLiveRows<{ id: string }>("events", build));
    expect(pending).toHaveLength(1);
    act(() => realtime.onChange?.());
    expect(pending).toHaveLength(2);

    await act(async () => {
      pending[1]({ data: [{ id: "latest" }], error: null });
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.rows).toEqual([{ id: "latest" }]));

    await act(async () => {
      pending[0]({ data: [{ id: "stale" }], error: null });
      await Promise.resolve();
    });
    expect(result.current.rows).toEqual([{ id: "latest" }]);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("does not show a stale failed read after the newest realtime read succeeds", async () => {
    type Snapshot = { data: { id: string }[]; error: null };
    const pending: Array<{
      resolve: (value: Snapshot) => void;
      reject: (reason: Error) => void;
    }> = [];
    const build = () =>
      new Promise<Snapshot>((resolve, reject) => {
        pending.push({ resolve, reject });
      });

    const { result } = renderHook(() => useLiveRows<{ id: string }>("events", build));
    act(() => realtime.onChange?.());
    expect(pending).toHaveLength(2);

    await act(async () => {
      pending[1].resolve({ data: [{ id: "latest" }], error: null });
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.rows).toEqual([{ id: "latest" }]));

    await act(async () => {
      pending[0].reject(new Error("late stale failure"));
      await Promise.resolve();
    });
    expect(result.current.rows).toEqual([{ id: "latest" }]);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe("useLiveRows table changes", () => {
  it("queries the new source when table changes without manually repeating it in deps", async () => {
    const { result, rerender } = renderHook(
      ({ table }: { table: string }) =>
        useLiveRows<{ id: string }>(table, () =>
          Promise.resolve({ data: [{ id: table }], error: null }),
        ),
      { initialProps: { table: "first_events" } },
    );
    await waitFor(() => expect(result.current.rows).toEqual([{ id: "first_events" }]));

    rerender({ table: "second_events" });
    await waitFor(() => expect(result.current.rows).toEqual([{ id: "second_events" }]));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
