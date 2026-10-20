// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "./command.server";

const execute = vi.hoisted(() => vi.fn());
vi.mock("@/lib/exec/tool-orchestrator.server", () => ({ executeTool: execute }));
vi.mock("@/lib/exec/audit.server", () => ({ audit: vi.fn(async () => undefined) }));
import { dispatchFnnTask, readCommandOverview, resolveCommandOrg } from "./command.server";

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";
type Query = { table: string; filters: Array<[string, unknown]>; columns?: string };
function fixture(overrides: Record<string, unknown> = {}) {
  const calls: Query[] = [];
  const rows: Record<string, unknown> = {
    org_members: [{ org_id: ORG }],
    tool_registry: [
      { id: "sql.read", name: "قراءة", enabled: true, requires_approval: false, schema_json: {} },
    ],
    tool_executions: [],
    ...overrides,
  };
  const context = {
    userId: USER,
    supabase: {
      from(table: string) {
        const q: Query = { table, filters: [] };
        let single = false;
        const b = {
          select(columns: string) {
            q.columns = columns;
            return b;
          },
          eq(column: string, value: unknown) {
            q.filters.push([column, value]);
            return b;
          },
          in(column: string, value: unknown) {
            q.filters.push([column, value]);
            return b;
          },
          order() {
            return b;
          },
          limit() {
            return b;
          },
          maybeSingle() {
            single = true;
            return b;
          },
          abortSignal() {
            return b;
          },
          then(resolve: (value: unknown) => unknown) {
            calls.push(q);
            const data = rows[table];
            return Promise.resolve({
              data: single && Array.isArray(data) ? data[0] : data,
              error: null,
            }).then(resolve);
          },
        };
        return b;
      },
    },
  } as unknown as CommandContext;
  return { context, calls };
}

beforeEach(() => {
  execute.mockReset();
  execute.mockResolvedValue({ executionId: "execution", status: "pending_approval" });
});

describe("SADEED → FNN authenticated handoff", () => {
  it("rejects an unverified tenant before reading histories or dispatching", async () => {
    const f = fixture();
    await expect(readCommandOverview(f.context, { orgId: OTHER })).rejects.toThrow(/عضوية/);
    expect(f.calls.map((q) => q.table)).toEqual(["org_members"]);
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not infer a multi-tenant scope from editable user metadata", async () => {
    const f = fixture({ org_members: [{ org_id: ORG }, { org_id: OTHER }] });
    f.context.claims = { user_metadata: { current_org: ORG } };
    await expect(resolveCommandOrg(f.context)).rejects.toThrow(/اختر مؤسسة/);
  });

  it("scopes histories to both verified org and caller, and reports an unmeasured success rate", async () => {
    const f = fixture();
    const result = await readCommandOverview(f.context, {});
    const history = f.calls.find((q) => q.table === "tool_executions");
    expect(history).toBeDefined();
    expect(history?.filters).toEqual(
      expect.arrayContaining([
        ["org_id", ORG],
        ["actor_id", USER],
      ]),
    );
    expect(history?.columns).not.toMatch(/input_json|output_json|actor_id/);
    expect(result.metrics).toMatchObject({ sampleSize: 0, successRate: null });
    expect(result.source).toBe("database");
  });

  it.each([
    "rest.http",
    "webhook.dispatch",
    "supabase.invoke_edge_function",
    "github.push",
    "sql.delete",
  ])("rejects non-allowlisted %s before I/O", async (toolId) => {
    const f = fixture();
    await expect(
      dispatchFnnTask(f.context, { toolId, input: {}, objective: "نفّذ المهمة" }),
    ).rejects.toThrow();
    expect(f.calls).toHaveLength(0);
    expect(execute).not.toHaveBeenCalled();
  });

  it("forwards the verified tenant and server-generated correlation with compulsory write approval", async () => {
    const f = fixture({ tool_registry: [{ id: "sec.create_incident", enabled: true }] });
    const result = await dispatchFnnTask(f.context, {
      toolId: "sec.create_incident",
      input: { title_ar: "بلاغ جديد", severity: "low" },
      objective: "تنسيق البلاغ",
    });
    expect(execute).toHaveBeenCalledOnce();
    expect(execute.mock.calls[0][1]).toMatchObject({
      actorId: USER,
      orgId: ORG,
      requireApproval: true,
      retry: { max: 0, baseMs: 0 },
      correlationId: result.taskId,
    });
    expect(execute.mock.calls[0][1]).not.toHaveProperty("preApproved");
    expect(result).toMatchObject({
      coordinator: "sadeed",
      executor: "fnn",
      status: "pending_approval",
    });
  });

  it("rejects client-provided approval bypass flags", async () => {
    const f = fixture();
    await expect(
      dispatchFnnTask(f.context, {
        toolId: "sql.read",
        input: {},
        objective: "قراءة البيانات",
        preApproved: true,
      }),
    ).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
});
