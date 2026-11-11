import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { RegionProvider, useRegion } from "./region-context";

function CurrentRegion() {
  const { regionId } = useRegion();
  return <output data-testid="region">{regionId}</output>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("RegionProvider: storage failures do not erase URL region", () => {
  it("honors a shared western-region URL when localStorage is blocked", async () => {
    window.history.replaceState(null, "", "/?region=western");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    render(<RegionProvider><CurrentRegion /></RegionProvider>);
    await waitFor(() => expect(screen.getByTestId("region").textContent).toBe("western"));
    expect(new URLSearchParams(window.location.search).get("region")).toBe("western");
  });

  it("falls back to central for an invalid URL when storage is blocked", async () => {
    window.history.replaceState(null, "", "/?region=unknown");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    render(<RegionProvider><CurrentRegion /></RegionProvider>);
    await waitFor(() => expect(screen.getByTestId("region").textContent).toBe("central"));
  });

  it("keeps the explicit URL above a readable conflicting preference", async () => {
    window.history.replaceState(null, "", "/?region=eastern");
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("southern");
    render(<RegionProvider><CurrentRegion /></RegionProvider>);
    await waitFor(() => expect(screen.getByTestId("region").textContent).toBe("eastern"));
  });
});
