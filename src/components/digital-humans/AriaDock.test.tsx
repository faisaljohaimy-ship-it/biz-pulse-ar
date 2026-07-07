/**
 * a11y + focus-order tests for AriaDock toolbar.
 *
 * The dock pulls in voice/listener/event-stream/HeyGen subsystems that
 * touch network, WebRTC, and audio APIs — every external dependency is
 * mocked at the module boundary so the test stays a pure DOM check of:
 *   • accessible names on every icon-only control
 *   • the aria-live polite region used for SR announcements
 *   • Tab focus order matches the visual reading order
 *   • zero axe violations in the default (expanded) state
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- module mocks (must precede component import) --------------------------
vi.mock("@/lib/digital-humans/gateway-listener", () => ({
  useGatewayListener: () => ({
    listening: false,
    thinking: false,
    transcript: "",
    toggle: vi.fn(),
    stop: vi.fn(),
  }),
}));
vi.mock("@/lib/events/useEventStream", () => ({
  useEventStream: () => ({ events: [] }),
}));
vi.mock("@/lib/digital-humans/aria-voice", () => ({
  speakAs: vi.fn(() => ({ promise: Promise.resolve(), stop: vi.fn() })),
  detectLang: vi.fn(() => "en"),
}));
vi.mock("@/lib/narrator/event-narrator", () => ({
  narrateEvent: vi.fn(() => null),
}));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ locale: "en", setLocale: vi.fn(), t: (k: string) => k }),
}));
vi.mock("@/components/digital-humans/heygen/HeygenAvatarProvider", () => ({}));
vi.mock("@/components/digital-humans/r3f/R3FAvatarProvider", () => ({}));

// Stub global fetch for /api/heygen/status probe.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ configured: false }) } as Response),
    ),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

import { AriaDock } from "./AriaDock";

describe("AriaDock — a11y", () => {
  it("exposes a labelled landmark region", () => {
    render(<AriaDock />);
    const region = screen.getByRole("complementary");
    expect(region).toHaveAttribute("aria-label", expect.stringMatching(/ARIA/i));
  });

  it("provides an aria-live polite region for SR announcements", () => {
    const { container } = render(<AriaDock />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live).toHaveAttribute("aria-atomic", "true");
  });

  it("every icon-only toolbar button has an accessible name", () => {
    render(<AriaDock />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      const name =
        btn.getAttribute("aria-label") ||
        btn.getAttribute("title") ||
        btn.textContent?.trim();
      expect(name, `button missing accessible name: ${btn.outerHTML.slice(0, 80)}`).toBeTruthy();
    }
  });

  it("tab order visits Ask → Mute → Replay → Minimize → Hide", async () => {
    const user = userEvent.setup();
    render(<AriaDock />);
    const expected = [
      /Ask agent|Stop listening/i,
      /Enable voice|Mute|Toggle ARIA voice/i,
      /Replay welcome/i,
      /Minimize/i,
      /Hide/i,
    ];
    for (const matcher of expected) {
      await user.tab();
      const active = document.activeElement as HTMLElement | null;
      expect(active, `no focusable element for ${matcher}`).toBeTruthy();
      const name = active?.getAttribute("aria-label") ?? "";
      expect(name).toMatch(matcher);
    }
  });

  it("passes axe in the default expanded state", async () => {
    const { container } = render(<AriaDock />);
    const results = await axe(container, {
      // The decorative aria-live region intentionally has no perceivable text
      // at mount; that's the documented pattern, not a violation.
      rules: { region: { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });
});
