/**
 * /finn لغير المالك ⇒ **صفحة الـ404 الجذرية نفسها** التي يراها لمسارٍ غير موجود
 * (ملاحظة W5 #0). كان الجارس يرمي `notFound()` ويُركّب `notFoundComponent: RouteNotFound`،
 * فيظهر كرت عربيّ داخل الغلاف يختلف عن 404 الجذر الإنجليزيّ — ومن يقارنهما يعرف أن
 * `/finn` مسارٌ حقيقي. هنا شجرةٌ مصغّرة تُطابق البنية الفعلية (جذر بـ`notFoundComponent`
 * ← تخطيط مصادَق بلا `notFoundComponent` ← `/finn` بخيارات الملف الحقيقي) ويُقارَن الناتجان.
 */
import { render, screen, waitFor } from "@testing-library/react";
import {
  type AnyRoute,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/finn-agent/access.functions", () => ({
  getFinnAccess: vi.fn(async () => ({ allowed: false })),
}));
vi.mock("@/components/finn/FinnChat", () => ({ default: () => null }));

import { Route as FinnRoute } from "@/routes/_authenticated/finn";

function mount(path: string) {
  const root = createRootRoute({
    component: Outlet,
    notFoundComponent: () => <div data-testid="root-404">ROOT-404</div>,
  });
  // مثل `_authenticated`: غلاف بلا notFoundComponent.
  const shell = createRoute({
    getParentRoute: () => root,
    id: "_authenticated",
    component: () => (
      <div data-testid="shell">
        <Outlet />
      </div>
    ),
  });
  const opts = FinnRoute.options as unknown as {
    loader: never;
    notFoundComponent?: never;
    errorComponent?: never;
    component: never;
  };
  const finn = createRoute({
    getParentRoute: () => shell,
    path: "/finn",
    loader: opts.loader,
    notFoundComponent: opts.notFoundComponent,
    errorComponent: opts.errorComponent,
    component: opts.component,
  }) as unknown as AnyRoute;
  const router = createRouter({
    routeTree: root.addChildren([shell.addChildren([finn])]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("/finn لغير المالك يطابق 404 الجذر", () => {
  it("يعرض 404 الجذر نفسه — لا كرت RouteNotFound العربي ولا الغلاف", async () => {
    const unknown = mount("/zzz-does-not-exist");
    await waitFor(() => expect(screen.getByTestId("root-404")).toBeTruthy());
    const unknownHtml = unknown.container.innerHTML;
    unknown.unmount();

    const finn = mount("/finn");
    await waitFor(() => expect(screen.getByTestId("root-404")).toBeTruthy());
    expect(screen.queryByText("الصفحة المطلوبة غير موجودة")).toBeNull();
    expect(finn.container.innerHTML).toBe(unknownHtml);
  });
});
