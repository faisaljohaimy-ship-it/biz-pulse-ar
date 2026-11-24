import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { WorkflowDraftSaveInput } from "./workflow-drafts.functions";
import { previewWorkflowDraft } from "./workflow-draft-template";
import { audit } from "./audit.server";
import { matchesWorkflowDraft, saveDisabledWorkflowDraft } from "./workflow-drafts.server";

vi.mock("./audit.server", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("./workflow-engine.server", () => ({
  WorkflowDefinitionSchema: { safeParse: () => ({ success: true }) },
}));
const input: WorkflowDraftSaveInput = {
  draftId: "11111111-1111-4111-8111-111111111111",
  orgId: "00000000-0000-0000-0000-000000000001",
  request: "offline asset diagnostic draft",
  limit: 20,
};
const userId = "22222222-2222-4222-8222-222222222222";
const makeExpected = () => {
  const preview = previewWorkflowDraft(input);
  if (!preview.ok) throw new Error("fixture invalid");
  return {
    id: input.draftId,
    name: "Offline asset diagnostic draft",
    description: "Disabled diagnostic draft. No execution or activation is approved.",
    definition_json: JSON.parse(JSON.stringify(preview.preview.definition)),
    org_id: input.orgId,
    owner_id: userId,
    enabled: false,
    trigger_topic: null,
    version: 1,
    tags: ["draft", "offline-assets"],
  };
};
const makeRow = () => ({
  ...makeExpected(),
  created_at: "2026-11-24T16:00:00Z",
  updated_at: "2026-11-24T16:00:00Z",
});
type Reply = { data: unknown; error: { code?: string } | null };
const ok = (data: unknown): Reply => ({ data, error: null });
function client(
  options: {
    admin?: boolean;
    membership?: { role: string } | null;
    reads?: Array<Reply | Error>;
    insert?: Reply | Error;
  } = {},
) {
  const reads = [...(options.reads ?? [ok(null), ok(makeRow())])];
  const calls: Array<{ table: string; filters: Array<[string, unknown]>; row?: unknown }> = [];
  const rpc = vi.fn(() => ({ abortSignal: vi.fn(async () => ok(options.admin ?? true)) }));
  const from = vi.fn((table: string) => {
    const call = { table, filters: [] as Array<[string, unknown]>, row: undefined as unknown };
    calls.push(call);
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((field: string, value: unknown) => {
        call.filters.push([field, value]);
        return builder;
      }),
      insert: vi.fn((row: unknown) => {
        call.row = row;
        return builder;
      }),
      abortSignal: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => {
        const reply =
          table === "org_members"
            ? ok("membership" in options ? options.membership : { role: "operator" })
            : reads.shift();
        if (reply instanceof Error) throw reply;
        return reply;
      }),
      then: (resolve: (value: Reply) => unknown, reject: (error: unknown) => unknown) => {
        const reply = options.insert ?? ok(null);
        return reply instanceof Error
          ? Promise.reject(reply).then(resolve, reject)
          : Promise.resolve(reply).then(resolve, reject);
      },
    };
    return builder;
  });
  return { supabase: { from, rpc } as unknown as SupabaseClient<Database>, from, rpc, calls };
}
beforeEach(() => vi.clearAllMocks());

describe("disabled workflow draft save boundary", () => {
  it("constructs a disabled caller-owned row and returns only its matching persisted receipt", async () => {
    const db = client();
    const result = await saveDisabledWorkflowDraft(db.supabase, userId, input);
    expect(result).toMatchObject({
      status: "saved",
      receipt: {
        id: input.draftId,
        orgId: input.orgId,
        ownerId: userId,
        enabled: false,
        version: 1,
        replayed: false,
      },
    });
    expect(db.rpc).toHaveBeenCalledWith("has_role", { _user_id: userId, _role: "admin" });
    expect(db.calls.filter((call) => call.row)).toEqual([
      { table: "workflows", filters: [], row: makeExpected() },
    ]);
    for (const call of db.calls.filter((call) => call.table === "workflows" && !call.row))
      expect(call.filters).toEqual([
        ["id", input.draftId],
        ["org_id", input.orgId],
        ["owner_id", userId],
      ]);
  });

  it.each([{ admin: false }, { membership: null }, { membership: { role: "viewer" } }])(
    "refuses missing current authority before any insert: %j",
    async (options) => {
      const db = client(options);
      expect(await saveDisabledWorkflowDraft(db.supabase, userId, input)).toEqual({
        status: "forbidden",
        draftId: input.draftId,
      });
      expect(db.calls.some((call) => call.row)).toBe(false);
    },
  );

  it("rejects unsupported intent before authorization or data access", async () => {
    const db = client();
    expect(
      await saveDisabledWorkflowDraft(db.supabase, userId, {
        ...input,
        request: "create a review task",
      }),
    ).toEqual({ status: "invalid_request", draftId: input.draftId });
    expect(db.from).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("same-ID retry returns the exact existing disabled row without an insert", async () => {
    const db = client({ reads: [ok(makeRow())] });
    expect(await saveDisabledWorkflowDraft(db.supabase, userId, input)).toMatchObject({
      status: "saved",
      receipt: { replayed: true },
    });
    expect(db.calls.some((call) => call.row)).toBe(false);
  });

  it.each([
    "enabled",
    "owner",
    "organization",
    "definition",
    "extra-step",
    "version",
    "topic",
    "tags",
  ])("never acknowledges a mismatching existing %s", async (mutation) => {
    const row = makeRow();
    if (mutation === "enabled") row.enabled = true;
    if (mutation === "owner") row.owner_id = "someone-else";
    if (mutation === "organization") row.org_id = "another-org";
    if (mutation === "definition") row.definition_json.extra = true;
    if (mutation === "extra-step")
      row.definition_json.steps.push({ kind: "tool", toolId: "rest.http" });
    if (mutation === "version") row.version = 2;
    if (mutation === "topic") Object.assign(row, { trigger_topic: "runtime.start" });
    if (mutation === "tags") row.tags = ["not-a-draft"];
    const db = client({ reads: [ok(row)] });
    expect(await saveDisabledWorkflowDraft(db.supabase, userId, input)).toEqual({
      status: "conflict",
      draftId: input.draftId,
    });
    expect(db.calls.some((call) => call.row)).toBe(false);
  });

  it("reads back after ambiguous transport without a second insert", async () => {
    const db = client({ insert: new Error("connection lost") });
    expect(await saveDisabledWorkflowDraft(db.supabase, userId, input)).toMatchObject({
      status: "saved",
      receipt: { replayed: true },
    });
    expect(db.calls.filter((call) => call.row)).toHaveLength(1);
  });

  it.each([ok(null), { data: null, error: { code: "read_denied" } }, new Error("read timeout")])(
    "returns unconfirmed when the post-insert row cannot be verified",
    async (readback) => {
      const db = client({ reads: [ok(null), readback] });
      expect(await saveDisabledWorkflowDraft(db.supabase, userId, input)).toEqual({
        status: "unconfirmed",
        draftId: input.draftId,
      });
      expect(db.calls.filter((call) => call.row)).toHaveLength(1);
    },
  );

  it("JSONB key ordering is accepted but extra fields and malformed timestamps are rejected", () => {
    const expected = makeExpected();
    const row = makeRow();
    const original = row.definition_json;
    row.definition_json = { steps: original.steps, start: original.start };
    expect(matchesWorkflowDraft(row, expected)).toBe(true);
    expect(matchesWorkflowDraft({ ...row, unexplained: true }, expected)).toBe(false);
    expect(matchesWorkflowDraft({ ...row, created_at: "not-a-date" }, expected)).toBe(false);
  });
  it("does not withhold a verified receipt when audit hangs or ignores its abort signal", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(audit).mockImplementationOnce(() => new Promise<void>(() => undefined));
      const db = client();
      const saving = saveDisabledWorkflowDraft(db.supabase, userId, input);
      await vi.advanceTimersByTimeAsync(1600);
      expect(await saving).toMatchObject({ status: "saved", receipt: { id: input.draftId } });
      expect(vi.mocked(audit).mock.calls[0][2]?.signal?.aborted).toBe(true);
      expect(db.calls.filter((call) => call.row)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
  it("keeps the confirmed receipt when the best-effort audit rejects", async () => {
    vi.mocked(audit).mockRejectedValueOnce(new Error("audit transport failed"));
    const db = client();
    expect(await saveDisabledWorkflowDraft(db.supabase, userId, input)).toMatchObject({
      status: "saved",
    });
  });
});
