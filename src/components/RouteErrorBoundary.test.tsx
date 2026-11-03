import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

const mocks = vi.hoisted(() => ({ invalidate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: mocks.invalidate }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mocks.invalidate.mockReset();
});

describe("RouteErrorBoundary error logging", () => {
  it("logs a primitive failure once across unrelated rerenders, then logs a new failure", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();

    const { rerender } = render(
      <RouteErrorBoundary error="connection lost" reset={reset} routeLabel="twin" />,
    );
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalledWith(
      "[RouteErrorBoundary]",
      expect.objectContaining({ route: "twin", message: "connection lost" }),
    );

    rerender(<RouteErrorBoundary error="connection lost" reset={reset} routeLabel="twin" />);
    expect(errorLog).toHaveBeenCalledTimes(1);

    rerender(<RouteErrorBoundary error="new failure" reset={reset} routeLabel="twin" />);
    expect(errorLog).toHaveBeenCalledTimes(2);
    expect(errorLog).toHaveBeenLastCalledWith(
      "[RouteErrorBoundary]",
      expect.objectContaining({ route: "twin", message: "new failure" }),
    );
  });
});
