/**
 * قائمة تشغيلات الوكلاء — اختبار عرضٍ محض (jsdom · @testing-library/react).
 *
 *   ① صفوفٌ حيّة (uuid، «نجح» مع pendingApprovals.count=1) ⇐ تظهر
 *      «بانتظار الاعتماد (1)» كهرمانيةً بمثلث، ولا «محاكاة» ولا `sim-run-` في
 *      الشجرة كلّها.
 *   ② صفوف `is_simulation` ⇐ شارة «بيانات مرجعية (محاكاة)» وتختفي أزرار
 *      الإلغاء والإعادة (الغياب من شجرة الوصول لا التعطيل) ولو مُرّرت الأفعال.
 *   ③ `steps: []` في المحاكاة ⇐ «—» لا فراغ ولا صفر.
 *   ④ عدّاد «أدوات فشلت: N» حين يحمله audit_json.
 *
 * لا خادم ولا شبكة: المكوّن يأخذ صفوفه خصائصَ.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentRunsList, type AgentRunRow } from "./AgentRunsList";
import { RunStatusBadge } from "./RunStatusBadge";

const UUID = "3f2c9a4e-7b1d-4c2e-9f0a-1b2c3d4e5f60";
const EXEC_UUID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

const realSucceededPending: AgentRunRow = {
  id: UUID,
  agent_id: "incident-commander",
  status: "succeeded",
  summary: "راجعت بلاغات آخر 24 ساعة.\n\nإجراءات بانتظار الاعتماد البشري: 1 — لم تُنفَّذ بعد.",
  steps: 2,
  error: null,
  started_at: "2026-10-23T08:00:00.000Z",
  finished_at: "2026-10-23T08:00:24.000Z",
  triggered_by: "manual",
  goal_override: null,
  audit_json: { pendingApprovals: { count: 1, executionIds: [EXEC_UUID] } },
};

const realFailed: AgentRunRow = {
  id: "0d1e2f3a-4b5c-4d6e-8f90-a1b2c3d4e5f6",
  agent_id: "perimeter-analyst",
  status: "failed",
  summary: null,
  steps: 1,
  error: "sensor_timeout",
  started_at: "2026-10-23T07:00:00.000Z",
  finished_at: "2026-10-23T07:00:10.000Z",
  goal_override: null,
  // الصيغة الحقيقية التي يكتبها زمن التشغيل — لا صيغة مخترَعة.
  audit_json: {
    toolFailures: { attempted: 4, succeeded: 1, failed: 2, rejected: 1, failures: [] },
    excludedTools: [{ toolId: "rag.record_gap", reason: "disabled" }],
  },
};

function simRow(i: number, status: string): AgentRunRow {
  return {
    id: `sim-run-${i}`,
    agent_id: `sim-a${i}`,
    status,
    summary: "محاكاة مرجعية",
    steps: [],
    error: status === "failed" ? "sensor_timeout: GATE-S-4" : null,
    started_at: "2026-10-23T06:00:00.000Z",
    finished_at: status === "running" ? null : "2026-10-23T06:00:24.000Z",
    triggered_by: "scheduler",
    goal_override: null,
    audit_json: { simulated: true },
    is_simulation: true,
  };
}

describe("① صفوف حيّة — الحالة المشتقّة بلا شارة محاكاة", () => {
  it("تظهر «بانتظار الاعتماد (1)» كهرمانيةً بمثلث لا «نجح» الخضراء", () => {
    const { container } = render(<AgentRunsList runs={[realSucceededPending]} />);
    const badge = screen.getByText("بانتظار الاعتماد (1)");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-tone", "warning");
    expect(badge).toHaveAttribute("data-shape", "triangle");
    expect(screen.queryByText("نجح")).toBeNull();
    expect(container.textContent).not.toMatch(/محاكاة/);
    expect(container.textContent).not.toMatch(/sim-run-/);
    expect(container.querySelector("[data-simulation]")).toBeNull();
  });

  it("المعرّف الحيّ والوكيل ظاهران، والخطوات رقمٌ صحيح", () => {
    render(<AgentRunsList runs={[realSucceededPending]} />);
    expect(screen.getByText(UUID.slice(0, 8))).toBeInTheDocument();
    expect(screen.getByText("incident-commander")).toBeInTheDocument();
    expect(screen.getByTestId("run-steps")).toHaveTextContent("2 خطوة");
  });

  it("رابط «عرض طلبات الاعتماد» يظهر مع الانتظار ويستدعي المستهلك بالصفّ", async () => {
    const onOpenApprovals = vi.fn();
    render(<AgentRunsList runs={[realSucceededPending]} onOpenApprovals={onOpenApprovals} />);
    await userEvent.click(screen.getByRole("button", { name: "عرض طلبات الاعتماد" }));
    expect(onOpenApprovals).toHaveBeenCalledWith(realSucceededPending);
  });

  it("أزرار الإلغاء/الإعادة على الصفوف الحيّة تعمل وفق الحالة", async () => {
    const onCancel = vi.fn();
    const onRetry = vi.fn();
    render(
      <AgentRunsList
        runs={[realSucceededPending, realFailed]}
        onCancel={onCancel}
        onRetry={onRetry}
      />,
    );
    // «نجح» المنتظر ليس حيًّا فلا إلغاء؛ و«فشل» له إعادة.
    expect(screen.queryByRole("button", { name: /إلغاء/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /إعادة/ }));
    expect(onRetry).toHaveBeenCalledWith(realFailed);
    expect(screen.getByText("فشل")).toHaveAttribute("data-tone", "danger");
    expect(screen.getByText("فشل")).toHaveAttribute("data-shape", "octagon");
  });

  it("④ عدّاد الأدوات الفاشلة = failed + rejected، والمستبعَد عدّادٌ كهرماني منفصل", () => {
    render(<AgentRunsList runs={[realFailed]} />);
    expect(screen.getByTestId("run-tool-failures")).toHaveTextContent("أدوات فشلت: 3");
    expect(screen.getByTestId("run-excluded-tools")).toHaveTextContent("أدوات مستبعدة: 1");
  });

  it("الصفّ الحيّ بلا الحقلَين لا يعرض عدّادًا (لم يُقَس ≠ صفر)", () => {
    render(<AgentRunsList runs={[realSucceededPending]} />);
    expect(screen.queryByTestId("run-tool-failures")).toBeNull();
  });
});

describe("② صفوف المحاكاة — موسومة وبلا أفعال خادم", () => {
  it("الشارة تظهر على كل صفّ وفي رأس القائمة", () => {
    render(<AgentRunsList runs={[simRow(1, "succeeded"), simRow(2, "running")]} />);
    expect(screen.getByTestId("agent-runs-simulation-banner")).toBeInTheDocument();
    // شارةٌ لكل صفّ + واحدة في الرأس.
    expect(screen.getAllByText("بيانات مرجعية — ليست حيّة")).toHaveLength(3);
    expect(document.querySelectorAll('[data-simulation="true"]')).toHaveLength(2);
  });

  it("الإلغاء والإعادة غائبان من شجرة الوصول ولو مُرّرت الأفعال — لا sim-run-N إلى الخادم", () => {
    const onCancel = vi.fn();
    const onRetry = vi.fn();
    render(
      <AgentRunsList
        runs={[simRow(1, "running"), simRow(2, "queued"), simRow(3, "failed")]}
        onCancel={onCancel}
        onRetry={onRetry}
        onDetails={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /إلغاء/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /إعادة/ })).toBeNull();
    // «تفاصيل» عرضٌ محليٌّ لا نداء خادم — يبقى.
    expect(screen.getAllByRole("button", { name: /تفاصيل/ })).toHaveLength(3);
    expect(onCancel).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("③ steps مصفوفةٌ فارغة ⇐ «—» لا فراغ ولا صفر", () => {
    render(<AgentRunsList runs={[simRow(1, "succeeded")]} />);
    expect(screen.getByTestId("run-steps")).toHaveTextContent("— خطوة");
    expect(screen.getByTestId("run-steps")).not.toHaveTextContent("0 خطوة");
  });

  it("رابط الاعتماد لا يُعرض على صفّ محاكاة ولو حمل عدّادًا", () => {
    const sim = { ...simRow(1, "succeeded"), audit_json: { pendingApprovals: { count: 1 } } };
    render(<AgentRunsList runs={[sim]} onOpenApprovals={() => {}} />);
    expect(screen.queryByRole("button", { name: "عرض طلبات الاعتماد" })).toBeNull();
  });

  it("الخلط: صفٌّ حيّ وصفٌّ مرجعي — الشارة على المرجعي وحده", () => {
    render(<AgentRunsList runs={[realSucceededPending, simRow(1, "succeeded")]} />);
    const live = document.querySelector(`[data-run-id="${UUID}"]`)!;
    const sim = document.querySelector('[data-run-id="sim-run-1"]')!;
    expect(within(live as HTMLElement).queryByText("بيانات مرجعية — ليست حيّة")).toBeNull();
    expect(within(sim as HTMLElement).getByText("بيانات مرجعية — ليست حيّة")).toBeInTheDocument();
  });
});

describe("الحالة الفارغة والتسميات", () => {
  it("المصفوفة الفارغة حالةٌ مشروعة بنصّ عربي", () => {
    render(<AgentRunsList runs={[]} />);
    expect(screen.getByTestId("agent-runs-empty")).toHaveTextContent("لا توجد تشغيلات بعد.");
  });

  it("RunStatusBadge يطبع التسمية العربية والشكل لكل حالة — لا النصّ الخام", () => {
    const cases: Array<[string, string, string, string]> = [
      ["queued", "في الطابور", "neutral", "none"],
      ["running", "قيد التشغيل", "info", "none"],
      ["succeeded", "نجح", "success", "circle"],
      ["failed", "فشل", "danger", "octagon"],
      ["cancelled", "أُلغي", "muted", "none"],
      ["pending_approval", "بانتظار الاعتماد", "warning", "triangle"],
      ["waiting_approval", "بانتظار الاعتماد", "warning", "triangle"],
      ["rejected", "رُفض", "muted", "none"],
      ["expired", "انقضت المهلة دون قرار", "muted", "none"],
      ["superseded", "استُبدل بطلب أحدث", "muted", "none"],
      ["rolled_back", "استُرجع", "reverted", "none"],
    ];
    for (const [status, label, tone, shape] of cases) {
      const { unmount } = render(<RunStatusBadge status={status} />);
      const el = screen.getByText(label);
      expect(el).toHaveAttribute("data-tone", tone);
      expect(el).toHaveAttribute("data-shape", shape);
      expect(el).toHaveAttribute("title", status);
      unmount();
    }
  });
});
