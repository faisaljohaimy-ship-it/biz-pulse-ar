import { describe, expect, it } from "vitest";
import { requestCinematicFullscreen } from "./fullscreen";

describe("cinematic fullscreen", () => {
  it("reports an absent stage as unsupported", async () => {
    expect(await requestCinematicFullscreen(null)).toBe("unsupported");
  });

  it("supports browsers without element fullscreen without throwing", async () => {
    expect(await requestCinematicFullscreen({})).toBe("unsupported");
  });

  it("preserves the element receiver on a successful request", async () => {
    const target = {
      calls: 0,
      async requestFullscreen() {
        this.calls += 1;
      },
    };
    expect(await requestCinematicFullscreen(target)).toBe("entered");
    expect(target.calls).toBe(1);
  });

  it("contains a rejected browser permission promise", async () => {
    const target = {
      requestFullscreen: () => Promise.reject(new Error("Permission denied")),
    };
    expect(await requestCinematicFullscreen(target)).toBe("failed");
  });

  it("contains a synchronous browser exception", async () => {
    const target = {
      requestFullscreen: (): Promise<void> => {
        throw new Error("Unsupported context");
      },
    };
    expect(await requestCinematicFullscreen(target)).toBe("failed");
  });
});
