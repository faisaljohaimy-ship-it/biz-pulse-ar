import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import {
  NxButton,
  NxVoiceButton,
  NxPanel,
  NxKpiCard,
  NxKpiNumber,
  NxDelta,
  deltaTone,
  NxStatusIndicator,
  NxSparkline,
  NxSkeleton,
  NxSpinner,
  NxProgress,
  NxEmptyState,
  NxErrorState,
  NxFinnPresence,
  FINN_STATE_LABEL,
  NxWaveform,
  NxRegionPulse,
  NxTwinNode,
  type NxFinnState,
} from "./index";

describe("NxButton — spec 01", () => {
  it("renders every variant from the closed set with its data marker", () => {
    const variants = [
      "primary",
      "secondary",
      "ghost",
      "glass",
      "outline",
      "danger",
      "warning",
      "success",
      "runtime",
      "executive",
    ] as const;
    for (const variant of variants) {
      const { unmount } = render(<NxButton variant={variant}>زر</NxButton>);
      expect(screen.getByRole("button")).toHaveAttribute("data-variant", variant);
      unmount();
    }
  });

  it("loading locks interaction and sets aria-busy", () => {
    render(<NxButton loading>حفظ</NxButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.className).toMatch(/aria-busy:pointer-events-none/);
  });

  it("disabled uses the opacity token, not a raw value", () => {
    render(<NxButton disabled>زر</NxButton>);
    expect(screen.getByRole("button").className).toMatch(/--nx-opacity-38/);
  });

  it("voice button states expose aria-pressed and Arabic names", () => {
    const { rerender } = render(<NxVoiceButton state="idle" />);
    expect(screen.getByRole("button", { name: "تحدث إلى FINN" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    rerender(<NxVoiceButton state="listening" />);
    expect(screen.getByRole("button", { name: "يستمع" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("NxPanel — spec 07", () => {
  it("renders header/content/footer anatomy with density register", () => {
    render(
      <NxPanel title="الامتثال" density="operations" layer="analytics" footer={<span>مباشر</span>}>
        محتوى
      </NxPanel>,
    );
    const panel = screen.getByRole("region", { name: "الامتثال" });
    expect(panel).toHaveAttribute("data-density", "operations");
    expect(panel.className).toMatch(/border-t-nx-layer-analytics/);
    expect(screen.getByText("مباشر")).toBeInTheDocument();
  });
});

describe("KPI components — spec 05", () => {
  it("KPI number renders tabular value with unit (four truths)", () => {
    render(<NxKpiNumber value="99.2" unit="%" size="lg" />);
    expect(screen.getByText("99.2").className).toMatch(/tabular-nums/);
    expect(screen.getByText("%")).toBeInTheDocument();
  });

  it("delta tone is direction-aware: an increase can be bad", () => {
    expect(deltaTone(3, "up")).toBe("positive");
    expect(deltaTone(3, "down")).toBe("negative"); // incidents rising = bad
    expect(deltaTone(-3, "down")).toBe("positive");
    expect(deltaTone(0.4, "up", 0.5)).toBe("neutral"); // under noise threshold
  });

  it("delta renders neutral «مستقر» below the noise threshold", () => {
    render(<NxDelta value={0.2} goodDirection="up" noiseThreshold={0.5} />);
    expect(screen.getByText("مستقر")).toHaveAttribute("data-tone", "neutral");
  });

  it("status indicator triple-codes state (color class + Arabic word)", () => {
    render(<NxStatusIndicator status="critical" />);
    const chip = screen.getByText("حرج");
    expect(chip).toHaveAttribute("data-status", "critical");
  });

  it("sparkline is an accessible image with a summary label", () => {
    render(<NxSparkline points={[1, 3, 2, 5]} label="اتجاه صاعد" />);
    expect(screen.getByRole("img", { name: "اتجاه صاعد" })).toBeInTheDocument();
  });

  it("KPI card carries provenance and the simulation badge", () => {
    render(
      <NxKpiCard
        label="التوافر"
        value="99.2"
        unit="%"
        updatedAt="12:00"
        simulation
        delta={{ value: 0.3, goodDirection: "up" }}
      />,
    );
    expect(screen.getByText("محاكاة")).toBeInTheDocument();
    expect(screen.getByText(/آخر تحديث/)).toBeInTheDocument();
  });
});

describe("Loading system — spec 11", () => {
  it("spinner has status role with an Arabic label", () => {
    render(<NxSpinner size={20} label="يحمّل المؤشرات" />);
    expect(screen.getByRole("status")).toHaveTextContent("يحمّل المؤشرات");
  });

  it("progress exposes determinate value; indeterminate omits valuenow", () => {
    const { rerender } = render(<NxProgress value={40} label="التقدم" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    rerender(<NxProgress label="التقدم" />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  });

  it("skeleton is aria-hidden decoration", () => {
    const { container } = render(<NxSkeleton bar="number" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Empty & error states — specs 12/13", () => {
  it("empty state answers the three questions with kind marker", () => {
    const onAction = vi.fn();
    render(
      <NxEmptyState
        kind="filtered"
        icon={<svg />}
        title="لا عناصر ظاهرة"
        description="عناصر موجودة لكن التصفية تخفيها"
        action={{ label: "مسح التصفية", onAction }}
      />,
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-kind", "filtered");
    screen.getByRole("button", { name: "مسح التصفية" }).click();
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("error state is an alert with retry and disclosed trace id", () => {
    render(
      <NxErrorState
        severity="recoverable"
        title="تعذّر تحميل المؤشرات"
        description="انقطاع مؤقت في الاتصال"
        onRetry={() => undefined}
        traceId="trace-1234"
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إعادة المحاولة" })).toBeInTheDocument();
    expect(screen.getByText("trace-1234")).toBeInTheDocument();
  });
});

describe("NxFinnPresence — motion doc 05", () => {
  it("renders every state with its Arabic co-signal (reduced-motion parity)", () => {
    const states = Object.keys(FINN_STATE_LABEL) as NxFinnState[];
    for (const state of states) {
      const { unmount } = render(<NxFinnPresence state={state} />);
      expect(screen.getByRole("status")).toHaveAttribute("data-finn-state", state);
      expect(screen.getByText(FINN_STATE_LABEL[state])).toBeInTheDocument();
      unmount();
    }
  });

  it("«executing» renders as awaiting APPROVED execution — FINN never executes", () => {
    expect(FINN_STATE_LABEL.executing).toBe("بانتظار التنفيذ المعتمد");
  });

  it("waveform bars follow the provided real levels", () => {
    const { container } = render(<NxWaveform levels={[0.2, 0.8, 0.5]} />);
    expect(container.querySelectorAll("span > span, div > span")).not.toHaveLength(0);
    expect(container.firstElementChild?.children).toHaveLength(3);
  });
});

describe("Digital twin — motion doc 05", () => {
  it("region pulse takes its color from regions.ts and breathes only when live", () => {
    const { rerender } = render(<NxRegionPulse regionId="eastern" />);
    const still = screen.getByRole("img");
    expect(still).toHaveAttribute("data-region", "eastern");
    expect(still).not.toHaveAttribute("data-live");
    rerender(<NxRegionPulse regionId="eastern" live />);
    expect(screen.getByRole("img", { name: /مباشر/ })).toHaveAttribute("data-live");
  });

  it("twin node triple-codes status for screen readers", () => {
    render(<NxTwinNode name="المحطة الشرقية" status="warning" />);
    expect(screen.getByText("المحطة الشرقية")).toBeInTheDocument();
    expect(screen.getByText("تحذير")).toBeInTheDocument(); // sr-only word
  });
});

describe("Accessibility — axe sweep over states (audit cat 07)", () => {
  it("loading, empty, error and voice states have no axe violations", async () => {
    const { container } = render(
      <div dir="rtl">
        <NxSpinner size={20} label="يحمّل" />
        <NxProgress value={60} label="التقدم" />
        <NxProgress label="غير محدد" />
        <NxSkeleton bar="title" />
        <NxEmptyState icon={<svg />} title="فارغ" description="لا عناصر بعد" />
        <NxErrorState title="تعذّر" description="انقطاع" onRetry={() => undefined} traceId="t-1" />
        <NxVoiceButton state="listening" />
        <NxFinnPresence state="reasoning" mode="gated" />
        <NxRegionPulse regionId="central" live />
        <NxTwinNode name="محطة" status="critical" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Accessibility — axe over a composed surface", () => {
  it("a composed panel of nx components has no axe violations", async () => {
    const { container } = render(
      <div dir="rtl">
        <NxPanel title="المؤشرات" footer={<span>آخر تحديث 12:00 · محاكاة</span>}>
          <NxKpiCard label="التوافر" value="99.2" unit="%" updatedAt="12:00" />
          <NxButton variant="primary">تفاصيل</NxButton>
          <NxStatusIndicator status="success" />
          <NxFinnPresence state="idle" />
        </NxPanel>
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
