import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const f = vi.hoisted(() => ({
  account: "account-a" as string | null,
  locale: "ar",
  session: vi.fn(),
}));
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: f.account ? { id: f.account } : null }),
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: f.locale }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: f.session } },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
import { PresenceChangesCard } from "./PresenceChangesCard";
const response = (accountId = "account-a", count = 0) => ({
  accountId,
  organizationId: "org-a",
  durableBaseline: false,
  delta: {
    snapshot: {
      accountId,
      organizationId: "org-a",
      regionId: null,
      siteId: null,
      source: "presence-updated-record-state:v1",
      capturedAt: "2026-11-24T16:00:00Z",
      window: { from: "2026-11-23T16:00:00Z", to: "2026-11-24T16:00:00Z" },
      metrics: {
        incidentsResolved: { value: count, coverage: "complete" },
        risksEscalated: { value: null, coverage: "unavailable" },
        inspectionCompletionPct: { value: 50, coverage: "partial" },
        newCriticalAlerts: { value: 1, coverage: "complete" },
      },
    },
  },
});
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (
    <QueryClientProvider client={client}>
      <PresenceChangesCard />
    </QueryClientProvider>
  );
  return { ...render(ui), ui, client };
}
beforeEach(() => {
  f.account = "account-a";
  f.locale = "ar";
  f.session.mockImplementation(async () => ({
    data: { session: { user: { id: f.account }, access_token: "test-fixture-not-a-secret" } },
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(response())),
  );
});

describe("What changed read-only card", () => {
  it.each(["ar", "en"])(
    "renders measured zero and explicit missing baseline, source window and partial sample: %s",
    async (locale) => {
      f.locale = locale;
      const view = mount();
      await screen.findByText("50%");
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText(locale === "ar" ? "لم يُقَس" : "Not measured")).toBeInTheDocument();
      expect(
        screen.getByText(locale === "ar" ? /لا يتوفر خط أساس محفوظ/ : /no saved baseline matches/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(locale === "ar" ? /عينة محدودة/ : /Bounded sample/),
      ).toBeInTheDocument();
      expect(
        view.container.querySelectorAll('a[href="/sec/inspections"], a[href="/sec/alerts"]'),
      ).toHaveLength(0);
      expect(view.container.querySelector("section")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
      view.unmount();
      view.client.clear();
    },
  );
  it("never fetches or fabricates a guest history", async () => {
    f.account = null;
    const view = mount();
    await screen.findByText(/سجّل الدخول/);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText("50%")).toBeNull();
    view.unmount();
    view.client.clear();
  });
  it("a mismatched account response is rejected without displaying its counts", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(response("another-account", 9719)));
    const view = mount();
    await screen.findByText(/تعذرت القراءة المصرح بها/);
    expect(screen.queryByText("9719")).toBeNull();
    view.unmount();
    view.client.clear();
  });
  it("account changes immediately invalidate the old reading while the new read is pending", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(response("account-a", 777)));
    const view = mount();
    await screen.findByText("777");
    let finish!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    f.account = "account-b";
    view.rerender(
      <QueryClientProvider client={view.client}>
        <PresenceChangesCard />
      </QueryClientProvider>,
    );
    expect(screen.queryByText("777")).toBeNull();
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    await act(async () => finish(Response.json(response("account-b", 0))));
    await screen.findByText("0");
    view.unmount();
    view.client.clear();
  });
});
