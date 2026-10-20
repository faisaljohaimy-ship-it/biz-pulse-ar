import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DualAgentMetrics, DualAgentDistribution } from "./DualAgentMetrics";

afterEach(cleanup);

describe("dual-agent measured metrics", () => {
  it("does not display zero for measurements that have not arrived", () => {
    render(<DualAgentMetrics />);
    expect(screen.getAllByText("لم يُقَس")).toHaveLength(4);
    expect(screen.queryByText("٠")).not.toBeInTheDocument();
  });

  it("distinguishes a measured empty sample from unavailable data", () => {
    render(
      <DualAgentMetrics
        metrics={{
          sampleSize: 0,
          succeeded: 0,
          failed: 0,
          pendingApproval: 0,
          running: 0,
          successRate: null,
        }}
      />,
    );
    expect(screen.queryByText("لم يُقَس")).not.toBeInTheDocument();
    expect(screen.getAllByText((0).toLocaleString("ar-SA"))).toHaveLength(4);
  });

  it("exposes the sample denominator and individual counts accessibly", () => {
    render(
      <DualAgentDistribution
        metrics={{
          sampleSize: 10,
          succeeded: 5,
          failed: 2,
          pendingApproval: 2,
          running: 1,
          successRate: 5 / 7,
        }}
      />,
    );
    expect(screen.getByRole("meter", { name: "نجحت" })).toHaveAttribute("value", "5");
    expect(screen.getByRole("meter", { name: "نجحت" })).toHaveAttribute("max", "10");
    expect(screen.getByRole("meter", { name: "بانتظار الاعتماد" })).toHaveAttribute("value", "2");
  });
});
