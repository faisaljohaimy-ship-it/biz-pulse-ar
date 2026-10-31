// @vitest-environment jsdom
/**
 * `/fnn` يمنح المساحة الكاملة إرفاقَ الملف (أمر المالك ٢٠٢٦/١٠/٣١): المحادثة تُركَّب بـ`allowImport`،
 * والتذييل يذكر الاستثناء الوحيد لعبارة «نصّية» بدل أن يدّعي أن لا شيء يُكتب في القاعدة.
 * المحادثة نفسها مُحاكاة (كاختبار الدخول المجاور): الذي يُفحص التركيب لا الواجهة.
 */
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  user: null as null | { id: string },
  locale: "ar" as "ar" | "en",
  getFinnAccess: vi.fn(),
  chatProps: [] as Array<Record<string, unknown>>,
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: fixture.user, loading: false }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: fixture.locale }) }));
vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { signInWithPassword: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn() } },
}));
vi.mock("@/lib/finn-agent/access.functions", () => ({ getFinnAccess: fixture.getFinnAccess }));
vi.mock("@/components/home/home-images", () => ({
  HOME_IMAGES: { finn: { src: "/fixture.png", width: 100, height: 100 } },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("./FinnChat", () => ({
  default: (props: Record<string, unknown>) => {
    fixture.chatProps.push(props);
    return "Private chat fixture";
  },
}));

import { FnnWorkspace } from "./FnnWorkspace";

const ENGINE = { gpt: true, gptModel: "gpt-4.1", fallback: true, paused: false };

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FnnWorkspace />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fixture.user = { id: "owner-fixture" };
  fixture.locale = "ar";
  fixture.chatProps = [];
  fixture.getFinnAccess.mockResolvedValue({ allowed: true, engine: ENGINE });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ checked: true }))),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("/fnn — إرفاق الملف", () => {
  it("المالك المتحقَّق منه يحصل على محادثة بـallowImport، والمحرّك كما أعاده الخادم", async () => {
    mount();
    await screen.findByText("Private chat fixture");
    expect(fixture.chatProps.length).toBeGreaterThan(0);
    for (const props of fixture.chatProps) {
      expect(props.allowImport).toBe(true);
      expect(props.engine).toEqual(ENGINE);
    }
  });

  it("غير المالك لا تُركَّب له محادثة أصلًا (فلا مشبك)", async () => {
    fixture.getFinnAccess.mockResolvedValue({ allowed: false });
    mount();
    await screen.findByText(/غير مخوّل/);
    expect(fixture.chatProps).toHaveLength(0);
    expect(screen.queryByText("Private chat fixture")).toBeNull();
  });

  it("التذييل بالعربية يذكر الاستثناء الوحيد (مكتبة المعرفة بتأكيدك) ولا يدّعي «نصية فقط»", async () => {
    mount();
    await screen.findByText("Private chat fixture");
    const footer = document.querySelector("footer.fnn-footer") as HTMLElement;
    expect(footer).toHaveTextContent("المحادثة نصّية");
    expect(footer).toHaveTextContent("مكتبة المعرفة");
    expect(footer).toHaveTextContent("بتأكيدك أنت");
    expect(footer.textContent).not.toMatch(/مساعدة نصية فقط/);
  });

  it("وبالإنجليزية كذلك", async () => {
    fixture.locale = "en";
    mount();
    await screen.findByText("Private chat fixture");
    const footer = document.querySelector("footer.fnn-footer") as HTMLElement;
    expect(footer).toHaveTextContent("knowledge library");
    expect(footer).toHaveTextContent("explicit confirmation");
    expect(footer.textContent).not.toMatch(/Text assistance only/);
  });
});
