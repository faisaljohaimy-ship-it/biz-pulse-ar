import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({}),
    channel: () => ({
      on() {
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
