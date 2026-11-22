import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { SecurityDecisionOmegaLab } from "./SecurityDecisionOmegaLab";
import { getOmegaBaselineAssumptions } from "@/lib/sadeed/omega-security-lab";
import type { SecurityDecisionScenarioId } from "@/lib/sadeed/security-decision-scenarios";

function Harness({
  ar = false,
  scenarioId = "access",
}: {
  ar?: boolean;
  scenarioId?: SecurityDecisionScenarioId;
}) {
  const [inputs, setInputs] = useState(() => getOmegaBaselineAssumptions(scenarioId));
  return (
    <SecurityDecisionOmegaLab
      ar={ar}
      scenarioId={scenarioId}
      inputs={inputs}
      onChange={setInputs}
    />
  );
}

afterEach(() => vi.restoreAllMocks());

describe("Controlled security world and What-if lab", () => {
  it("selects graph context by keyboard and exposes the actual dependency trace", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const camera = screen.getByRole("button", { name: "3. Assumed camera" });
    camera.focus();
    await user.keyboard("{Enter}");
    expect(camera).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText("Dependency trace: Assumed connectivity", { exact: true }),
    ).toBeVisible();
    expect(screen.getByText(/Selected entity evidence: demo-access-log/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "7. Human review required" }));
    expect(camera).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/Dependency trace:.*Duty security supervisor/)).toBeVisible();
  });

  it("changes only controlled assumptions and leaves the caller's baseline object unchanged", async () => {
    const user = userEvent.setup();
    const inputs = Object.freeze(getOmegaBaselineAssumptions("access"));
    const change = vi.fn();
    render(
      <SecurityDecisionOmegaLab ar={false} scenarioId="access" inputs={inputs} onChange={change} />,
    );
    const camera = screen.getByRole("button", { name: "Camera available" });
    await user.click(camera);
    expect(change).toHaveBeenLastCalledWith({ ...inputs, cameraAvailable: false });
    expect(inputs.cameraAvailable).toBe(true);
    // The parent, not a hidden component store, applies proposed changes.
    expect(camera).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByRole("slider", { name: /Patrol count/ }), {
      target: { value: "0" },
    });
    expect(change).toHaveBeenLastCalledWith({ ...inputs, patrolCount: 0 });
    fireEvent.change(screen.getByRole("slider", { name: /Verification time/ }), {
      target: { value: "120" },
    });
    expect(change).toHaveBeenLastCalledWith({ ...inputs, responseMinutes: 120 });
  });

  it("shows rule, input, evidence and missing-fact explanations without asserting a proven cause or dispatch", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("No network is permitted"));
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText("No active hypotheses")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Camera available" }));
    expect(screen.queryByText("No active hypotheses")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Connectivity available" }));
    await user.click(
      screen.getByText("visibility-gap · Visibility-gap hypothesis", { exact: true }),
    );
    expect(screen.getByText(/Assumed visibility gaps.*causation is unproven/)).toBeVisible();
    expect(
      screen.getByText(
        /Evidence & inputs: demo-access-log.*Camera available.*Connectivity available/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Verification needed: Actual barriers and record validity are unverified",
        {},
      ),
    ).toBeVisible();
    expect(screen.getByText("Baseline: Low · Proposed: High", { exact: true })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Route open" }));
    expect(
      screen.getByText("coverage-gap · Coverage-gap hypothesis", { exact: true }),
    ).toBeVisible();
    await user.click(screen.getByText("Unknowns & measurement plan", { exact: true }));
    expect(
      screen.getByText("Event and barriers are unverified; event severity is unchanged", {}),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Verify source, coverage and verification time before assessing improvement/,
      ),
    ).toBeVisible();
    expect(screen.getByText(/Simulation only.*No execution/)).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("preserves selected context and inputs when language changes and resets on a new parent key", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness key="access:0" />);
    await user.click(screen.getByRole("button", { name: "3. Assumed camera" }));
    await user.click(screen.getByRole("button", { name: "Camera available" }));
    fireEvent.change(screen.getByRole("slider", { name: /Patrol count/ }), {
      target: { value: "4" },
    });
    rerender(<Harness key="access:0" ar />);
    expect(screen.getByRole("button", { name: "3. الكاميرا المفترضة" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "توفر الكاميرا" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("slider", { name: /عدد الدوريات/ })).toHaveValue("4");
    rerender(<Harness key="access:1" ar />);
    expect(screen.getByRole("button", { name: "1. الحدث الافتراضي" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "توفر الكاميرا" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("slider", { name: /عدد الدوريات/ })).toHaveValue("2");
  });

  it("keeps Arabic and changed English states accessible with no unlabeled numeric controls", async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<Harness ar />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<Harness />);
    await user.click(screen.getByRole("button", { name: "Camera available" }));
    await user.click(
      screen.getByText("visibility-gap · Visibility-gap hypothesis", { exact: true }),
    );
    const patrol = screen.getByRole("slider", { name: /Patrol count/ });
    expect(patrol).toHaveAttribute("min", "0");
    expect(patrol).toHaveAttribute("max", "12");
    expect(patrol).toHaveAttribute("step", "1");
    const time = screen.getByRole("slider", { name: /Verification time/ });
    expect(time).toHaveAttribute("min", "1");
    expect(time).toHaveAttribute("max", "120");
    expect(await axe(container)).toHaveNoViolations();
  });
});
