import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as null | { id: string; app_metadata: Record<string, string> },
    loading: false,
  },
  overview: vi.fn(),
  dispatch: vi.fn(),
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/sadeed-core/hooks/useSadeed", () => ({ useSadeed: () => ({ open: vi.fn() }) }));
vi.mock("@/lib/dual-agent/command.functions", () => ({
  getDualAgentOverview: mocks.overview,
  executeFnnTask: mocks.dispatch,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/nexus-frame", () => ({
  NexusPage: ({ children, title }: { children: ReactNode; title: string }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));
import { Route } from "@/routes/_authenticated/orchestration";
const Page = Route.options.component as ComponentType;

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.auth = { user: null, loading: false };
  mocks.overview.mockReset();
  mocks.dispatch.mockReset();
  mocks.overview.mockResolvedValue({
    orgId: "org",
    observedAt: "2026-10-20T12:00:00Z",
    source: "database",
    scope: "current_user",
    sampleLimit: 50,
    tools: [{ id: "sql.read", enabled: true, requiresApproval: false }],
    executions: [],
    metrics: {
      sampleSize: 0,
      succeeded: 0,
      failed: 0,
      pendingApproval: 0,
      running: 0,
      successRate: null,
    },
  });
});
afterEach(cleanup);

describe("dual-agent command workspace", () => {
  it("never fetches private execution history for a guest", () => {
    renderPage();
    expect(screen.getByText("سجل مؤسستك محمي")).toBeInTheDocument();
    expect(mocks.overview).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(screen.getAllByText("لم يُقَس")).toHaveLength(4);
  });

  it("requires review then a separate execution click; edits invalidate review", async () => {
    mocks.auth.user = { id: "operator", app_metadata: {} };
    mocks.dispatch.mockResolvedValue({
      taskId: "task-123",
      executionId: "run-123",
      status: "succeeded",
      output: { count: 3 },
    });
    renderPage();
    await waitFor(() => expect(mocks.overview).toHaveBeenCalled());
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "مساحة FNN الهندسية" }));
    fireEvent.change(screen.getByLabelText("الهدف التنفيذي"), {
      target: { value: "قراءة البلاغات" },
    });
    await user.click(screen.getByRole("button", { name: "مراجعة التفويض" }));
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "مراجعة المهمة" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("مدخلات الأداة (JSON)"), {
      target: { value: '{"table":"sec_incidents","limit":5}' },
    });
    expect(screen.queryByRole("region", { name: "مراجعة المهمة" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "مراجعة التفويض" }));
    await user.click(screen.getByRole("button", { name: "تنفيذ القراءة" }));
    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledTimes(1));
    expect(mocks.dispatch).toHaveBeenCalledWith({
      data: {
        orgId: undefined,
        objective: "قراءة البلاغات",
        toolId: "sql.read",
        input: { table: "sec_incidents", limit: 5 },
      },
    });
    expect(await screen.findByText("task-123")).toBeInTheDocument();
  });
});
