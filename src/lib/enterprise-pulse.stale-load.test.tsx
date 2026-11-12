import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const harness = vi.hoisted(() => ({
  getUser: vi.fn(),
  readKpis: vi.fn(),
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
