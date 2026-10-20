import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AgentOpsRecord } from "@/lib/exec.functions";
import { FnnAutomationPanel } from "./FnnAutomationPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FNN panel", () => {
  it("prepares a selected-agent plan locally, labels simulation and never invokes a provider", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const agents = [
      { id: "operations", name: "وكيل العمليات", is_simulation: true },
      { id: "reporting", name: "وكيل التقارير", is_simulation: true },
    ] as unknown as AgentOpsRecord[];
    render(<FnnAutomationPanel agents={agents} />);
    expect(screen.getByText(/محاكاة مرجعية — ليست بيانات إنتاج/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("ما المهمة المطلوب تجهيزها؟"), {
      target: { value: "متابعة صيانة" },
    });
    fireEvent.change(screen.getByLabelText("الوكيل المقترح للمراجعة"), {
      target: { value: "operations" },
    });
    fireEvent.click(screen.getByRole("button", { name: "تجهيز الخطة" }));
    expect(screen.getByRole("status")).toHaveTextContent("وكيل العمليات");
    expect(screen.getByRole("status")).not.toHaveTextContent("وكيل التقارير");
    expect(screen.getByRole("status")).toHaveTextContent("لم تُنفّذ");
    expect(screen.getByRole("button", { name: "تنزيل الخطة" })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("ما المهمة المطلوب تجهيزها؟"), {
      target: { value: "كيف أطبخ الكبسة؟" },
    });
    fireEvent.click(screen.getByRole("button", { name: "تجهيز الخطة" }));
    expect(screen.queryByRole("button", { name: "تنزيل الخطة" })).not.toBeInTheDocument();
  });
});
