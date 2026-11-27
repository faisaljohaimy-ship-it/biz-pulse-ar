// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { FIXTURES as F } from "./harness/clients";
import { asRole, closeDb, db, sqlstateOf, type JwtClaims } from "./harness/db";

afterAll(closeDb);

const adminA = {
  sub: F.ADMIN_A,
  role: "authenticated",
  app_metadata: { current_org: F.ORG_A },
} as const;
const definition = {
  start: "read_offline_assets",
  steps: [
    {
      id: "read_offline_assets",
      kind: "tool",
      toolId: "sql.read",
      input: {
        table: "sec_assets",
        columns: ["id", "code", "name_ar", "name_en", "health", "status", "last_seen_at"],
        filters: { status: "offline" },
        order_by: { column: "last_seen_at", ascending: true },
        limit: 10,
        count_only: false,
      },
    },
  ],
};

async function insertDraft(claims: JwtClaims, changes: Record<string, unknown> = {}) {
  const row = {
    id: randomUUID(),
    name: "Integration draft only",
    description: "Synthetic fixture",
    definition_json: definition,
    version: 1,
    enabled: false,
    owner_id: F.ADMIN_A,
    trigger_topic: null,
    tags: [],
    org_id: F.ORG_A,
    ...changes,
  };
  try {
    return await sqlstateOf(() =>
      asRole(claims, (tx) => tx`insert into public.workflows ${tx(row)}`),
    );
  } finally {
    await db()`delete from public.workflows where id = ${row.id}`;
  }
}

describe("real disabled workflow draft RLS", () => {
  it("allows the owning tenant admin to create the exact disabled read-only draft", async () => {
    expect(await insertDraft(adminA)).toBeNull();
  });

  it.each([
    ["enabled workflow", { enabled: true }],
    ["automatic trigger", { trigger_topic: "test.event" }],
    ["different owner", { owner_id: F.ADMIN_B }],
    ["different tenant", { org_id: F.ORG_B }],
    ["arbitrary tool definition", { definition_json: { start: "execute", steps: [] } }],
    ["extra definition field", { definition_json: { ...definition, unreviewed: true } }],
    ["different version", { version: 2 }],
  ])("rejects %s under authenticated RLS", async (_label, changes) => {
    expect(await insertDraft(adminA, changes as Record<string, unknown>)).toBe("42501");
  });

  it.each([
    ["manager", { ...adminA, sub: F.MANAGER_A }],
    ["viewer", { ...adminA, sub: F.VIEWER_A }],
    [
      "other tenant admin",
      { sub: F.ADMIN_B, role: "authenticated", app_metadata: { current_org: F.ORG_B } },
    ],
    ["anonymous", { role: "anon" }],
  ] as const)("rejects %s even for a valid draft", async (_label, claims) => {
    expect(await insertDraft(claims)).toBe("42501");
  });

  it("detects an injected policy violation and rolls it back", async () => {
    const sentinel = new Error("rollback test mutation");
    let unsafeInsertSucceeded = false;
    try {
      await db().begin(async (tx) => {
        await tx.unsafe(
          "alter policy workflows_disabled_draft_insert_only on public.workflows with check (true)",
        );
        await tx`select set_config('request.jwt.claims', ${JSON.stringify(adminA)}, true)`;
        await tx.unsafe("set local role authenticated");
        await tx`insert into public.workflows
          (id, name, definition_json, version, enabled, owner_id, org_id)
          values (${randomUUID()}, 'Injected violation', '{}'::jsonb, 1, true, ${F.ADMIN_A}, ${F.ORG_A})`;
        unsafeInsertSucceeded = true;
        throw sentinel;
      });
    } catch (error) {
      if (error !== sentinel) throw error;
    }
    expect(unsafeInsertSucceeded).toBe(true);
    // The same real defect must be rejected after restoring the policy.
    expect(await insertDraft(adminA, { enabled: true })).toBe("42501");
  });
});
