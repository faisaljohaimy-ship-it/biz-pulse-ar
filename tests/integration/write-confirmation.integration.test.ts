// @vitest-environment node
/**
 * سجلّ تأكيد الكتابة (`finn_actions_log`) كضمانة «مرّة واحدة على الأكثر» — على
 * القاعدة الحقيقية، لا نموذج هنا إطلاقًا.
 *
 * `claimConfirmation` (src/lib/sadeed/write-confirmation.server.ts) يُدرج صفّ
 * `chat.write.confirmed` أثرًا ثم **ينتخب** الفائز بالدالة الذرّية
 * `check_rate_limit('wc-claim:<user>:<nonce>', 1, نافذة)` — `first` منها وحدها.
 * (كان القرار استنتاجَ ترتيب «أقدم صفٍّ مرئي بـ(created_at, id)» بلا قيدٍ فريد،
 * وقد قِيس أنه يعيد `first:true` لنداءين: معاملةٌ بدأت أبكر وتُتمّ أبطأ.) هذا
 * الملف يثبت الانتخاب الذرّي تحت أسوأ الحالات المصنَّعة — إتمامٌ متأخر،
 * وتعادل زمني، وتزامن، وفشل السجلّ أو الانتخاب — ويحرس ألّا يعود الاستنتاج.
 *
 * حقن العطب (للقاعدة المؤقتة وحدها، تُنشأ في beforeAll وتُسقط في afterAll):
 *   • `it_wc_fault` — مشغّل BEFORE INSERT على finn_actions_log، لا يعمل إلا لصفوف
 *     الأداة `it_write_confirmation` (مطالبات الترتيب) أو لمفاتيح جدول
 *     `it_wc_fault_switch` (فشل الكتابة بحسب الفعل والمستخدم):
 *       - turn = `slow-*`  ⇐ ينام 0.8 ث قبل الإتمام: معاملةٌ بدأت مبكرًا (created_at
 *         = بداية المعاملة) وتُتمّ متأخرة — كما لو تأخّر الإتمام في الشبكة/القفل.
 *       - turn = `tie-<uuid>` ⇐ يثبّت created_at ويفرض id: تعادلٌ مقصود في الزمن.
 *   • `it_wc_bucket_fault` على `rate_limit_buckets`: يفشل انتخاب `wc-claim:<user>:*`
 *     (عطل الدالة الذرّية).
 *   • مشغّل على `tasks` يفشل لعنوانٍ يبدأ بـ`IT-WC-FAIL` (كتابةٌ تفشل بعد المطالبة).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLAIM_ELECTION_WINDOW_SECONDS,
  claimConfirmation,
  openConfirmationDetails,
  recordPendingConfirmation,
  sealConfirmationDetails,
  signWriteConfirmation,
  verifyWriteConfirmation,
  writeConfirmationArgsHash,
  WRITE_CONFIRMATION_TTL_MS,
} from "@/lib/sadeed/write-confirmation.server";
import { adminClient, userClient, FIXTURES as F } from "./harness/clients";
import { closeDb, db } from "./harness/db";

const TOOL = "it_write_confirmation";

/* ------------------------------ fault injection ------------------------------ */

const FAULT_SQL = `
create table if not exists public.it_wc_fault_switch (
  kind text not null,
  match_user uuid not null,
  primary key (kind, match_user)
);
create or replace function public.it_wc_fault() returns trigger
language plpgsql security definer set search_path = public as $$
declare t text := new.input->>'turn';
begin
  if new.action = 'chat.write.confirmed' and new.input->>'tool' = '${TOOL}' then
    if t like 'slow-%' then perform pg_sleep(0.8); end if;
    if t like 'tie-%' then
      new.created_at := timestamptz '2026-01-01 00:00:00+00';
      new.id := substr(t, 5)::uuid;
    end if;
  end if;
  if exists (select 1 from public.it_wc_fault_switch s
              where s.kind = new.action and s.match_user = new.user_id) then
    raise exception 'it_wc_fault: injected ledger failure for %', new.action;
  end if;
  return new;
end $$;
drop trigger if exists it_wc_fault on public.finn_actions_log;
create trigger it_wc_fault before insert on public.finn_actions_log
  for each row execute function public.it_wc_fault();
create or replace function public.it_wc_bucket_fault() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.it_wc_fault_switch s
              where s.kind = 'check_rate_limit'
                and new.bucket_key like 'wc-claim:' || s.match_user::text || ':%') then
    raise exception 'it_wc_fault: injected election failure';
  end if;
  return new;
end $$;
drop trigger if exists it_wc_bucket_fault on public.rate_limit_buckets;
create trigger it_wc_bucket_fault before insert or update on public.rate_limit_buckets
  for each row execute function public.it_wc_bucket_fault();
create or replace function public.it_wc_tasks_fault() returns trigger
language plpgsql as $$
begin
  if new.title like 'IT-WC-FAIL%' then
    raise exception 'it_wc_fault: injected task write failure';
  end if;
  return new;
end $$;
drop trigger if exists it_wc_tasks_fault on public.tasks;
create trigger it_wc_tasks_fault before insert on public.tasks
  for each row execute function public.it_wc_tasks_fault();
`;

const UNFAULT_SQL = `
drop trigger if exists it_wc_fault on public.finn_actions_log;
drop trigger if exists it_wc_tasks_fault on public.tasks;
drop trigger if exists it_wc_bucket_fault on public.rate_limit_buckets;
drop function if exists public.it_wc_bucket_fault();
drop function if exists public.it_wc_fault();
drop function if exists public.it_wc_tasks_fault();
drop table if exists public.it_wc_fault_switch;
`;

async function withFault<T>(kind: string, userId: string, fn: () => Promise<T>): Promise<T> {
  await db()`insert into public.it_wc_fault_switch (kind, match_user) values (${kind}, ${userId}) on conflict do nothing`;
  try {
    return await fn();
  } finally {
    await db()`delete from public.it_wc_fault_switch where kind = ${kind} and match_user = ${userId}`;
  }
}

/* --------------------------------- helpers --------------------------------- */

const rand = () => Math.random().toString(36).slice(2, 8);
const newNonce = (label: string) => `it-wc-${label}-${Date.now().toString(36)}-${rand()}`;

type Claim = Awaited<ReturnType<typeof claimConfirmation>>;
const claim = (turn: string, nonce: string): Promise<Claim> =>
  claimConfirmation({
    userId: F.ADMIN_A,
    orgId: F.ORG_A,
    tool: TOOL,
    turn,
    nonce,
    argsHash: "it-args-hash",
  });
const isFirst = (c: Claim) => c.ok && c.first;

type ClaimRow = { id: string; created_at: string; turn: string };
/** كل صفوف المطالبة لرقمٍ عابر، بالترتيب الذي يستعمله الكود نفسه. */
const claimRows = (nonce: string) =>
  db()<
    ClaimRow[]
  >`select id, created_at::text as created_at, input->>'turn' as turn from finn_actions_log
     where action = 'chat.write.confirmed' and input->>'nonce' = ${nonce}
     order by created_at asc, id asc`;

/** uuids عشوائية مرتّبة تصاعديًّا (ترتيب النصّ الست‌عشري = ترتيب uuid). */
const sortedUuids = (n: number) =>
  Array.from({ length: n }, () => crypto.randomUUID()).sort((a, b) => (a < b ? -1 : 1));

/** عدد النداءات التي بلغت الانتخاب الذرّي لرقمٍ عابر (صفّ rate_limit_buckets). */
const electionCount = async (nonce: string): Promise<number | null> => {
  const [row] = await db()<
    Array<{ request_count: number }>
  >`select request_count from rate_limit_buckets where bucket_key = ${`wc-claim:${F.ADMIN_A}:${nonce}`}`;
  return row?.request_count ?? null;
};

type ToolLike = {
  execute: (input: Record<string, unknown>, options: unknown) => Promise<unknown>;
};
type Toolbelt = Record<string, ToolLike>;
const callOptions = { toolCallId: "t1", messages: [] };

let buildSadeedTools: typeof import("@/lib/sadeed-tools.server").buildSadeedTools;
let adminUserA: SupabaseClient;
let managerUserA: SupabaseClient;
let admin: SupabaseClient;

const belt = (
  client: SupabaseClient,
  userId: string,
  lastUserText: string,
  orgId: string | null = F.ORG_A,
): Toolbelt =>
  buildSadeedTools(client, userId, {
    lastUserText,
    orgId,
    agentsAvailable: false,
  }) as unknown as Toolbelt;

type GateReply = {
  ok: boolean;
  executed: boolean;
  status?: string;
  reason?: string;
  error?: string;
  next_step?: string;
  action_summary?: string;
  task?: { id: string; title: string };
  confirmed_proposals?: Array<{ arguments: Record<string, unknown> }>;
};
const createTask = (b: Toolbelt, args: Record<string, unknown>) =>
  b.create_task.execute(args, callOptions) as Promise<GateReply>;

const taskArgs = (label: string) => ({ title: `IT-WC ${label} ${rand()}`, priority: "medium" });
const tasksNamed = (title: string) =>
  db()<
    Array<{ id: string; user_id: string }>
  >`select id, user_id from tasks where title = ${title}`;

const ledgerFor = (nonce: string) =>
  db()<
    Array<{ action: string }>
  >`select action from finn_actions_log where input->>'nonce' = ${nonce} order by created_at asc, id asc`;

/** يمحو اقتراحات المستخدم السابقة كي لا يرث الاختبار «آخر طلبٍ» من اختبارٍ قبله. */
const resetProposals = (userId: string) =>
  db()`delete from finn_actions_log where user_id = ${userId}
        and action = 'chat.write.confirmation_requested' and input->>'tool' = 'create_task'`;

/** خطوة ١: اقتراحٌ مختوم؛ يعيد الرقم العابر من السجلّ. */
async function propose(
  client: SupabaseClient,
  userId: string,
  args: Record<string, unknown>,
  orgId: string | null = F.ORG_A,
): Promise<string> {
  const reply = await createTask(belt(client, userId, "أضف المهمة", orgId), args);
  expect(reply).toMatchObject({ ok: false, executed: false, status: "requires_confirmation" });
  const [row] = await db()<
    Array<{ nonce: string }>
  >`select input->>'nonce' as nonce from finn_actions_log
     where user_id = ${userId} and action = 'chat.write.confirmation_requested' and input->>'tool' = 'create_task'
     order by created_at desc, id desc limit 1`;
  return row!.nonce;
}

beforeAll(async () => {
  expect((process.env.SADEED_MESSAGE_APPROVAL_SECRET ?? "").length).toBeGreaterThanOrEqual(32);
  admin = adminClient();
  adminUserA = await userClient({ sub: F.ADMIN_A, org: F.ORG_A });
  managerUserA = await userClient({ sub: F.MANAGER_A, org: F.ORG_A });
  ({ buildSadeedTools } = await import("@/lib/sadeed-tools.server"));
  await db().unsafe(FAULT_SQL);
});

afterAll(async () => {
  try {
    await db().unsafe(UNFAULT_SQL);
  } finally {
    await closeDb();
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ============ (1) N concurrent claims, same nonce — exactly one first ============ */

describe("(1) concurrent claimConfirmation for the SAME nonce", () => {
  it.each([8, 16])(
    "N=%i claims via Promise.all: all N audit rows are written, exactly one first:true, and the election saw exactly N callers",
    async (n) => {
      const rounds = 20;
      for (let r = 0; r < rounds; r++) {
        const nonce = newNonce(`conc${n}`);
        const turns = Array.from({ length: n }, (_, i) => `c${i}`);
        const results = await Promise.all(turns.map((t) => claim(t, nonce)));
        expect(results.every((x) => x.ok)).toBe(true);

        const rows = await claimRows(nonce);
        expect(rows).toHaveLength(n);
        expect(new Set(rows.map((x) => x.turn)).size).toBe(n);

        expect(
          turns.filter((_, i) => isFirst(results[i]!)),
          `round ${r}`,
        ).toHaveLength(1);
        expect(await electionCount(nonce)).toBe(n);
      }
    },
  );
});

/* ============ (2) equal created_at — the election does not depend on timestamps or ids ============ */

describe("(2) competing claims with EQUAL created_at", () => {
  const callClaims = async (ids: string[], nonce: string) => {
    const results: Claim[] = [];
    for (const id of ids) results.push(await claim(`tie-${id}`, nonce));
    return results;
  };
  const onlyTheFirstCaller = [true, false, false, false, false, false];

  it("ascending ids: identical timestamps, exactly one first:true — the first caller", async () => {
    const nonce = newNonce("tie-asc");
    const ids = sortedUuids(6);
    const results = await callClaims(ids, nonce);

    const rows = await claimRows(nonce);
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map((r) => r.created_at)).size).toBe(1);
    expect(rows.map((r) => r.id)).toEqual(ids);
    expect(results.map(isFirst)).toEqual(onlyTheFirstCaller);
  });

  it("descending ids (each later claimant sorts BEFORE all earlier ones): still exactly one first:true — the first caller", async () => {
    const nonce = newNonce("tie-desc");
    const ids = sortedUuids(6).reverse();
    const results = await callClaims(ids, nonce);

    const rows = await claimRows(nonce);
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map((r) => r.created_at)).size).toBe(1);
    // الصفّ الأقدم بالترتيب القديم هو آخر المنادين — ولم يعد لذلك أثرٌ على القرار.
    expect(rows[0]!.id).toBe(ids[ids.length - 1]);
    expect(results.map(isFirst)).toEqual(onlyTheFirstCaller);
    expect(await electionCount(nonce)).toBe(6);
  });
});

/* ============ (3) late-visible earlier row — the commit-order window is closed ============ */

describe("(3) a claim whose earlier-created_at row becomes visible late", () => {
  // A تبدأ أولًا (created_at = بداية معاملتها) لكنها تُتمّ بعد 0.8 ث؛ B تبدأ بعد
  // 0.2 ث وتُتمّ فورًا. بالاستنتاج القديم رجع الاثنان first:true (A أقدم صفًّا بعد
  // إتمامها وB قرّرت قبل أن تراها). بالانتخاب الذرّي: الأول إلى الدالة يفوز — B.
  const nonce = newNonce("window");
  let a: Claim;
  let b: Claim;
  let rows: ClaimRow[];
  let timings: { aMs: number; bMs: number };

  beforeAll(async () => {
    const t0 = Date.now();
    const pa = claim("slow-A", nonce).then((r) => ({ r, ms: Date.now() - t0 }));
    await new Promise((resolve) => setTimeout(resolve, 200));
    const t1 = Date.now();
    const pb = claim("fast-B", nonce).then((r) => ({ r, ms: Date.now() - t1 }));
    const [ra, rb] = await Promise.all([pa, pb]);
    a = ra.r;
    b = rb.r;
    timings = { aMs: ra.ms, bMs: rb.ms };
    rows = await claimRows(nonce);
  });

  it("DB evidence of the window: A's row has the EARLIER created_at though B committed first (A's commit was ~0.8 s late)", () => {
    expect(rows.map((r) => r.turn)).toEqual(["slow-A", "fast-B"]);
    expect(rows[0]!.created_at < rows[1]!.created_at).toBe(true);
    expect(timings.aMs).toBeGreaterThanOrEqual(700);
    expect(timings.bMs).toBeLessThan(timings.aMs);
  });

  it("for one nonce exactly ONE claim is first (the one that reached the election first), the other is told it is not", () => {
    expect([a, b].filter(isFirst)).toHaveLength(1);
    expect(isFirst(b)).toBe(true);
    expect(isFirst(a)).toBe(false);
    expect(a.ok && b.ok).toBe(true);
  });

  it("both audit rows exist and both callers reached the election", async () => {
    expect(rows).toHaveLength(2);
    expect(await electionCount(nonce)).toBe(2);
  });
});

describe("(3-prim) the election primitive itself", () => {
  it("16 concurrent check_rate_limit('wc-claim:…', 1, window) calls: exactly one true, in every one of 10 rounds", async () => {
    for (let r = 0; r < 10; r++) {
      const key = `wc-claim:${newNonce("prim")}`;
      const results = await Promise.all(
        Array.from({ length: 16 }, () =>
          admin.rpc("check_rate_limit", {
            _bucket_key: key,
            _max_requests: 1,
            _window_seconds: CLAIM_ELECTION_WINDOW_SECONDS,
          }),
        ),
      );
      expect(results.every((x) => x.error === null)).toBe(true);
      expect(results.filter((x) => x.data === true)).toHaveLength(1);
    }
  });

  it("the election window is at least twice the proposal TTL and at most one day", () => {
    expect(CLAIM_ELECTION_WINDOW_SECONDS * 1000).toBeGreaterThanOrEqual(
      2 * WRITE_CONFIRMATION_TTL_MS,
    );
    expect(CLAIM_ELECTION_WINDOW_SECONDS).toBeLessThanOrEqual(86_400);
  });
});

/* ============ (4) replay through the real protocol ============ */

describe("(4) replay — the same confirmation used again (create_task via buildSadeedTools)", () => {
  it("step 1 proposes, step 2 «نعم» writes one task, step 3 «نعم» is already_executed, nothing doubles", async () => {
    const args = taskArgs("replay");
    const nonce = await propose(adminUserA, F.ADMIN_A, args);
    expect(await tasksNamed(args.title)).toHaveLength(0);

    const second = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(second).toMatchObject({ ok: true, executed: true });
    expect(await tasksNamed(args.title)).toHaveLength(1);

    const third = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(third).toMatchObject({ ok: false, executed: false, status: "already_executed" });
    const fourth = await createTask(belt(adminUserA, F.ADMIN_A, "yes"), args);
    expect(fourth).toMatchObject({ ok: false, executed: false, status: "already_executed" });
    expect(await tasksNamed(args.title)).toHaveLength(1);

    expect((await ledgerFor(nonce)).map((r) => r.action)).toEqual([
      "chat.write.confirmation_requested",
      "chat.write.confirmed",
      "chat.write.executed",
    ]);
  });

  it("two simultaneous confirmations of one proposal (8 rounds): exactly one task each round", async () => {
    for (let r = 0; r < 8; r++) {
      const args = taskArgs(`race${r}`);
      const nonce = await propose(adminUserA, F.ADMIN_A, args);
      const [x, y] = await Promise.all([
        createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args),
        createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args),
      ]);
      expect([x, y].filter((z) => z.executed)).toHaveLength(1);
      expect([x, y].filter((z) => z.status === "already_executed")).toHaveLength(1);
      expect(await tasksNamed(args.title)).toHaveLength(1);
      const actions = (await ledgerFor(nonce)).map((l) => l.action);
      expect(actions.filter((a) => a === "chat.write.executed")).toHaveLength(1);
    }
  });
});

/* ============ (5) a confirmation only matches its own proposal ============ */

describe("(5) the same «نعم» must not match another user / org / arguments / an expired proposal", () => {
  it("another user (manager A) confirming the admin's arguments: no proposal match, nothing written", async () => {
    const args = taskArgs("other-user");
    await propose(adminUserA, F.ADMIN_A, args);
    const reply = await createTask(belt(managerUserA, F.MANAGER_A, "نعم"), args);
    expect(reply).toMatchObject({
      ok: false,
      executed: false,
      status: "requires_confirmation",
      reason: "no_earlier_summary_for_this_action",
    });
    expect(await tasksNamed(args.title)).toEqual([]);
  });

  it("another organization (same user, orgId = B): no proposal match, nothing written", async () => {
    const args = taskArgs("other-org");
    await propose(adminUserA, F.ADMIN_A, args, F.ORG_A);
    const reply = await createTask(belt(adminUserA, F.ADMIN_A, "نعم", F.ORG_B), args);
    expect(reply).toMatchObject({
      ok: false,
      executed: false,
      status: "requires_confirmation",
      reason: "no_earlier_summary_for_this_action",
    });
    expect(await tasksNamed(args.title)).toEqual([]);
  });

  it("different arguments (different args hash): confirmed_arguments_differ hands back the ORIGINAL arguments; only those execute", async () => {
    const original = taskArgs("orig");
    const recomposed = { ...original, title: `${original.title} (recomposed)` };
    await propose(adminUserA, F.ADMIN_A, original);

    const refused = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), recomposed);
    expect(refused).toMatchObject({
      ok: false,
      executed: false,
      status: "confirmed_arguments_differ",
    });
    expect(refused.confirmed_proposals).toHaveLength(1);
    expect(refused.confirmed_proposals![0]!.arguments).toEqual(original);
    expect(await tasksNamed(recomposed.title)).toEqual([]);
    expect(await tasksNamed(original.title)).toEqual([]);

    const done = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), original);
    expect(done).toMatchObject({ ok: true, executed: true });
    expect(await tasksNamed(original.title)).toHaveLength(1);
    expect(await tasksNamed(recomposed.title)).toEqual([]);
  });

  /** يسجّل اقتراحًا بالدوال المُصدَّرة نفسها (لا بالحزام) ليُتحكَّم بالزمن. */
  async function recordProposal(
    args: Record<string, unknown>,
    opts: { signedAt?: number } = {},
  ): Promise<{ nonce: string; seal: string }> {
    const subject = { tool: "create_task", userId: F.ADMIN_A, orgId: F.ORG_A, args };
    const signed = await signWriteConfirmation(subject, { now: opts.signedAt });
    if (!signed.ok) throw new Error("secret unavailable");
    const argsHash = await writeConfirmationArgsHash(args);
    const details = await sealConfirmationDetails(
      { args, summary: "ملخّص اختبار" },
      { userId: F.ADMIN_A, tool: "create_task", nonce: signed.nonce, argsHash },
    );
    const recorded = await recordPendingConfirmation({
      userId: F.ADMIN_A,
      orgId: F.ORG_A,
      tool: "create_task",
      turn: crypto.randomUUID(),
      nonce: signed.nonce,
      argsHash,
      seal: signed.token,
      details: details!,
      expiresAt: signed.expiresAt,
    });
    expect(recorded.ok).toBe(true);
    return { nonce: signed.nonce, seal: signed.token };
  }

  it("expired seal (proposal signed > TTL ago, row still inside the lookup window): verify says `expired`, the gate re-proposes, nothing written", async () => {
    const args = taskArgs("expired-seal");
    await resetProposals(F.ADMIN_A);
    const { seal } = await recordProposal(args, {
      signedAt: Date.now() - WRITE_CONFIRMATION_TTL_MS - 5_000,
    });
    const subject = { tool: "create_task", userId: F.ADMIN_A, orgId: F.ORG_A, args };
    expect(await verifyWriteConfirmation(seal, subject)).toEqual({
      ok: false,
      reason: "expired",
    });

    const reply = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(reply).toMatchObject({
      ok: false,
      executed: false,
      status: "requires_confirmation",
      reason: "no_earlier_summary_for_this_action",
    });
    expect(await tasksNamed(args.title)).toEqual([]);
  });

  it("stale row (valid seal but the ledger row is older than the TTL): outside the lookup window, re-proposed, nothing written", async () => {
    const args = taskArgs("stale-row");
    await resetProposals(F.ADMIN_A);
    const { nonce, seal } = await recordProposal(args);
    // الختم نفسه ما زال صالحًا — العتبة هنا عمر الصفّ.
    const subject = { tool: "create_task", userId: F.ADMIN_A, orgId: F.ORG_A, args };
    expect((await verifyWriteConfirmation(seal, subject)).ok).toBe(true);
    await db()`update finn_actions_log set created_at = now() - interval '11 minutes'
               where action = 'chat.write.confirmation_requested' and input->>'nonce' = ${nonce}`;

    const reply = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(reply).toMatchObject({
      ok: false,
      executed: false,
      status: "requires_confirmation",
      reason: "no_earlier_summary_for_this_action",
    });
    expect(await tasksNamed(args.title)).toEqual([]);
  });

  it("a forged proposal row (written without the secret): seal mismatch, nothing written", async () => {
    const args = taskArgs("forged");
    await resetProposals(F.ADMIN_A);
    const argsHash = await writeConfirmationArgsHash(args);
    const nonce = newNonce("forged");
    await db()`insert into finn_actions_log (org_id, user_id, actor, action, surface, route, input)
      values (${F.ORG_A}, ${F.ADMIN_A}, 'sadeed', 'chat.write.confirmation_requested', 'chat', '/api/chat',
        ${db().json({
          tool: "create_task",
          org: F.ORG_A,
          turn: crypto.randomUUID(),
          nonce,
          args_hash: argsHash,
          seal: "Zm9yZ2Vk.Zm9yZ2Vk",
          details: "Zm9yZ2Vk.Zm9yZ2Vk",
        })})`;
    const reply = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(reply).toMatchObject({
      ok: false,
      executed: false,
      status: "requires_confirmation",
      reason: "no_earlier_summary_for_this_action",
    });
    expect(await tasksNamed(args.title)).toEqual([]);
    // ولا يُفتح غلافُ التفاصيل المزوَّر.
    expect(
      await openConfirmationDetails("Zm9yZ2Vk.Zm9yZ2Vk", {
        userId: F.ADMIN_A,
        tool: "create_task",
        nonce,
        argsHash,
      }),
    ).toBeNull();
  });
});

/* ============ (6) ledger failures fail CLOSED ============ */

describe("(6) the ledger failing must never let a write through", () => {
  const silence = () => vi.spyOn(console, "error").mockImplementation(() => undefined);

  it("the proposal row cannot be written: step 1 is confirmation_unavailable (no summary promised), nothing written", async () => {
    silence();
    const args = taskArgs("fail-requested");
    const reply = await withFault("chat.write.confirmation_requested", F.ADMIN_A, () =>
      createTask(belt(adminUserA, F.ADMIN_A, "أضف المهمة"), args),
    );
    expect(reply).toMatchObject({
      ok: false,
      executed: false,
      status: "confirmation_unavailable",
      error: "The pending confirmation could not be recorded; nothing was written.",
    });
    expect(reply.action_summary).toBeUndefined();
    expect(await tasksNamed(args.title)).toEqual([]);
  });

  it("the claim row cannot be written: «نعم» is confirmation_unavailable, nothing written, no `executed` row — and the proposal is not burned", async () => {
    silence();
    const args = taskArgs("fail-claim");
    const nonce = await propose(adminUserA, F.ADMIN_A, args);

    const reply = await withFault("chat.write.confirmed", F.ADMIN_A, () =>
      createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args),
    );
    expect(reply).toMatchObject({
      ok: false,
      executed: false,
      status: "confirmation_unavailable",
      error: "The confirmation could not be recorded; nothing was written.",
    });
    expect(await tasksNamed(args.title)).toEqual([]);
    expect((await ledgerFor(nonce)).map((l) => l.action)).toEqual([
      "chat.write.confirmation_requested",
    ]);

    // العطل زال ولم يُطالَب بشيء ⇒ إعادة «نعم» تنفّذ مرّةً واحدة.
    const retry = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(retry).toMatchObject({ ok: true, executed: true });
    expect(await tasksNamed(args.title)).toHaveLength(1);
  });

  it("the claim ELECTION (check_rate_limit) fails: confirmation_unavailable, nothing written, the row is marked failed so the next «نعم» re-proposes — it never reads `already_executed`", async () => {
    silence();
    const args = taskArgs("fail-election");
    const nonce = await propose(adminUserA, F.ADMIN_A, args);

    const reply = await withFault("check_rate_limit", F.ADMIN_A, () =>
      createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args),
    );
    expect(reply).toMatchObject({
      ok: false,
      executed: false,
      status: "confirmation_unavailable",
      error: "The confirmation could not be recorded; nothing was written.",
    });
    expect(await tasksNamed(args.title)).toEqual([]);
    expect((await ledgerFor(nonce)).map((l) => l.action)).toEqual([
      "chat.write.confirmation_requested",
      "chat.write.confirmed",
      "chat.write.failed",
    ]);
    expect(await electionCount(nonce)).toBeNull();

    const again = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(again).toMatchObject({
      ok: false,
      executed: false,
      status: "requires_confirmation",
      reason: "previous_attempt_failed",
    });
    expect(await tasksNamed(args.title)).toEqual([]);

    // اقتراحٌ جديد يؤكّده المستخدم من جديد بعد زوال العطل ⇒ يُنفَّذ مرّةً واحدة.
    const done = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(done).toMatchObject({ ok: true, executed: true });
    expect(await tasksNamed(args.title)).toHaveLength(1);
  });

  it("the outcome audit row is lost AFTER the write: the replay is still refused (no double write)", async () => {
    silence();
    const args = taskArgs("fail-executed");
    const nonce = await propose(adminUserA, F.ADMIN_A, args);

    const first = await withFault("chat.write.executed", F.ADMIN_A, () =>
      createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args),
    );
    expect(first).toMatchObject({ ok: true, executed: true });
    expect((await ledgerFor(nonce)).map((l) => l.action)).toEqual([
      "chat.write.confirmation_requested",
      "chat.write.confirmed",
    ]);

    const replay = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(replay).toMatchObject({ ok: false, executed: false, status: "already_executed" });
    expect(await tasksNamed(args.title)).toHaveLength(1);
  });

  it("the write itself fails after the claim: reported as not executed, the confirmation is consumed, the next «نعم» re-proposes", async () => {
    silence();
    const args = { title: `IT-WC-FAIL ${rand()}`, priority: "medium" };
    const nonce = await propose(adminUserA, F.ADMIN_A, args);

    const failed = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(failed).toMatchObject({ ok: false, executed: false });
    expect(failed.error).toMatch(/it_wc_fault: injected task write failure/);
    expect(failed.next_step).toMatch(/this confirmation is now used/);
    expect(await tasksNamed(args.title)).toEqual([]);
    expect((await ledgerFor(nonce)).map((l) => l.action)).toEqual([
      "chat.write.confirmation_requested",
      "chat.write.confirmed",
      "chat.write.failed",
    ]);

    const again = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    expect(again).toMatchObject({
      ok: false,
      executed: false,
      status: "requires_confirmation",
      reason: "previous_attempt_failed",
    });
    expect(await tasksNamed(args.title)).toEqual([]);
  });

  it("the confirmation secret is missing: confirmation_unavailable before any ledger access, nothing written", async () => {
    const args = taskArgs("no-secret");
    const before = process.env.SADEED_MESSAGE_APPROVAL_SECRET;
    const [{ n: ledgerBefore }] = await db()<
      Array<{ n: number }>
    >`select count(*)::int as n from finn_actions_log where user_id = ${F.ADMIN_A}`;
    process.env.SADEED_MESSAGE_APPROVAL_SECRET = "";
    let reply: GateReply;
    try {
      reply = await createTask(belt(adminUserA, F.ADMIN_A, "نعم"), args);
    } finally {
      process.env.SADEED_MESSAGE_APPROVAL_SECRET = before;
    }
    expect(reply).toMatchObject({
      ok: false,
      executed: false,
      status: "confirmation_unavailable",
    });
    expect(reply.error).toMatch(/not configured on the server/);
    expect(await tasksNamed(args.title)).toEqual([]);
    const [{ n: ledgerAfter }] = await db()<
      Array<{ n: number }>
    >`select count(*)::int as n from finn_actions_log where user_id = ${F.ADMIN_A}`;
    expect(ledgerAfter).toBe(ledgerBefore);
  });
});
