// @vitest-environment jsdom
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  user: null as null | { id: string },
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  getFinnAccess: vi.fn(),
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: fixture.user, loading: false }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "en" }) }));
vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: fixture.signInWithPassword,
      signInWithOAuth: fixture.signInWithOAuth,
    },
  },
}));
vi.mock("@/lib/finn-agent/access.functions", () => ({ getFinnAccess: fixture.getFinnAccess }));
vi.mock("@/components/home/home-images", () => ({
  HOME_IMAGES: { finn: { src: "/fixture.png", width: 100, height: 100 } },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("./FinnChat", () => ({ default: () => "Private chat fixture" }));

import { FnnWorkspace } from "./FnnWorkspace";

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FnnWorkspace />
    </QueryClientProvider>,
  );
}
function fill() {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "  owner@example.test  " },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "fixture-password" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  fixture.user = null;
  fixture.getFinnAccess.mockResolvedValue({ allowed: false });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ checked: true, googleEnabled: false }))),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("FNN email and Google sign-in regressions", () => {
  it("signs in in-place with trimmed email, never granting owner access from success alone", async () => {
    fixture.signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: "fixture-account" } } },
      error: null,
    });
    mount();
    fill();
    fireEvent.submit(screen.getByLabelText("Password").closest("form")!);
    await screen.findByRole("button", { name: "Sign in with email and password" });
    expect(fixture.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.test",
      password: "fixture-password",
    });
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("Private chat fixture")).toBeNull();
  });
  it("offers email switching to an authenticated but unauthorized account", async () => {
    fixture.user = { id: "unapproved-fixture-account" };
    mount();
    await screen.findByRole("button", { name: "Use another email account" });
    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.queryByText("Private chat fixture")).toBeNull();
  });
  it("serializes repeated submits and locks Google while a password request is pending", async () => {
    let finish: (value: unknown) => void = () => {};
    fixture.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    mount();
    fill();
    const form = screen.getByLabelText("Password").closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fixture.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole("button", { name: /Preparing sign-in/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await act(async () => {
      finish({ data: { session: null }, error: new Error("fixture") });
    });
  });
  it("requires reload after timeout instead of racing an uncancelled SDK login", async () => {
    vi.useFakeTimers();
    fixture.signInWithPassword.mockReturnValue(new Promise(() => {}));
    mount();
    fill();
    fireEvent.submit(screen.getByLabelText("Password").closest("form")!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_001);
    });
    expect(screen.getByRole("button", { name: "Reload page" })).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Sign in with email and password" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.submit(screen.getByLabelText("Password").closest("form")!);
    expect(fixture.signInWithPassword).toHaveBeenCalledTimes(1);
  });
});
