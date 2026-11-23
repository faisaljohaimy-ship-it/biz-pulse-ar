import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { TwinLoadState } from "./TwinLoadState";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

it("replaces a stalled loader at four seconds and releases its timer", () => {
  vi.useFakeTimers();
  const schedule = vi.spyOn(window, "setTimeout");
  const clear = vi.spyOn(window, "clearTimeout");
  localStorage.setItem("locale", "en");
  const view = render(
    <I18nProvider>
      <TwinLoadState />
    </I18nProvider>,
  );
  const ownIndex = schedule.mock.calls.findIndex(([, delay]) => delay === 4_000);
  expect(ownIndex).toBeGreaterThanOrEqual(0);
  const ownTimer = schedule.mock.results[ownIndex]?.value;
  expect(ownTimer).toBeDefined();
  expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  act(() => vi.advanceTimersByTime(3_999));
  expect(screen.queryByRole("button")).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("status")).toHaveTextContent("Wait or retry");
  expect(screen.getByRole("button", { name: "Reload page" })).toBeVisible();
  view.unmount();
  expect(clear).toHaveBeenCalledWith(ownTimer);
});

it("shows the Arabic failure and an explicit retry without starting a loader timer", () => {
  vi.useFakeTimers();
  const schedule = vi.spyOn(window, "setTimeout");
  localStorage.setItem("locale", "ar");
  render(
    <I18nProvider>
      <TwinLoadState failed />
    </I18nProvider>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("تعذر تحميل هذا الجزء");
  expect(screen.getByRole("button", { name: "إعادة تحميل الصفحة" })).toBeVisible();
  expect(schedule.mock.calls.some(([, delay]) => delay === 4_000)).toBe(false);
});
