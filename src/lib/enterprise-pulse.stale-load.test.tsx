import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const harness = vi.hoisted(() => ({
  getUser: vi.fn(),
  readKpis: vi.fn(),
  onChange: null as null | (() => void),
  onAuthChange: null as null | ((event: "SIGNED_IN" | "SIGNED_OUT") => void),
  unsubscribeAuth: vi.fn(),
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
      auth: {
        getUser: harness.getUser,
        onAuthStateChange(callback: (event: "SIGNED_IN" | "SIGNED_OUT") => void) {
          harness.onAuthChange = callback;
          return { data: { subscription: { unsubscribe: harness.unsubscribeAuth } } };
        },
      },
      from(table: string) {
        if (table === "tasks") {
          return { select: () => ({ neq: async () => ({ count: 0, error: null }) }) };
        }
        if (table === "threads" || table === "knowledge_docs") {
          return { select: async () => ({ count: 0, error: null }) };
        }
        return {
          select(_columns: string, options?: { head?: boolean }) {
            if (options?.head) {
              // The user already has seed data; the regression is read-only.
              return { eq: async () => ({ count: 1, error: null }) };
            }
            return {
              eq: () => ({
                order: () =>
                  table === "pulse_kpis"
                    ? harness.readKpis()
                    : Promise.resolve({ data: [], error: null }),
              }),
            };
          },
        };
      },
      channel: () => channel,
      removeChannel: harness.removeChannel,
    },
  };
});

import { useEnterprisePulse } from "./enterprise-pulse";

function kpi(key: string) {
  return {
    key,
    label: key,
    label_en: key,
    value: "1",
    delta: "0",
    trend: "flat",
    tone: "cyan",
    why: "",
    why_en: "",
  };
}

beforeEach(() => {
  harness.getUser.mockReset().mockResolvedValue({ data: { user: { id: "mock-user" } } });
  harness.readKpis.mockReset();
  harness.onChange = null;
  harness.onAuthChange = null;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Enterprise Pulse realtime ordering", () => {
  it("does not let a slow earlier response overwrite a newer realtime snapshot", async () => {
    let resolveOld!: (value: { data: ReturnType<typeof kpi>[]; error: null }) => void;
    const slow = new Promise<{ data: ReturnType<typeof kpi>[]; error: null }>((resolve) => {
      resolveOld = resolve;
    });
    harness.readKpis
      .mockReturnValueOnce(slow)
      .mockResolvedValue({ data: [kpi("latest")], error: null });

    const { result } = renderHook(() => useEnterprisePulse());
    await waitFor(() => expect(harness.readKpis).toHaveBeenCalledTimes(1));
    await act(async () => {
      harness.onChange?.();
    });
    await waitFor(() => expect(result.current.kpis.map((entry) => entry.id)).toEqual(["latest"]));

    await act(async () => {
      resolveOld({ data: [kpi("stale")], error: null });
    });
    expect(result.current.kpis.map((entry) => entry.id)).toEqual(["latest"]);
  });
});

describe("Enterprise Pulse auth isolation", () => {
  it("clears private KPIs immediately on sign-out without waiting for realtime", async () => {
    harness.readKpis.mockResolvedValue({ data: [kpi("private-account")], error: null });
    const { result } = renderHook(() => useEnterprisePulse());
    await waitFor(() => expect(result.current.kpis.map((entry) => entry.id)).toEqual(["private-account"]));

    act(() => {
      harness.onAuthChange?.("SIGNED_OUT");
    });
    expect(result.current.kpis).toEqual([]);
    expect(result.current.memory).toEqual([]);
    expect(result.current.counts).toEqual({ openTasks: 0, conversations: 0, docs: 0 });
  });

  it("discards an in-flight old-user response after sign-out", async () => {
    let resolvePending!: (value: { data: ReturnType<typeof kpi>[]; error: null }) => void;
    harness.readKpis.mockReturnValue(
      new Promise((resolve) => {
        resolvePending = resolve;
      }),
    );
    const { result } = renderHook(() => useEnterprisePulse());
    await waitFor(() => expect(harness.readKpis).toHaveBeenCalledTimes(1));

    act(() => {
      harness.onAuthChange?.("SIGNED_OUT");
    });
    await act(async () => {
      resolvePending({ data: [kpi("late-private-account")], error: null });
    });
    expect(result.current.kpis).toEqual([]);
  });

  it("clears old-account data before reloading a new signed-in account", async () => {
    harness.getUser
      .mockResolvedValueOnce({ data: { user: { id: "old-account" } } })
      .mockResolvedValueOnce({ data: { user: { id: "new-account" } } });
    harness.readKpis
      .mockResolvedValueOnce({ data: [kpi("old-private")], error: null })
      .mockResolvedValueOnce({ data: [kpi("new-private")], error: null });
    const { result } = renderHook(() => useEnterprisePulse());
    await waitFor(() => expect(result.current.kpis.map((entry) => entry.id)).toEqual(["old-private"]));

    act(() => {
      harness.onAuthChange?.("SIGNED_IN");
    });
    expect(result.current.kpis).toEqual([]);
    await waitFor(() => expect(result.current.kpis.map((entry) => entry.id)).toEqual(["new-private"]));
  });
});
