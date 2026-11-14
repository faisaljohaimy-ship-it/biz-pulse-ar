import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { governanceSystems, useEnterpriseFabricAdapter } from "./enterprise-domains";

const stubs = vi.hoisted(() => ({
  from: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: stubs.useQuery,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: stubs.from },
}));
vi.mock("@/lib/errors/user-facing-error", () => ({
  userFacingError: (error: unknown) => String(error),
}));

function listQuery(): () => Promise<unknown> {
  return (governanceSystems.useList() as unknown as { queryFn: () => Promise<unknown> }).queryFn;
}

beforeEach(() => {
  vi.useFakeTimers();
  stubs.useQuery.mockImplementation((options: unknown) => options);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  stubs.from.mockReset();
  stubs.useQuery.mockReset();
});

describe("enterprise showcase list timers", () => {
  it("clears the deadline immediately after a successful list", async () => {
    const rows = [{ id: "live" }];
    stubs.from.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }),
    });
    await expect(listQuery()()).resolves.toEqual(rows);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the deadline after a failed database query and preserves empty fallback", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    stubs.from.mockReturnValue({
      select: () => ({ order: () => Promise.reject(new Error("offline")) }),
    });
    await expect(listQuery()()).resolves.toEqual([]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retains the 4000ms timeout for hanging queries and clears it afterward", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    stubs.from.mockReturnValue({
      select: () => ({ order: () => new Promise<never>(() => {}) }),
    });
    const pending = listQuery()();
    const result = expect(pending).resolves.toEqual([]);
    await vi.advanceTimersByTimeAsync(3_999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(log).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not retain a timer after a slow-but-successful query", async () => {
    const rows = [{ id: "delayed" }];
    stubs.from.mockReturnValue({
      select: () => ({
        order: () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: rows, error: null }), 1_000);
          }),
      }),
    });
    const pending = listQuery()();
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toEqual(rows);
    expect(vi.getTimerCount()).toBe(0);
  });
});

function renderFabricLists(
  systems: unknown[],
  policies: unknown[],
  programs: unknown[],
) {
  // Same five independent hooks as useEnterpriseFabricAdapter, without a live database.
  for (const data of [systems, policies, programs, [], []]) {
    stubs.useQuery.mockReturnValueOnce({ data, isLoading: false });
  }
  return useEnterpriseFabricAdapter();
}

describe("enterprise fabric KPI integrity", () => {
  it("ignores malformed and out-of-range samples without diluting valid measurements", () => {
    const metrics = renderFabricLists(
      [{ sla: 99, risk: "high" }, { sla: Number.NaN, risk: "low" }],
      [{ coverage: 92 }, { coverage: 110 }, { coverage: Number.NaN }],
      [
        { progress: 60, adoption: 80 },
        { progress: Number.POSITIVE_INFINITY, adoption: -5 },
      ],
    );
    expect(metrics).toMatchObject({
      systemsCount: 2,
      highRiskSystems: 1,
      avgSla: 99,
      avgPolicyCoverage: 92,
      avgProgress: 60,
      avgAdoption: 80,
    });
  });

  it("returns finite zero fallbacks when only invalid measurements are available", () => {
    const metrics = renderFabricLists(
      [{ sla: Number.NEGATIVE_INFINITY, risk: "low" }],
      [{ coverage: -1 }],
      [{ progress: 101, adoption: Number.NaN }],
    );
    expect(metrics.avgSla).toBe(0);
    expect(metrics.avgPolicyCoverage).toBe(0);
    expect(metrics.avgProgress).toBe(0);
    expect(metrics.avgAdoption).toBe(0);
  });

  it("preserves averages and rounding for healthy numeric data", () => {
    const metrics = renderFabricLists(
      [{ sla: 99.5, risk: "low" }, { sla: 98.5, risk: "low" }],
      [{ coverage: 75 }, { coverage: 76 }],
      [{ progress: 40, adoption: 60 }, { progress: 41, adoption: 61 }],
    );
    expect(metrics).toMatchObject({
      avgSla: 99,
      avgPolicyCoverage: 76,
      avgProgress: 41,
      avgAdoption: 61,
    });
  });
});
