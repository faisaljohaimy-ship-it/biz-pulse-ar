import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SadeedIntroFilm } from "./SadeedIntroFilm";

const bus = vi.hoisted(() => ({ unlock: vi.fn(), acquire: vi.fn(() => true), release: vi.fn() }));
vi.mock("@/lib/sadeed/audio-bus", () => ({ SadeedAudioBus: bus }));

describe("opening introduction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ hasNarration: true }) })),
    );
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts visuals without requesting speech or owning the sound channel", () => {
    const { container } = render(<SadeedIntroFilm />);
    expect(container.querySelector("video")?.muted).toBe(true);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(bus.acquire).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("/media/sadeed-intro-status.json", expect.any(Object));
  });

  it("does not auto-play for reduced motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    render(<SadeedIntroFilm />);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("releases and mutes on ending so replay cannot overlap a chatbot", async () => {
    const { container } = render(<SadeedIntroFilm />);
    fireEvent.click(await screen.findByText("شاهد من البداية بالصوت"));
    const video = container.querySelector("video")!;
    expect(video.muted).toBe(false);
    expect(bus.acquire).toHaveBeenCalledOnce();
    fireEvent.ended(video);
    await waitFor(() => expect(video.muted).toBe(true));
    expect(bus.release).toHaveBeenCalledWith("hero-soundtrack");
    fireEvent.click(screen.getByText("تشغيل الفيلم"));
    expect(video.muted).toBe(true);
  });
});
