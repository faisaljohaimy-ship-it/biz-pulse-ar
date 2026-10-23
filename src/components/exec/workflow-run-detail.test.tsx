/**
 * جسم درج تفاصيل سير العمل بحالة `waiting_approval` — عرضٌ محض بلا خادم.
 *
 * يُحرَس: التسمية العربية «بانتظار الاعتماد» كهرمانيةً بمثلث على الخطوة
 * وعلى التشغيل (UI-5)، وأن الانتظار ليس حالةً «حيّة» تقبل الإلغاء ولا
 * نهائيةً تقبل الاستئناف.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  WorkflowRunDetailBody,
  type WorkflowRunRow,
  type WorkflowStepRow,
} from "./workflow-run-detail";

const run: WorkflowRunRow = {
  id: "6c1d2e3f-4a5b-4c6d-9e8f-0a1b2c3d4e5f",
  workflow_id: "incident-escalation",
  status: "waiting_approval",
  current_step: "agent.awaiting_approval",
  started_at: "2026-10-23T08:00:00.000Z",
  finished_at: null,
  error: null,
  triggered_by: "scheduler",
  trigger_event: "sec.incident.created",
  context_json: null,
};

const steps: WorkflowStepRow[] = [
  {
    id: "s1",
    step_id: "classify",
    kind: "tool",
    status: "succeeded",
    attempt: 1,
    started_at: "2026-10-23T08:00:00.000Z",
    finished_at: "2026-10-23T08:00:02.000Z",
    error: null,
    tool_execution_id: null,
    output_json: { severity: "high" },
  },
  {
    id: "s2",
    step_id: "agent.awaiting_approval",
    kind: "agent",
    status: "waiting_approval",
    attempt: 1,
    started_at: "2026-10-23T08:00:02.000Z",
    finished_at: null,
    error: null,
    tool_execution_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    output_json: null,
  },
];

describe("waiting_approval في درج سير العمل", () => {
  it("الخطوة المنتظرة تحمل «بانتظار الاعتماد» كهرمانيةً بمثلث، لا النصّ الخام", () => {
    render(<WorkflowRunDetailBody run={run} steps={steps} />);
    const badge = screen.getByText("بانتظار الاعتماد");
    expect(badge).toHaveAttribute("data-tone", "warning");
    expect(badge).toHaveAttribute("data-shape", "triangle");
    expect(screen.queryByText("waiting_approval")).toBeNull();
    expect(screen.getByText("نجح")).toHaveAttribute("data-shape", "circle");
  });

  it("الانتظار لا يُلغى ولا يُستأنف من هنا — الزرّان معطَّلان، والتحديث متاح", () => {
    render(<WorkflowRunDetailBody run={run} steps={steps} />);
    expect(screen.getByRole("button", { name: /Cancel/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Resume/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Refresh/ })).toBeEnabled();
  });

  it("الخطوة الجارية تُلغى، والفاشلة تُستأنف", () => {
    const { rerender } = render(
      <WorkflowRunDetailBody run={{ ...run, status: "running" }} steps={[]} />,
    );
    expect(screen.getByRole("button", { name: /Cancel/ })).toBeEnabled();
    rerender(<WorkflowRunDetailBody run={{ ...run, status: "failed" }} steps={[]} />);
    expect(screen.getByRole("button", { name: /Resume/ })).toBeEnabled();
    expect(screen.getByText("No steps recorded yet.")).toBeInTheDocument();
  });

  it("الخطوة الحالية ومعرّف التنفيذ المرتبط ظاهران", () => {
    render(<WorkflowRunDetailBody run={run} steps={steps} />);
    expect(screen.getAllByText("agent.awaiting_approval").length).toBeGreaterThan(0);
    expect(screen.getByText(/exec 9a8b7c6d/)).toBeInTheDocument();
  });
});
