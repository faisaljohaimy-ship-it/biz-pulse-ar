// @vitest-environment node
/**
 * «استدعاء الوكيل من FINN» — بند قبول المالك: حزام أدوات الدردشة الحقيقي
 * (`buildSadeedTools`) يشغّل وكيلًا عبر `dispatch_agent` خلف بوابة التأكيد
 * البشري من خطوتين (HMAC + AES-GCM على `finn_actions_log`)، على المكدّس
 * الحقيقي، ثم يقرأ حالته عبر `execution_status` تحت RLS المستخدم.
 *
 * الخطوة ١: رسالةٌ ليست تأكيدًا ⇐ اقتراحٌ مختوم، لا تشغيل. الخطوة ٢: «نعم» في
 * طلبٍ لاحق بالوسائط نفسها ⇐ تشغيلٌ واحد. الخطوة ٣: «نعم» مرّةً أخرى ⇐ لا
 * تشغيل ثانٍ (المطالبة مستهلَكة). النموذج وحده مُبرمَج (مزوّد Gemini).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const h = vi.hoisted(() => ({
  model: null as unknown,
}));

vi.mock("@/lib/sadeed/gemini-provider.server", () => ({
  resolveSadeedGeminiRuntime: () => ({
    provider: () => h.model,
    modelId: "mock-integration",
    vendor: "google-gemini",
  }),
  resolveSadeedGeminiRuntimes: () => [
    { provider: () => h.model, modelId: "mock-integration", vendor: "google-gemini" },
  ],
}));

import { userClient, FIXTURES as F } from "./harness/clients";
import { closeDb, db } from "./harness/db";
import { marker, operationsScript, scriptedModel } from "./harness/scripted-model";

type ToolLike = {
  execute: (input: Record<string, unknown>, options: unknown) => Promise<unknown>;
};
type Toolbelt = Record<string, ToolLike>;

const callOptions = { toolCallId: "t1", messages: [] };

let adminUserA: SupabaseClient;
let buildSadeedTools: typeof import("@/lib/sadeed-tools.server").buildSadeedTools;

const belt = (lastUserText: string, agentsAvailable = true): Toolbelt =>
  buildSadeedTools(adminUserA, F.ADMIN_A, {
    lastUserText,
    orgId: F.ORG_A,
    agentsAvailable,
  }) as unknown as Toolbelt;

const GOAL = `راقب بلاغات اليوم واقترح الاستجابة — ${marker("finn")}`;
const ARGS = { agentId: F.AGENT, goal: GOAL };
// الرقم العابر لاقتراح الخطوة ١ — يحصر قراءات السجلّ في هذا السيناريو وحده.
let proposalNonce = "";

beforeAll(async () => {
  expect((process.env.SADEED_MESSAGE_APPROVAL_SECRET ?? "").length).toBeGreaterThanOrEqual(32);
  adminUserA = await userClient({ sub: F.ADMIN_A, org: F.ORG_A });
  ({ buildSadeedTools } = await import("@/lib/sadeed-tools.server"));
});

afterAll(async () => {
  await closeDb();
});

const runsForGoal = () =>
  db()<
    Array<{
      id: string;
      status: string;
      triggered_by: string;
      org_id: string;
      context_json: unknown;
    }>
  >`select id, status, triggered_by, org_id, context_json from agent_runs where goal_override = ${GOAL} order by started_at`;

describe("FINN → agent dispatch through the real chat toolbelt", () => {
  it("dispatch_agent exists only when the turn says agents are available", () => {
    expect(belt("x", false).dispatch_agent).toBeUndefined();
    expect(belt("x", true).dispatch_agent).toBeDefined();
    expect(belt("x", true).execution_status).toBeDefined();
  });

  it("step 1 — a request that is not a confirmation yields a sealed proposal and starts nothing", async () => {
    const scripted = scriptedModel(operationsScript(marker("finn-1")));
    h.model = scripted.model;
    const reply = (await belt("شغّل وكيل العمليات على بلاغات اليوم").dispatch_agent.execute(
      ARGS,
      callOptions,
    )) as Record<string, unknown>;
    expect(reply).toMatchObject({
      ok: false,
      executed: false,
      status: "requires_confirmation",
    });
    expect(String(reply.action_summary)).toContain("وكيل العمليات");
    expect(String(reply.next_step)).toMatch(/Nothing was written/);
    expect(scripted.calls).toBe(0);
    expect(await runsForGoal()).toEqual([]);

    const proposals = await db()<
      Array<{ org_id: string; input: { tool: string; nonce?: string; seal?: string } }>
    >`select org_id, input from finn_actions_log where user_id = ${F.ADMIN_A} and action = 'chat.write.confirmation_requested' and input->>'tool' = 'dispatch_agent' order by created_at desc limit 1`;
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.org_id).toBe(F.ORG_A);
    expect(proposals[0]!.input.nonce).toBeTruthy();
    proposalNonce = proposals[0]!.input.nonce!;
    expect(proposals[0]!.input.seal).toBeTruthy();
  });

  it("step 2 — an explicit «نعم» in the next request with the same arguments runs the agent exactly once", async () => {
    const scripted = scriptedModel(operationsScript(marker("finn-2")));
    h.model = scripted.model;
    const reply = (await belt("نعم").dispatch_agent.execute(ARGS, callOptions)) as {
      ok: boolean;
      executed: boolean;
      run: {
        id: string;
        status: string;
        summary: string;
        steps: number;
        pendingApprovals?: number;
      };
    };
    expect(reply.ok).toBe(true);
    expect(reply.executed).toBe(true);
    expect(reply.run).toMatchObject({ status: "succeeded", steps: 3, pendingApprovals: 1 });
    expect(reply.run.summary).toMatch(/Actions awaiting human approval: 1/);
    expect(scripted.calls).toBe(3);

    const runs = await runsForGoal();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      id: reply.run.id,
      status: "succeeded",
      triggered_by: F.ADMIN_A,
      org_id: F.ORG_A,
      context_json: { source: "chat.dispatch_agent" },
    });
    const execs = await db()<
      Array<{ tool_id: string; status: string; org_id: string }>
    >`select tool_id, status, org_id from tool_executions where agent_run_id = ${reply.run.id} order by created_at`;
    expect(execs).toEqual([
      { tool_id: "sql.read", status: "succeeded", org_id: F.ORG_A },
      { tool_id: "sec.create_incident", status: "pending_approval", org_id: F.ORG_A },
    ]);

    const ledger = await db()<
      Array<{ action: string }>
    >`select action from finn_actions_log where user_id = ${F.ADMIN_A} and input->>'tool' = 'dispatch_agent' and action in ('chat.write.confirmed','chat.write.executed') and input->>'nonce' = ${proposalNonce} order by created_at`;
    expect(ledger.map((r) => r.action)).toEqual(["chat.write.confirmed", "chat.write.executed"]);
  });

  it("step 3 — repeating the confirmation does not start a second run (replay refused)", async () => {
    const scripted = scriptedModel(operationsScript(marker("finn-3")));
    h.model = scripted.model;
    const reply = (await belt("نعم").dispatch_agent.execute(ARGS, callOptions)) as Record<
      string,
      unknown
    >;
    expect(reply).toMatchObject({ ok: false, executed: false, status: "already_executed" });
    expect(scripted.calls).toBe(0);
    expect(await runsForGoal()).toHaveLength(1);
  });

  it("execution_status (user RLS) returns that run and its pending execution", async () => {
    const [run] = await runsForGoal();
    const status = (await belt("ما حالة الوكلاء؟").execution_status.execute({}, callOptions)) as {
      ok: boolean;
      visibility: string;
      agent_runs: Array<{ id: string; status: string }>;
      active_tool_executions: Array<{ agent_run_id: string | null; tool_id: string | null }>;
    };
    expect(status.ok).toBe(true);
    expect(status.visibility).toBe("caller_rls");
    expect(status.agent_runs.find((r) => r.id === run!.id)).toMatchObject({ status: "succeeded" });
    expect(status.active_tool_executions.find((e) => e.agent_run_id === run!.id)).toMatchObject({
      tool_id: "sec.create_incident",
    });
  });

  it("a viewer (no platform role) is refused before any proposal is written", async () => {
    const viewer = await userClient({ sub: F.VIEWER_A, org: F.ORG_A });
    const tools = buildSadeedTools(viewer, F.VIEWER_A, {
      lastUserText: "شغّل وكيل العمليات",
      orgId: F.ORG_A,
      agentsAvailable: true,
    }) as unknown as Toolbelt;
    const reply = (await tools.dispatch_agent.execute(ARGS, callOptions)) as Record<
      string,
      unknown
    >;
    expect(reply).toMatchObject({
      ok: false,
      error: "Forbidden: missing role for agent operations",
    });
    const proposals = await db()<
      Array<{ n: number }>
    >`select count(*)::int as n from finn_actions_log where user_id = ${F.VIEWER_A} and input->>'tool' = 'dispatch_agent'`;
    expect(proposals[0]!.n).toBe(0);
  });
});
