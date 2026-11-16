import { describe, expect, it } from "vitest";
import { renderErrorPage } from "./error-page";

describe("renderErrorPage", () => {
  it("offers a same-document retry that works when CSP blocks inline JavaScript", () => {
    const html = renderErrorPage();
    expect(html).toContain('<a class="primary" href="">Try again</a>');
    expect(html).not.toMatch(/\s+on[a-z]+\s*=/i);
    expect(html).not.toMatch(/<script\b/i);
  });

  it("retains a same-origin way back to the home page", () => {
    expect(renderErrorPage()).toContain('<a class="secondary" href="/">Go home</a>');
  });
});
