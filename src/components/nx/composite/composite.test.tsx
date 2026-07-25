import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import {
  NxLayerStack,
  STACK_LAYER_ORDER,
  STACK_LAYER_LABEL,
  NxPipelineFlow,
  PIPELINE_STAGE_ORDER,
  NxEventTicker,
  type NxTickerEvent,
} from "../index";

const SAMPLE_EVENTS: readonly NxTickerEvent[] = [
  { id: "e1", kind: "decision", text: "اعتُمد تحديث خطة الاستجابة", time: "09:12" },
  { id: "e2", kind: "alert", text: "ارتفاع حرارة المحول رقم 4" },
  { id: "e3", kind: "audit", text: "اكتمل تدقيق صلاحيات الربع" },
];

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: originalMatchMedia,
  });
});

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? matches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe("NxLayerStack — the five architectural strata", () => {
  it("renders the closed five-layer set in architecture order", () => {
    render(<NxLayerStack />);
    const chips = screen.getAllByRole("listitem");
    expect(chips).toHaveLength(5);
    chips.forEach((chip, i) => {
      expect(chip).toHaveAttribute("data-layer", STACK_LAYER_ORDER[i]);
      expect(chip).toHaveTextContent(STACK_LAYER_LABEL[STACK_LAYER_ORDER[i]]);
    });
  });

  it("only the active layer breathes, with an Arabic static co-signal", () => {
    render(<NxLayerStack activeLayer="agents" />);
    const chips = screen.getAllByRole("listitem");
    const active = chips.find((c) => c.getAttribute("data-layer") === "agents")!;
    expect(active).toHaveAttribute("data-active", "true");
    expect(active.className).toMatch(/nx-anim-breathe/);
    expect(active).toHaveTextContent("نشطة الآن");
    for (const chip of chips.filter((c) => c !== active)) {
      expect(chip.className).not.toMatch(/nx-anim-breathe/);
    }
  });
});

describe("NxPipelineFlow — seven-stage advisory pipeline", () => {
  it("renders all seven stages and phases them around the active stage", () => {
    const { container } = render(<NxPipelineFlow activeStage="retrieval" />);
    const stages = Array.from(container.querySelectorAll("[data-stage]"));
    expect(stages).toHaveLength(PIPELINE_STAGE_ORDER.length);
    expect(stages[0]).toHaveAttribute("data-phase", "done");
    expect(stages[1]).toHaveAttribute("data-phase", "done");
    expect(stages[2]).toHaveAttribute("data-phase", "active");
    expect(stages[2]).toHaveAttribute("aria-current", "step");
    expect(stages[3]).toHaveAttribute("data-phase", "pending");
  });

  it("the gold approval gate breathes only while pending approval", () => {
    const { container, rerender } = render(
      <NxPipelineFlow activeStage="recommendation" approvalPending />,
    );
    const gate = () => container.querySelector('[data-stage="approval"]')!;
    expect(gate().className).toMatch(/nx-anim-breathe/);
    expect(gate()).toHaveTextContent("بانتظار الاعتماد البشري");

    rerender(<NxPipelineFlow activeStage="recommendation" approvalPending={false} />);
    expect(gate().className).not.toMatch(/nx-anim-breathe/);
  });

  it("execution never carries a standing animation — advisory law", () => {
    const { container } = render(<NxPipelineFlow activeStage="execution" />);
    const execution = container.querySelector('[data-stage="execution"]')!;
    expect(execution.className).not.toMatch(/nx-anim-breathe/);
    expect(execution).toHaveAttribute("data-phase", "active");
  });
});

describe("NxEventTicker — licensed marquee with alarm override", () => {
  it("scrolls a duplicated track carrying the reduced-motion pause hook", () => {
    render(<NxEventTicker events={SAMPLE_EVENTS} />);
    const log = screen.getByRole("log");
    expect(log).toHaveAttribute("data-ticker-mode", "scrolling");
    const track = log.querySelector("[data-nx-loop]")!;
    expect(track).not.toBeNull();
    // animation-name/timing/iteration come from the [data-nx-ticker-track]
    // sheet rule; inline style must carry ONLY the measured duration — an
    // inline `animation` shorthand would defeat the pause rules' cascade.
    expect(track).toHaveAttribute("data-nx-ticker-track");
    expect((track as HTMLElement).style.animation).toBe("");
    expect((track as HTMLElement).style.animationDuration).toMatch(/^\d+(\.\d+)?s$/);
    // duplicated content: each event text appears twice (second copy aria-hidden)
    expect(screen.getAllByText("ارتفاع حرارة المحول رقم 4")).toHaveLength(2);
    expect(track.querySelectorAll("[aria-hidden]")).not.toHaveLength(0);
  });

  it("pauses on hover and focus", () => {
    render(<NxEventTicker events={SAMPLE_EVENTS} />);
    const log = screen.getByRole("log");
    const track = log.querySelector("[data-nx-loop]") as HTMLElement;
    fireEvent.mouseEnter(log);
    expect(track).toHaveAttribute("data-paused", "true");
    fireEvent.mouseLeave(log);
    expect(track).not.toHaveAttribute("data-paused");
    fireEvent.focus(log);
    expect(track).toHaveAttribute("data-paused", "true");
  });

  it("a critical event revokes the scroll license — static emphasis mode", () => {
    render(
      <NxEventTicker
        events={[...SAMPLE_EVENTS, { id: "c1", kind: "alert", text: "تسرب غاز", critical: true }]}
      />,
    );
    const log = screen.getByRole("log");
    expect(log).toHaveAttribute("data-ticker-mode", "critical");
    expect(log.querySelector("[data-nx-loop]")).toBeNull();
    expect(log.querySelector('[data-critical="true"]')).not.toBeNull();
    // static mode: single copy only
    expect(screen.getAllByText("تسرب غاز")).toHaveLength(1);
  });

  it("prefers-reduced-motion renders the static list", () => {
    mockReducedMotion(true);
    render(<NxEventTicker events={SAMPLE_EVENTS} />);
    expect(screen.getByRole("log")).toHaveAttribute("data-ticker-mode", "static");
    expect(screen.getByRole("log").querySelector("[data-nx-loop]")).toBeNull();
  });

  it("empty events render an honest empty line", () => {
    render(<NxEventTicker events={[]} />);
    expect(screen.getByRole("log")).toHaveTextContent("لا أحداث بعد");
  });
});

describe("composite accessibility", () => {
  it("composed cockpit strip passes axe in RTL", async () => {
    const { container } = render(
      <div dir="rtl">
        <NxLayerStack activeLayer="intelligence" />
        <NxPipelineFlow activeStage="approval" approvalPending />
        <NxEventTicker events={SAMPLE_EVENTS} />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
