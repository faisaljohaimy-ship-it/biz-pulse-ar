/**
 * Click-path audit for the executive cockpit — every visible control:
 * clickable → event fires → handler executes → action completes.
 * (Frontend Interaction Forensic regression suite.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";
import { NxCockpitPage } from "@/routes/nx-cockpit";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("cockpit click-path audit", () => {
  it("every visible button is enabled and none is pointer-blocked", () => {
    render(<NxCockpitPage />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(10); // 5 chips + gate + voice + 3 quick actions
    for (const button of buttons) {
      expect(button).toBeEnabled();
      expect(button).not.toHaveAttribute("aria-busy", "true");
    }
    // navigation exists and points home
    expect(screen.getByRole("link", { name: "العودة للرئيسية" })).toHaveAttribute("href", "/");
  });

  it("touch-target law: every new interactive element declares ≥44px height", () => {
    const { container } = render(<NxCockpitPage />);
    // gold gate ships at the 48px lg size
    expect(screen.getByRole("button", { name: "اعتماد التنفيذ" }).className).toMatch(/h-12/);
    // interactive layer chips and the home link carry the 44px floor
    for (const chip of Array.from(container.querySelectorAll("button[data-layer]"))) {
      expect(chip.className).toMatch(/min-h-11/);
    }
    expect(screen.getByRole("link", { name: "العودة للرئيسية" }).className).toMatch(/min-h-11/);
  });

  it("layer chips: click selects the layer (handler executes, state completes)", () => {
    const { container } = render(<NxCockpitPage />);
    const chip = (id: string) => container.querySelector(`[data-layer="${id}"]`) as HTMLElement;
    expect(chip("intelligence")).toHaveAttribute("data-active", "true");
    fireEvent.click(chip("platform"));
    expect(chip("platform")).toHaveAttribute("data-active", "true");
    expect(chip("platform")).toHaveAttribute("aria-pressed", "true");
    expect(chip("intelligence")).not.toHaveAttribute("data-active");
  });

  it("quick action: FINN thinks, recommendation updates, ticker records the request", () => {
    const { container } = render(<NxCockpitPage />);
    fireEvent.click(screen.getByRole("button", { name: "حالة التصاريح" }));
    expect(container.querySelector('[data-finn-state="thinking"]')).not.toBeNull();
    expect(screen.getAllByText(/طُلبت توصية: حالة التصاريح/).length).toBeGreaterThanOrEqual(1);
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.getByText(/حالة التصاريح: 3 تصاريح عمل ساخن/)).toBeInTheDocument();
    expect(container.querySelector('[data-finn-state="speaking"]')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(container.querySelector('[data-finn-state="idle"]')).not.toBeNull();
  });

  it("voice button toggles listening (aria-pressed + FINN state)", () => {
    const { container } = render(<NxCockpitPage />);
    const voice = container.querySelector("[data-voice-state]") as HTMLElement;
    expect(voice).toHaveAttribute("data-voice-state", "idle");
    fireEvent.click(voice);
    expect(voice).toHaveAttribute("data-voice-state", "listening");
    expect(voice).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector('[data-finn-state="listening"]')).not.toBeNull();
    fireEvent.click(voice);
    expect(voice).toHaveAttribute("data-voice-state", "idle");
  });

  it("the gold gate: human click crosses approval → execution → result, journaled in the ticker", () => {
    const { container } = render(<NxCockpitPage />);
    const pipeline = () => container.querySelector("[data-active-stage]") as HTMLElement;
    expect(pipeline()).toHaveAttribute("data-active-stage", "approval");

    fireEvent.click(screen.getByRole("button", { name: "اعتماد التنفيذ" }));
    expect(pipeline()).toHaveAttribute("data-active-stage", "execution");
    expect(container.querySelector('[data-finn-state="executing"]')).not.toBeNull();
    expect(screen.getAllByText(/اعتمد الإنسان التوصية/).length).toBeGreaterThanOrEqual(1);

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(pipeline()).toHaveAttribute("data-active-stage", "result");
    expect(screen.getAllByText(/اكتمل التنفيذ المعتمد/).length).toBeGreaterThanOrEqual(1);

    // gate button is gone; new-round control appears and works
    expect(screen.queryByRole("button", { name: "اعتماد التنفيذ" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "جولة جديدة" }));
    expect(pipeline()).toHaveAttribute("data-active-stage", "approval");
    expect(screen.getByRole("button", { name: "اعتماد التنفيذ" })).toBeEnabled();
  });

  it("advisory law: without the human click the pipeline never crosses approval", () => {
    const { container } = render(<NxCockpitPage />);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(container.querySelector("[data-active-stage]")).toHaveAttribute(
      "data-active-stage",
      "approval",
    );
  });
});
