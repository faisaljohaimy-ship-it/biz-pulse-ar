import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ allowed: true, userId: "owner", ask: vi.fn() }));
vi.mock("@/lib/dual-agent/use-fnn-owner", () => ({ useFnnOwner: () => mocks }));
vi.mock("@/lib/dual-agent/owner.functions", () => ({ askFnn: mocks.ask }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
import { FnnOwnerChat } from "./FnnOwnerChat";
afterEach(cleanup);
beforeEach(() => {
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
});
