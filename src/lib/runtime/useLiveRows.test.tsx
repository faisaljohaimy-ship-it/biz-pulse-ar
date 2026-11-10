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

import { useLiveRows } from "./useLiveRows";

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
