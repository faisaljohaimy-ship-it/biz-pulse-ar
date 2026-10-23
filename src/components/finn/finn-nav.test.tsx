/**
 * مدخل «فِن» في الشريط — يظهر للمالك وحده، والحكم من الخادم.
 *
 * دالة الخادم `getFinnAccess` مُحاكاة؛ ما يُفحص هو **قرار العرض**: لا جلسة ⇒ لا مدخل
 * ولا نداء، `allowed:false` ⇒ لا مدخل، `allowed:true` ⇒ رابط `/finn` باسمه من السجلّ
 * الكانوني، وفشل الخادم ⇒ يُخفى بصمت ولا يكسر الشريط.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sim = vi.hoisted(() => ({
  user: null as null | { id: string },
  access: vi.fn(),
  pathname: "/sec",
  locale: "ar" as "ar" | "en",
}));

vi.mock("@/lib/finn-agent/access.functions", () => ({
  getFinnAccess: (...args: unknown[]) => sim.access(...args),
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: sim.user }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: sim.locale }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: sim.pathname }),
}));

import { FinnNavEntry } from "./FinnNavEntry";

const CLASSES = { row: "ROW min-h-11", idle: "IDLE", active: "ACTIVE" };
const OWNER_ENGINE = { gpt: true, gptModel: "gpt-4.1", fallback: true, paused: false };

function renderEntry() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FinnNavEntry classes={CLASSES} textDir="rtl" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sim.user = null;
  sim.access = vi.fn();
  sim.pathname = "/sec";
  sim.locale = "ar";
});

describe("FinnNavEntry", () => {
  it("زائر بلا جلسة ⇒ لا مدخل ولا نداء للخادم", () => {
    const { container } = renderEntry();
    expect(container).toBeEmptyDOMElement();
    expect(sim.access).not.toHaveBeenCalled();
  });

  it("مسجَّل غير مالك (allowed:false) ⇒ لا مدخل", async () => {
    sim.user = { id: "u1" };
    sim.access.mockResolvedValue({ allowed: false });
    const { container } = renderEntry();
    await waitFor(() => expect(sim.access).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 10));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("المالك ⇒ رابط /finn باسم «فِن» من السجلّ الكانوني وبأصناف الصفّ", async () => {
    sim.user = { id: "owner" };
    sim.access.mockResolvedValue({ allowed: true, engine: OWNER_ENGINE });
    renderEntry();
    const link = await screen.findByRole("link", { name: "فِن" });
    expect(link.getAttribute("href")).toBe("/finn");
    expect(link.getAttribute("data-nav-id")).toBe("finn");
    expect(link.className).toContain("ROW min-h-11");
    expect(link.className).toContain("IDLE");
    expect(link.getAttribute("aria-current")).toBeNull();
  });

  it("الصفحة الحالية /finn ⇒ نشِط وaria-current=page", async () => {
    sim.user = { id: "owner" };
    sim.pathname = "/finn";
    sim.access.mockResolvedValue({ allowed: true, engine: OWNER_ENGINE });
    renderEntry();
    const link = await screen.findByRole("link", { name: "فِن" });
    expect(link.className).toContain("ACTIVE");
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("الإنجليزية: «FINN»", async () => {
    sim.user = { id: "owner" };
    sim.locale = "en";
    sim.access.mockResolvedValue({ allowed: true, engine: OWNER_ENGINE });
    renderEntry();
    expect(await screen.findByRole("link", { name: "FINN" })).toBeInTheDocument();
  });

  it("فشل الخادم ⇒ يُخفى المدخل بصمت ولا يرمي", async () => {
    sim.user = { id: "u1" };
    sim.access.mockRejectedValue(new Error("Unauthorized: No authorization header provided"));
    const { container } = renderEntry();
    await waitFor(() => expect(sim.access).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(container).toBeEmptyDOMElement();
  });

  it("الاستجابة بلا allowed صريحة (مشوَّهة) ⇒ لا مدخل", async () => {
    sim.user = { id: "u1" };
    sim.access.mockResolvedValue({ engine: OWNER_ENGINE });
    const { container } = renderEntry();
    await waitFor(() => expect(sim.access).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(container).toBeEmptyDOMElement();
  });

  it("الاستعلام يُخزَّن لكل مستخدم: تبديل المستخدم لا يعرض حكم سابقه", async () => {
    sim.user = { id: "owner" };
    sim.access.mockResolvedValue({ allowed: true, engine: OWNER_ENGINE });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // عنصرٌ جديد في كل مرة: React يتخطّى إعادة الرسم لعنصرٍ بالمرجع نفسه.
    const tree = () => (
      <QueryClientProvider client={client}>
        <FinnNavEntry classes={CLASSES} textDir="rtl" />
      </QueryClientProvider>
    );
    const { rerender, container } = render(tree());
    await screen.findByRole("link", { name: "فِن" });
    sim.user = { id: "someone-else" };
    sim.access.mockResolvedValue({ allowed: false });
    rerender(tree());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
