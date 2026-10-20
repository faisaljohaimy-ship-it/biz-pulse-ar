import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n";
import { HomeTicker } from "./HomeTicker";

afterEach(cleanup);

describe("operational ticker recovery and focus order", () => {
  it("offers retry only after failure and keeps the region → retry → pause DOM order", () => {
    const retry = vi.fn();
    const pause = vi.fn();
    const view = (failed: boolean) => (
      <I18nProvider>
        <HomeTicker
          paused={false}
          offscreen={false}
          ready
          onPausedChange={pause}
          failed={failed}
          onRetry={retry}
        />
      </I18nProvider>
    );
    const { container, rerender } = render(view(false));
    expect(screen.queryByRole("button", { name: /تعذرت الأخبار/ })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    rerender(view(true));
    const retryButton = screen.getByRole("button", { name: /تعذرت الأخبار/ });
    const pauseButton = screen.getByRole("button", { name: "إيقاف الحركة" });
    const ordered = [...container.querySelectorAll('[tabindex="0"],button')];
    expect(ordered).toEqual([screen.getByRole("region"), retryButton, pauseButton]);
    fireEvent.click(retryButton);
    expect(retry).toHaveBeenCalledOnce();
    expect(pause).not.toHaveBeenCalled();
    fireEvent.click(pauseButton);
    expect(pause).toHaveBeenCalledWith(true);
    expect(retry).toHaveBeenCalledOnce();
  });
});
