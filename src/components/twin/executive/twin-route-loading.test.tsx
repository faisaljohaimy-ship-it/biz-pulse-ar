import { createElement, type ComponentType } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { getRegion } from "@/lib/regions";
import { Route } from "@/routes/_authenticated/sec.twin";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => vi.fn() }));
vi.mock("@/lib/sec.functions", () => ({ getTwinTree: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      dataSource: "simulation",
      region: { name_ar: "مرجع اختبار", name_en: "Test reference" },
      sections: [],
      circles: [],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/lib/region-context", () => ({
  useRegion: () => ({ region: getRegion("western") }),
}));
vi.mock("@/components/route-boundaries", () => ({
  RouteError: () => null,
  RouteNotFound: () => null,
}));
vi.mock("@/components/sec/sec-shell", () => ({
  SecPageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  statusClass: () => "",
  severityClass: () => "",
}));
vi.mock("@/components/twin/executive/TwinReferencePanel", () => {
  throw new Error("seeded new-scene chunk failure");
});

afterEach(() => localStorage.clear());

it("keeps the pre-existing asset tree usable when the new reference chunk rejects", async () => {
  localStorage.setItem("locale", "en");
  const Page = Route.options.component as ComponentType;
  render(<I18nProvider>{createElement(Page)}</I18nProvider>);
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("This section could not load");
  expect(screen.getByRole("button", { name: "Reload page" })).toBeVisible();
  expect(screen.getByText("اختر أي عنصر من الشجرة لعرض تفاصيله")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /الغربية/ }));
  expect(screen.getByRole("heading", { name: "الأقسام" })).toBeVisible();
  expect(screen.getByText("الدوائر")).toBeVisible();
  expect(alert).toBeVisible();
});
