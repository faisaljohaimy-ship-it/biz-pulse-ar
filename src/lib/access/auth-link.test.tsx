import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
}));
const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  loading: false,
  navigate: vi.fn(),
}));
const notify = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => state }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "ar" }) }));
vi.mock("sonner", () => ({ toast: notify }));
vi.mock("@/components/home/SadeedIntroFilm", () => ({ SadeedIntroFilm: () => null }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useSearch: () => ({ mode: "signin" }),
  }),
  useNavigate: () => state.navigate,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

import { Route } from "@/routes/auth";
const AuthPage = Route.options.component as ComponentType;

describe("existing-account email sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.user = null;
    state.loading = false;
    auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: "owner" }, session: { expires_at: 2000000000 } },
      error: null,
    });
    vi.stubEnv("VITE_GOOGLE_AUTH_ENABLED", "false");
    auth.signInWithOtp.mockResolvedValue({ error: null });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

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

  it("uses one synchronous credential attempt and only the active button spins", async () => {
    vi.useFakeTimers();
    let finish!: (value: unknown) => void;
    auth.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<AuthPage />);
    fireEvent.change(screen.getByLabelText("البريد المؤسسي"), {
      target: { value: "owner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور"), {
      target: { value: "example-password" },
    });
    const button = screen.getByRole("button", { name: "دخول مساحة القيادة" });
    fireEvent.submit(button.closest("form")!);
    fireEvent.submit(button.closest("form")!);
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(button.querySelector(".animate-spin")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "المتابعة عبر Google" }).querySelector(".animate-spin"),
    ).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "أرسل لي رابط دخول بالبريد" })
        .querySelector(".animate-spin"),
    ).toBeNull();
    expect(screen.getByLabelText("البريد المؤسسي")).toBeDisabled();
    expect(screen.getByLabelText("كلمة المرور")).toBeDisabled();
    expect(screen.getByRole("tab", { name: "مستخدم جديد" })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_001);
    });
    expect(screen.getByRole("status")).toHaveTextContent("دون تأكيد النتيجة");
    expect(document.querySelector(".animate-spin")).toBeNull();
    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: "أرسل لي رابط دخول بالبريد" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "إعادة تحميل الصفحة" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "العودة للرئيسية" })).toHaveAttribute("href", "/");
    fireEvent.submit(button.closest("form")!);
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ data: { user: { id: "owner" }, session: {} }, error: null });
    });
    expect(state.navigate).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
    expect(button).toBeEnabled();
  });

  it("never resends a pending email link and ignores its late success after the UI deadline", async () => {
    vi.useFakeTimers();
    let finish!: (value: unknown) => void;
    auth.signInWithOtp.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<AuthPage />);
    fireEvent.change(screen.getByLabelText("البريد المؤسسي"), {
      target: { value: "owner@example.com" },
    });
    const button = screen.getByRole("button", { name: "أرسل لي رابط دخول بالبريد" });
    fireEvent.click(button);
    expect(button.querySelector(".animate-spin")).not.toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_001);
    });
    expect(screen.getByRole("status")).toHaveTextContent("تحقق من بريدك قبل طلب رابط آخر");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(auth.signInWithOtp).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish({ error: null });
    });
    expect(screen.queryByText(/إذا كان البريد مرتبطًا بحساب/)).toBeNull();
    expect(button).toBeEnabled();
    expect(auth.signInWithOtp).toHaveBeenCalledTimes(1);
  });

  it("navigates only after a confirmed password result, with an honest error for an empty result", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    });
    render(<AuthPage />);
    const button = screen.getByRole("button", { name: "دخول مساحة القيادة" });
    fireEvent.submit(button.closest("form")!);
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith("تعذّر تسجيل الدخول الآن — أعد المحاولة."),
    );
    expect(state.navigate).not.toHaveBeenCalled();
    fireEvent.submit(button.closest("form")!);
    await waitFor(() => expect(state.navigate).toHaveBeenCalledWith({ to: "/", replace: true }));
  });

  it("prevents SDK redirects and discards a late OAuth URL after timeout", async () => {
    vi.stubEnv("VITE_GOOGLE_AUTH_ENABLED", "true");
    vi.useFakeTimers();
    let finish!: (value: unknown) => void;
    auth.signInWithOAuth.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const view = render(<AuthPage />);
    fireEvent.click(screen.getByRole("button", { name: "المتابعة عبر Google" }));
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: window.location.origin, skipBrowserRedirect: true },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_001);
    });
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    await act(async () => {
      finish({ data: { url: "https://example.com/oauth" }, error: null });
    });
    expect(assign).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    view.unmount();
  });

  it("does not navigate or toast after unmount, but allows a real provider SIGNED_IN update", async () => {
    let finish!: (value: unknown) => void;
    auth.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const view = render(<AuthPage />);
    fireEvent.submit(screen.getByRole("button", { name: "دخول مساحة القيادة" }).closest("form")!);
    view.unmount();
    await act(async () => {
      finish({ error: { message: "late rejected" }, data: { user: null, session: null } });
    });
    expect(notify.error).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
    const signed = render(<AuthPage />);
    state.user = { id: "owner" };
    signed.rerender(<AuthPage />);
    await waitFor(() => expect(state.navigate).toHaveBeenCalledWith({ to: "/", replace: true }));
  });
});
