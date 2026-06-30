/**
 * a11y tests for HologramFace — ARIA region semantics, state-driven
 * labelling, and axe compliance across locales and visual states.
 */
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { HologramFace } from "./HologramFace";

describe("HologramFace — ARIA semantics", () => {
  it("exposes a labelled image role in English", () => {
    const { getAllByRole } = render(<HologramFace state="idle" />);
    // wrapper (role=img + aria-label) + inner portrait <img>; the wrapper is first.
    const region = getAllByRole("img")[0];
    expect(region).toHaveAttribute("aria-label", expect.stringMatching(/ARIA/i));
  });

  it("uses the Arabic accessible name when ar=true", () => {
    const { getAllByRole } = render(<HologramFace state="idle" ar />);
    const region = getAllByRole("img")[0];
    expect(region.getAttribute("aria-label") ?? "").toMatch(/آريا/);
  });

  it("renders a portrait <img> with non-empty alt text", () => {
    const { container } = render(<HologramFace state="speaking" amp={0.6} />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("alt")).toBeTruthy();
  });

  it.each(["idle", "listening", "thinking", "speaking", "completed", "error"] as const)(
    "passes axe with state=%s",
    async (state) => {
      const { container } = render(<HologramFace state={state} amp={0.4} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    },
  );

  it("decorative aura/ring layers are aria-hidden so SR users hear one label", () => {
    const { container } = render(<HologramFace state="thinking" />);
    const hidden = container.querySelectorAll("[aria-hidden='true']");
    // 3 ring/aura layers + halo container + speaking/listening overlays as applicable
    expect(hidden.length).toBeGreaterThanOrEqual(3);
  });
});
