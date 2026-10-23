// @vitest-environment node
/**
 * سياسات جداول الوكلاء — بلغة SQL الخالصة، تحت `set local role` و
 * `request.jwt.claims`، على القاعدة التي بنتها الترحيلات نفسها.
 *
 * الفحص بصلاحية superuser يمرّ دائمًا ولا يُثبت شيئًا (قاعدة الاختبار
 * المكتسَبة في CLAUDE.md) — فكل ادّعاء عزلٍ أو امتيازٍ هنا يُقاس بالدور الذي
 * يصل به PostgREST فعلًا. وما يُقاس هو **تعريف** السياسة على صفوفٍ موجودة،
 * لا عدّادًا على متنٍ خاوٍ (قاعدة الفراغ).
 */
import { afterAll, describe, expect, it } from "vitest";
import { FIXTURES as F } from "./harness/clients";
import { asRole, closeDb, db, sqlstateOf } from "./harness/db";

afterAll(async () => {
  await closeDb();
});

const viewerA = {
  sub: F.VIEWER_A,
  role: "authenticated",
  app_metadata: { current_org: F.ORG_A },
} as const;
const adminA = {
  sub: F.ADMIN_A,
  role: "authenticated",
  app_metadata: { current_org: F.ORG_A },
} as const;
const adminB = {
  sub: F.ADMIN_B,
  role: "authenticated",
  app_metadata: { current_org: F.ORG_B },
} as const;
const anon = { role: "anon" } as const;
const service = { role: "service_role" } as const;

describe("policy inventory (definitions, not counters)", () => {
  it("every agent table has RLS enabled and a RESTRICTIVE tenant_isolation_* policy", async () => {
    const tables = [
      "agent_definitions",
      "agent_runs",
      "workflows",
      "workflow_runs",
      "workflow_step_runs",
      "tool_registry",
      "tool_executions",
      "audit_logs",
      "enterprise_events",
    ];
    const rls = await db()<
      Array<{ relname: string; relrowsecurity: boolean }>
    >`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname = any(${tables})`;
    expect(rls.map((r) => r.relname).sort()).toEqual([...tables].sort());
    expect(rls.every((r) => r.relrowsecurity)).toBe(true);

    const restrictive = await db()<
      Array<{ tablename: string; policyname: string; qual: string }>
    >`select tablename, policyname, qual from pg_policies where schemaname = 'public' and permissive = 'RESTRICTIVE' and tablename = any(${tables})`;
    expect(restrictive.map((p) => p.tablename).sort()).toEqual([...tables].sort());
    for (const p of restrictive) {
      expect(p.policyname).toBe(`tenant_isolation_${p.tablename}`);
      expect(p.qual).toContain("is_org_member(org_id, 'viewer'::org_role)");
    }
  });

  it("authenticated holds only SELECT (plus REFERENCES/TRIGGER/TRUNCATE) on the orchestration tables", async () => {
    const grants = await db()<
      Array<{ table_name: string; privs: string }>
    >`select table_name, string_agg(privilege_type, ',' order by privilege_type) as privs
       from information_schema.role_table_grants
       where table_schema = 'public' and grantee = 'authenticated'
         and table_name in ('agent_runs','tool_executions','workflow_runs','workflow_step_runs','enterprise_events')
       group by table_name order by table_name`;
    expect(grants).toHaveLength(5);
    for (const g of grants) {
      expect(g.privs).toBe("REFERENCES,SELECT,TRIGGER,TRUNCATE");
    }
  });

  it("tool_executions status check admits the full lifecycle vocabulary", async () => {
    const [c] = await db()<
      Array<{ def: string }>
    >`select pg_get_constraintdef(oid) as def from pg_constraint where conrelid = 'public.tool_executions'::regclass and conname = 'tool_executions_status_check'`;
    for (const s of [
      "queued",
      "running",
      "succeeded",
      "failed",
      "rolled_back",
      "pending_approval",
      "rejected",
      "cancelled",
      "expired",
      "superseded",
    ]) {
      expect(c!.def).toContain(`'${s}'`);
    }
  });
});

describe("tenant isolation under `set local role authenticated`", () => {
  it("viewer A sees only org A agent_runs; admin B only org B; anon nothing; service_role both", async () => {
    const seenA = await asRole(
      viewerA,
      (tx) => tx<Array<{ org_id: string }>>`select org_id from agent_runs`,
    );
    expect(seenA.length).toBeGreaterThan(0);
    expect(seenA.every((r) => r.org_id === F.ORG_A)).toBe(true);

    const seenB = await asRole(
      adminB,
      (tx) => tx<Array<{ id: string; org_id: string }>>`select id, org_id from agent_runs`,
    );
    expect(seenB.map((r) => r.id)).toContain(F.RUN_B);
    expect(seenB.every((r) => r.org_id === F.ORG_B)).toBe(true);

    const seenAnon = await asRole(
      anon,
      (tx) => tx<Array<{ id: string }>>`select id from agent_runs`,
    );
    expect(seenAnon).toEqual([]);

    const seenService = await asRole(
      service,
      (tx) =>
        tx<
          Array<{ org_id: string }>
        >`select distinct org_id from agent_runs where org_id in (${F.ORG_A}, ${F.ORG_B}) order by 1`,
    );
    expect(seenService.map((r) => r.org_id)).toEqual([F.ORG_A, F.ORG_B]);
  });

  it("sec_incidents: viewer A reads INT-A-* only; admin B reads INT-B-* only", async () => {
    const a = await asRole(
      viewerA,
      (tx) =>
        tx<
          Array<{ ref: string }>
        >`select ref from sec_incidents where ref like 'INT-%' order by ref`,
    );
    expect(a.map((r) => r.ref)).toEqual(["INT-A-1", "INT-A-2"]);
    const b = await asRole(
      adminB,
      (tx) =>
        tx<
          Array<{ ref: string }>
        >`select ref from sec_incidents where ref like 'INT-%' order by ref`,
    );
    expect(b.map((r) => r.ref)).toEqual(["INT-B-1", "INT-B-2"]);
  });

  it("current_org_id() reads the claim, else the single membership, else NULL", async () => {
    const [withClaim] = await asRole(
      adminA,
      (tx) => tx<Array<{ org: string | null }>>`select current_org_id() as org`,
    );
    expect(withClaim!.org).toBe(F.ORG_A);
    const [noClaim] = await asRole(
      { sub: F.ADMIN_B, role: "authenticated" },
      (tx) => tx<Array<{ org: string | null }>>`select current_org_id() as org`,
    );
    expect(noClaim!.org).toBe(F.ORG_B);
    // بلا sub (جلسةٌ مصادَقة بلا هوية): لا عضوية ⇐ NULL لا أوّل صفّ.
    const [noSub] = await asRole(
      { role: "authenticated" },
      (tx) => tx<Array<{ org: string | null }>>`select current_org_id() as org`,
    );
    expect(noSub!.org).toBeNull();
    // و`anon` لا يملك EXECUTE عليها أصلًا (42501) — الزائر لا يسأل عن مؤسسة.
    const anonCall = await sqlstateOf(() => asRole(anon, (tx) => tx`select current_org_id()`));
    expect(anonCall).toBe("42501");
  });

  it("user writes to agent_runs / tool_executions fail at the GRANT layer (42501) — even for an org admin with a matching policy", async () => {
    const insertRun = await sqlstateOf(() =>
      asRole(
        adminA,
        (tx) =>
          tx`insert into agent_runs (agent_id, org_id, status, triggered_by) values (${F.AGENT}, ${F.ORG_A}, 'queued', ${F.ADMIN_A})`,
      ),
    );
    expect(insertRun).toBe("42501");

    // سياسة tool_exec_admin_update موجودة للمسؤول — والامتياز مسحوب قبلها.
    const update = await sqlstateOf(() =>
      asRole(
        adminA,
        (tx) =>
          tx`update tool_executions set status = 'queued' where org_id = ${F.ORG_A} and status = 'pending_approval'`,
      ),
    );
    expect(update).toBe("42501");
  });
});

describe("conditional-update claim semantics (what decideApproval/executeTool rely on)", () => {
  it("pending_approval → queued → running each wins exactly once; the second claimant gets zero rows", async () => {
    const [row] = await db()<
      Array<{ id: string }>
    >`insert into tool_executions (tool_id, actor_id, org_id, status, input_json)
       values ('sec.create_incident', ${F.ADMIN_A}, ${F.ORG_A}, 'pending_approval', '{"fixture":"claim"}'::jsonb)
       returning id`;
    const id = row!.id;

    const approve1 = await db()<
      Array<{ id: string }>
    >`update tool_executions set status = 'queued', approved_by = ${F.ADMIN_A}, approved_at = now() where id = ${id} and status = 'pending_approval' returning id`;
    const approve2 = await db()<
      Array<{ id: string }>
    >`update tool_executions set status = 'queued', approved_by = ${F.ADMIN_A}, approved_at = now() where id = ${id} and status = 'pending_approval' returning id`;
    expect(approve1).toHaveLength(1);
    expect(approve2).toHaveLength(0);

    const claim1 = await db()<
      Array<{ id: string }>
    >`update tool_executions set status = 'running', started_at = now(), attempt = 1 where id = ${id} and tool_id = 'sec.create_incident' and org_id = ${F.ORG_A} and status = 'queued' returning id`;
    const claim2 = await db()<
      Array<{ id: string }>
    >`update tool_executions set status = 'running', started_at = now(), attempt = 1 where id = ${id} and tool_id = 'sec.create_incident' and org_id = ${F.ORG_A} and status = 'queued' returning id`;
    expect(claim1).toHaveLength(1);
    expect(claim2).toHaveLength(0);

    // الانقضاء لا يدوس قرارًا وقع: الشرط المكرَّر يعيد صفرًا.
    const expire = await db()<
      Array<{ id: string }>
    >`update tool_executions set status = 'expired' where id = ${id} and status = 'pending_approval' returning id`;
    expect(expire).toHaveLength(0);

    const [final] = await db()<
      Array<{ status: string }>
    >`select status from tool_executions where id = ${id}`;
    expect(final!.status).toBe("running");

    // الحالة خارج المعجم تُرفض بالقيد نفسه، لا بالكود.
    const bad = await sqlstateOf(
      () => db()`update tool_executions set status = 'approved' where id = ${id}`,
    );
    expect(bad).toBe("23514");

    await db()`delete from tool_executions where id = ${id}`;
  });

  it("the live-run guard: finalize succeeds once on a running row and never on a cancelled one", async () => {
    const [run] = await db()<
      Array<{ id: string }>
    >`insert into agent_runs (agent_id, org_id, status, triggered_by) values (${F.AGENT}, ${F.ORG_A}, 'running', ${F.ADMIN_A}) returning id`;
    const cancel = await db()<
      Array<{ id: string }>
    >`update agent_runs set status = 'cancelled', error = 'Cancelled by operator', finished_at = now() where id = ${run!.id} and status in ('queued','running') returning id`;
    expect(cancel).toHaveLength(1);
    const finalize = await db()<
      Array<{ id: string }>
    >`update agent_runs set status = 'succeeded', summary = 'late' where id = ${run!.id} and status in ('queued','running') returning id`;
    expect(finalize).toHaveLength(0);
    const [final] = await db()<
      Array<{ status: string }>
    >`select status from agent_runs where id = ${run!.id}`;
    expect(final!.status).toBe("cancelled");
    await db()`delete from agent_runs where id = ${run!.id}`;
  });
});
