import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
}));
const notify = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "ar" }) }));
vi.mock("sonner", () => ({ toast: notify }));
vi.mock("@/components/home/SadeedIntroFilm", () => ({ SadeedIntroFilm: () => null }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useSearch: () => ({ mode: "signin" }),
  }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

import { Route } from "@/routes/auth";
const AuthPage = Route.options.component as ComponentType;

describe("existing-account email sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_GOOGLE_AUTH_ENABLED", "false");
    auth.signInWithOtp.mockResolvedValue({ error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("offers the email alternative without calling an unavailable Google provider", () => {
    render(<AuthPage />);
    const google = screen.getByRole("button", { name: "المتابعة عبر Google" });
    expect(google).toBeDisabled();
    fireEvent.click(google);
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
    expect(screen.getByText(/الدخول عبر Google غير متاح حاليًا/)).toBeVisible();
  });

  it("does not send anything without a valid account email", () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: "أرسل لي رابط دخول بالبريد" }));
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("اكتب بريد حسابك أولًا.");
  });

  it("requests an existing-account link without a password or creating a new user", async () => {
    render(<AuthPage />);
    fireEvent.change(screen.getByLabelText("البريد المؤسسي"), {
      target: { value: "owner@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "أرسل لي رابط دخول بالبريد" }));
    await waitFor(() =>
      expect(auth.signInWithOtp).toHaveBeenCalledWith({
        email: "owner@example.com",
        options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
      }),
    );
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("إذا كان البريد مرتبطًا بحساب");
    expect(screen.getByRole("button", { name: "أرسل لي رابط دخول بالبريد" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("البريد المؤسسي"), {
      target: { value: "corrected@example.com" },
    });
    expect(screen.getByRole("button", { name: "أرسل لي رابط دخول بالبريد" })).toBeEnabled();
  });
});
