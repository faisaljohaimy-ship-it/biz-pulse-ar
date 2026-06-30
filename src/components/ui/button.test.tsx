/**
 * Generic a11y guardrails for the shadcn Button primitive — ensures
 * icon-only buttons have an accessible name and that the disabled state
 * is exposed correctly to assistive tech.
 */
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { X } from "lucide-react";
import { Button } from "./button";

describe("Button — a11y", () => {
  it("icon-only button requires aria-label to expose accessible name", async () => {
    const { container } = render(
      <Button size="icon" aria-label="Close menu">
        <X aria-hidden="true" />
      </Button>,
    );
    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("disabled state is communicated to AT", () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("text button has accessible name from its children — no axe violations", async () => {
    const { container } = render(<Button>Submit</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
