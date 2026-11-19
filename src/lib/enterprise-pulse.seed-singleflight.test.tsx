import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const harness = vi.hoisted(() => ({
  getUser: vi.fn(),
  countKpis: vi.fn(),
  insert: vi.fn(),
  onChange: null as null | (() => void),
  removeChannel: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const channel = {
    on(_event: string, _filter: unknown, handler: () => void) {
      harness.onChange = handler;
      return this;
    },
    subscribe() {
      return this;
    },
  };
  return {
    supabase: {
      auth: { getUser: harness.getUser },
      from(table: string) {
        if (table === "tasks") {
          return { select: () => ({ neq: async () => ({ count: 0, error: null }) }) };
        }
        if (table === "threads" || table === "knowledge_docs") {
          return { select: async () => ({ count: 0, error: null }) };
        }
        return {
          select(_columns: string, options?: { head?: boolean }) {
            if (table === "pulse_kpis" && options?.head) {
              return { eq: () => harness.countKpis() };
            }
            return { eq: () => ({ order: async () => ({ data: [], error: null }) }) };
          },
          insert(rows: unknown[]) {
            return harness.insert(table, rows);
          },
        };
      },
      channel: () => channel,
      removeChannel: harness.removeChannel,
    },
  };
});

import { useEnterprisePulse } from "./enterprise-pulse";

beforeEach(() => {
  harness.getUser.mockReset();
  harness.countKpis.mockReset();
  harness.insert.mockReset().mockResolvedValue({ error: null });
  harness.onChange = null;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Enterprise Pulse first-use seeding", () => {
  it("coalesces concurrent views for the same user before the seed inserts", async () => {
    harness.getUser.mockResolvedValue({ data: { user: { id: "pulse-singleflight-view-test" } } });
    let releaseCount!: () => void;
    const countGate = new Promise<void>((resolve) => {
      releaseCount = resolve;
    });
    harness.countKpis.mockImplementation(() => countGate.then(() => ({ count: 0, error: null })));

    const first = renderHook(() => useEnterprisePulse());
    const second = renderHook(() => useEnterprisePulse());
    await waitFor(() => expect(harness.getUser).toHaveBeenCalledTimes(2));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // Before the fix both views read count=0, then each inserted all four tables.
    expect(harness.countKpis).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseCount();
    });
    await waitFor(() => expect(harness.insert).toHaveBeenCalledTimes(4));
    expect(harness.insert.mock.calls.map(([table]) => table).sort()).toEqual([
      "pulse_crises",
      "pulse_execution",
      "pulse_kpis",
      "pulse_memory",
    ]);
    first.unmount();
    second.unmount();
  });

  it("retries a failed seed count instead of retaining a stuck in-flight marker", async () => {
    harness.getUser.mockResolvedValue({ data: { user: { id: "pulse-singleflight-retry-test" } } });
    harness.countKpis
      .mockResolvedValueOnce({ count: null, error: { message: "transient read" } })
      .mockResolvedValueOnce({ count: 0, error: null });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      renderHook(() => useEnterprisePulse());
      await waitFor(() => expect(harness.countKpis).toHaveBeenCalledTimes(1));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(harness.insert).not.toHaveBeenCalled();

      await act(async () => {
        harness.onChange?.();
      });
      await waitFor(() => expect(harness.countKpis).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(harness.insert).toHaveBeenCalledTimes(4));
    } finally {
      errorSpy.mockRestore();
    }
  });
  it("defers seeding on missing or malformed exact counts, then retries", async () => {
    harness.getUser.mockResolvedValue({ data: { user: { id: "pulse-unknown-count-test" } } });
    harness.countKpis
      .mockResolvedValueOnce({ count: null, error: null })
      .mockResolvedValueOnce({ count: -1, error: null })
      .mockResolvedValueOnce({ count: 0, error: null });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const hook = renderHook(() => useEnterprisePulse());
      await waitFor(() => expect(harness.countKpis).toHaveBeenCalledTimes(1));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(harness.insert).not.toHaveBeenCalled();

      await act(async () => {
        harness.onChange?.();
      });
      await waitFor(() => expect(harness.countKpis).toHaveBeenCalledTimes(2));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(harness.insert).not.toHaveBeenCalled();

      await act(async () => {
        harness.onChange?.();
      });
      await waitFor(() => expect(harness.countKpis).toHaveBeenCalledTimes(3));
      await waitFor(() => expect(harness.insert).toHaveBeenCalledTimes(4));
      hook.unmount();
    } finally {
      warnSpy.mockRestore();
    }
  });

});
