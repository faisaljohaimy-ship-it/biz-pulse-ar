import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ allowed: true, userId: "owner", ask: vi.fn() }));
vi.mock("@/lib/dual-agent/use-fnn-owner", () => ({ useFnnOwner: () => mocks }));
vi.mock("@/lib/dual-agent/owner.functions", () => ({ askFnn: mocks.ask }));
vi.mock("./FnnCodeWorkspace", () => ({ FnnCodeWorkspace: () => <div>code workspace</div> }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
import { FnnOwnerChat } from "./FnnOwnerChat";
import { useFnnChatStore } from "@/lib/dual-agent/fnn-chat-store";
afterEach(cleanup);
beforeEach(() => {
  useFnnChatStore.getState().close();
  mocks.allowed = true;
  mocks.userId = "owner";
  mocks.ask.mockReset();
});
describe("independent owner FNN chat", () => {
  it("hides the icon and panel for a non-owner", () => {
    mocks.allowed = false;
    render(<FnnOwnerChat />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(mocks.ask).not.toHaveBeenCalled();
  });
  it("uses its own transport and clears conversation on identity change", async () => {
    mocks.ask.mockResolvedValue({
      plan: { title: "مراجعة البرمجة", steps: ["فحص الكود"], status: "prepared" },
    });
    const view = render(<FnnOwnerChat />);
    fireEvent.click(screen.getByRole("button", { name: /فتح شات FNN/ }));
    fireEvent.change(screen.getByLabelText("رسالتك إلى FNN"), { target: { value: "راجع الكود" } });
    fireEvent.click(screen.getByRole("button", { name: "إرسال إلى FNN" }));
    await waitFor(() => expect(screen.getByText("FNN: مراجعة البرمجة")).toBeInTheDocument());
    expect(mocks.ask).toHaveBeenCalledWith({ data: { message: "راجع الكود" } });
    mocks.userId = "new-owner";
    view.rerender(<FnnOwnerChat />);
    expect(screen.queryByText("FNN: مراجعة البرمجة")).toBeNull();
  });
  it("offers a lowercase code tab and preserves chat while switching tabs", async () => {
    mocks.ask.mockResolvedValue({
      plan: { title: "خطة محفوظة في الجلسة", steps: [], status: "prepared" },
    });
    render(<FnnOwnerChat />);
    fireEvent.click(screen.getByRole("button", { name: /فتح شات FNN/ }));
    fireEvent.change(screen.getByLabelText("رسالتك إلى FNN"), { target: { value: "راجع الملف" } });
    fireEvent.click(screen.getByRole("button", { name: "إرسال إلى FNN" }));
    await waitFor(() => expect(screen.getByText("FNN: خطة محفوظة في الجلسة")).toBeVisible());
    fireEvent.mouseDown(screen.getByRole("tab", { name: /code/ }), { button: 0, ctrlKey: false });
    expect(screen.getByText("code workspace")).toBeVisible();
    expect(screen.getByText("FNN: خطة محفوظة في الجلسة")).not.toBeVisible();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "المحادثة" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByText("FNN: خطة محفوظة في الجلسة")).toBeVisible();
  });
  it("labels a saved scheduler report separately from a proposed plan", async () => {
    mocks.ask.mockResolvedValue({
      plan: { title: "أتمتة FNN: تعمل", steps: ["وقت الرصد محفوظ"], status: "prepared" },
      source: "scheduled_report",
    });
    render(<FnnOwnerChat />);
    fireEvent.click(screen.getByRole("button", { name: /فتح شات FNN/ }));
    fireEvent.change(screen.getByLabelText("رسالتك إلى FNN"), {
      target: { value: "حالة أتمتة FNN" },
    });
    fireEvent.click(screen.getByRole("button", { name: "إرسال إلى FNN" }));
    await waitFor(() => expect(screen.getByText(/نتيجة محفوظة من المجدول/)).toBeInTheDocument());
    expect(screen.queryByText(/خطة مقترحة/)).toBeNull();
  });
});
