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
    let receiver: unknown;
    const target = {
      async requestFullscreen() {
        receiver = this;
      },
    };
    expect(await requestCinematicFullscreen(target)).toBe("entered");
    expect(receiver).toBe(target);
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
