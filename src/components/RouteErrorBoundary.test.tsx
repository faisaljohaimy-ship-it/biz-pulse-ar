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
    expect(errorLog).toHaveBeenCalledWith("[RouteErrorBoundary]", "twin");

    rerender(<RouteErrorBoundary error="connection lost" reset={reset} routeLabel="twin" />);
    expect(errorLog).toHaveBeenCalledTimes(1);

    rerender(<RouteErrorBoundary error="new failure" reset={reset} routeLabel="twin" />);
    expect(errorLog).toHaveBeenCalledTimes(2);
    expect(errorLog).toHaveBeenLastCalledWith("[RouteErrorBoundary]", "twin");
  });
  it("keeps sensitive SDK messages and stacks out of browser diagnostics", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const sensitiveFailure = new Error("Bearer fixture-secret-from-upstream");
    sensitiveFailure.stack =
      "request to https://fixture.invalid/?token=fixture-secret-from-upstream";

    render(<RouteErrorBoundary error={sensitiveFailure} reset={vi.fn()} routeLabel="twin" />);

    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalledWith("[RouteErrorBoundary]", "twin");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("fixture-secret-from-upstream");
  });
});
