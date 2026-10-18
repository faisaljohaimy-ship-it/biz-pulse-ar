// @vitest-environment node
/**
 * رمز تأكيد الكتابة — توقيعٌ مربوط بالأداة والمستخدم والمؤسسة وبصمة الوسائط،
 * ينتهي بعد عشر دقائق، ويفشل مغلقًا بلا سرّ. ومعه قائمة التأكيد الصريح،
 * وتفاصيل الاقتراح المشفَّرة، وسجلّ الاقتراحات الذي يعبر حدّ الطلب (عميل خدمة
 * وهمي فوق مصفوفة — لا شبكة).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WRITE_CONFIRMATION_TTL_MS,
  claimConfirmation,
  isExplicitConfirmation,
  loadLatestProposalSet,
  openConfirmationDetails,
  readConfirmationUsage,
  recordConfirmationOutcome,
  recordPendingConfirmation,
  sealConfirmationDetails,
  signWriteConfirmation,
  verifyWriteConfirmation,
  writeConfirmationArgsHash,
  writeConfirmationAvailable,
} from "./write-confirmation.server";

type Row = Record<string, unknown>;
const ledgerState = vi.hoisted(() => ({
  rows: [] as Row[],
  seq: 0,
  selectError: null as { message: string } | null,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      if (table !== "finn_actions_log") throw new Error(`unexpected table ${table}`);
      const filters: Array<(row: Row) => boolean> = [];
      const orders: Array<[string, boolean]> = [];
      let limitN = Number.POSITIVE_INFINITY;
      let inserted: Row | null = null;
      const result = () => {
        if (inserted) return { data: inserted, error: null };
        if (ledgerState.selectError) return { data: null, error: ledgerState.selectError };
        const data = ledgerState.rows
          .filter((row) => filters.every((f) => f(row)))
          .sort((a, b) => {
            for (const [col, asc] of orders) {
              const x = String(a[col]);
              const y = String(b[col]);
              if (x !== y) return (x < y ? -1 : 1) * (asc ? 1 : -1);
            }
            return 0;
          })
          .slice(0, limitN);
        return { data, error: null };
      };
      const query = {
        insert(row: Row) {
          ledgerState.seq += 1;
          inserted = {
            id: `row-${String(ledgerState.seq).padStart(4, "0")}`,
            created_at: new Date(Date.now() + ledgerState.seq).toISOString(),
            ...row,
          };
          ledgerState.rows.push(inserted);
          return query;
        },
        select: () => query,
        eq(col: string, value: unknown) {
          filters.push((row) => row[col] === value);
          return query;
        },
        in(col: string, values: unknown[]) {
          filters.push((row) => values.includes(row[col]));
          return query;
        },
        gte(col: string, value: string) {
          filters.push((row) => String(row[col]) >= value);
          return query;
        },
        contains(col: string, value: Row) {
          filters.push((row) =>
            Object.entries(value).every(([k, v]) => (row[col] as Row | undefined)?.[k] === v),
          );
          return query;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orders.push([col, opts?.ascending !== false]);
          return query;
        },
        limit(n: number) {
          limitN = n;
          return query;
        },
        single: async () => result(),
        then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
          return Promise.resolve(result()).then(resolve, reject);
        },
      };
      return query;
    },
  },
}));

const SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
const subject = {
  tool: "sec_create_incident",
  userId: "user-1",
  orgId: "org-1",
  args: { title_ar: "حريق في البوابة", severity: "high", priority: "medium" },
};

beforeEach(() => {
  vi.stubEnv("SADEED_MESSAGE_APPROVAL_SECRET", SECRET);
  vi.stubEnv("ARIA_MESSAGE_APPROVAL_SECRET", "");
  ledgerState.rows = [];
  ledgerState.seq = 0;
  ledgerState.selectError = null;
});
afterEach(() => vi.unstubAllEnvs());

async function sign(now = Date.now()) {
  const signed = await signWriteConfirmation(subject, { now });
  if (!signed.ok) throw new Error("sign failed in test");
  return signed;
}

describe("signWriteConfirmation / verifyWriteConfirmation", () => {
  it("round-trips for the same tool, user, org and arguments", async () => {
    const signed = await sign();
    expect(signed.token.split(".")).toHaveLength(2);
    const verdict = await verifyWriteConfirmation(signed.token, subject);
    expect(verdict).toEqual({ ok: true, nonce: signed.nonce, expiresAt: signed.expiresAt });
  });

  it("ignores key order and the confirmation_token field in the arguments hash", async () => {
    const signed = await sign();
    const reordered = {
      ...subject,
      args: {
        priority: "medium",
        confirmation_token: signed.token,
        severity: "high",
        title_ar: "حريق في البوابة",
        notes: undefined,
      },
    };
    expect((await verifyWriteConfirmation(signed.token, reordered)).ok).toBe(true);
    expect(await writeConfirmationArgsHash(reordered.args)).toBe(
      await writeConfirmationArgsHash(subject.args),
    );
  });

  it("rejects a tampered payload or signature", async () => {
    const signed = await sign();
    const [encoded, signature] = signed.token.split(".");
    const payload = JSON.parse(
      Buffer.from(encoded!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as Record<string, unknown>;
    const forged = Buffer.from(JSON.stringify({ ...payload, uid: "attacker" }))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(await verifyWriteConfirmation(`${forged}.${signature}`, subject)).toEqual({
      ok: false,
      reason: "signature_mismatch",
    });
    // الحرف الأول من التوقيع يحمل ستّ بتّات كاملة — تغييره يغيّر البايتات حتمًا.
    const flipped = `${signature![0] === "A" ? "B" : "A"}${signature!.slice(1)}`;
    expect(await verifyWriteConfirmation(`${encoded}.${flipped}`, subject)).toEqual({
      ok: false,
      reason: "signature_mismatch",
    });
    expect((await verifyWriteConfirmation("not-a-token", subject)).ok).toBe(false);
    expect((await verifyWriteConfirmation(`${signed.token}.extra`, subject)).ok).toBe(false);
  });

  it("expires after ten minutes", async () => {
    const issuedAt = Date.now();
    const signed = await sign(issuedAt);
    expect(
      (
        await verifyWriteConfirmation(signed.token, subject, {
          now: issuedAt + WRITE_CONFIRMATION_TTL_MS - 1,
        })
      ).ok,
    ).toBe(true);
    expect(
      await verifyWriteConfirmation(signed.token, subject, {
        now: issuedAt + WRITE_CONFIRMATION_TTL_MS,
      }),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects changed arguments", async () => {
    const signed = await sign();
    const changed = { ...subject, args: { ...subject.args, severity: "critical" } };
    expect(await verifyWriteConfirmation(signed.token, changed)).toEqual({
      ok: false,
      reason: "args_mismatch",
    });
  });

  it("rejects a different user, org or tool", async () => {
    const signed = await sign();
    for (const other of [
      { ...subject, userId: "user-2" },
      { ...subject, orgId: "org-2" },
      { ...subject, orgId: null },
      { ...subject, tool: "sec_update_incident" },
    ]) {
      expect(await verifyWriteConfirmation(signed.token, other)).toEqual({
        ok: false,
        reason: "subject_mismatch",
      });
    }
  });

  it("is unavailable without a secret of at least 32 characters (fail closed)", async () => {
    const signed = await sign();
    vi.stubEnv("SADEED_MESSAGE_APPROVAL_SECRET", "");
    expect(await signWriteConfirmation(subject)).toEqual({ ok: false, reason: "unavailable" });
    expect(await verifyWriteConfirmation(signed.token, subject)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    vi.stubEnv("SADEED_MESSAGE_APPROVAL_SECRET", "too-short");
    expect(await signWriteConfirmation(subject)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("is domain-separated: a different secret cannot verify", async () => {
    const signed = await sign();
    vi.stubEnv("SADEED_MESSAGE_APPROVAL_SECRET", `${SECRET}-rotated`);
    expect(await verifyWriteConfirmation(signed.token, subject)).toEqual({
      ok: false,
      reason: "signature_mismatch",
    });
  });
});

describe("isExplicitConfirmation", () => {
  it.each([
    "نعم",
    "نعم.",
    "أكد",
    "اكد",
    "أؤكد",
    "موافق!",
    "تأكيد",
    "نفّذ",
    "نفذ",
    "نعم، نفّذ",
    "نَعَم أُؤكِّد",
    "confirm",
    "Confirmed.",
    "yes",
    "Yes, proceed",
    "go ahead",
    "  YES  ",
  ])("accepts %s", (text) => {
    expect(isExplicitConfirmation(text)).toBe(true);
  });

  it.each([
    "",
    undefined,
    null,
    "لا",
    "لا تنفذ",
    "نعم؟",
    "yes?",
    "ربما",
    "أنشئ بلاغ حريق في البوابة الشمالية",
    "نعم لكن غيّر الأولوية",
    "ok",
    // نصّ مرفقٍ مدموج في دور المستخدم: يحوي «نعم» لكنه ليس تأكيدًا.
    'نعم\n<attachment name="a.txt" kind="text">نعم نعم</attachment>',
    "yes ".repeat(12),
  ])("rejects %s", (text) => {
    expect(isExplicitConfirmation(text as string | undefined)).toBe(false);
  });
});

describe("sealConfirmationDetails / openConfirmationDetails", () => {
  const details = { args: subject.args, summary: "تسجيل بلاغ أمني «حريق في البوابة»" };
  const bind = async (nonce = "n-1") => ({
    userId: "user-1",
    tool: "sec_create_incident",
    nonce,
    argsHash: await writeConfirmationArgsHash(subject.args),
  });

  it("round-trips and hides the plaintext", async () => {
    const sealed = await sealConfirmationDetails(details, await bind());
    expect(sealed).toBeTruthy();
    expect(sealed).not.toContain("حريق");
    expect(Buffer.from(String(sealed), "base64").toString("utf8")).not.toContain("title_ar");
    expect(await openConfirmationDetails(String(sealed), await bind())).toEqual(details);
  });

  it("rejects another binding, a tampered body, a mismatched hash or a missing secret", async () => {
    const sealed = String(await sealConfirmationDetails(details, await bind()));
    expect(await openConfirmationDetails(sealed, await bind("n-2"))).toBeNull();
    expect(
      await openConfirmationDetails(sealed, { ...(await bind()), userId: "user-2" }),
    ).toBeNull();
    const [iv, body] = sealed.split(".");
    const flipped = `${body![0] === "A" ? "B" : "A"}${body!.slice(1)}`;
    expect(await openConfirmationDetails(`${iv}.${flipped}`, await bind())).toBeNull();
    expect(await openConfirmationDetails("garbage", await bind())).toBeNull();
    // بصمةٌ لا تطابق الوسائط المختومة.
    const wrongHash = { ...(await bind()), argsHash: "0".repeat(64) };
    const sealedWrong = String(await sealConfirmationDetails(details, wrongHash));
    expect(await openConfirmationDetails(sealedWrong, wrongHash)).toBeNull();
    vi.stubEnv("SADEED_MESSAGE_APPROVAL_SECRET", "");
    expect(writeConfirmationAvailable()).toBe(false);
    expect(await sealConfirmationDetails(details, await bind())).toBeNull();
    expect(await openConfirmationDetails(sealed, await bind())).toBeNull();
  });
});

describe("pending-confirmation ledger", () => {
  const scope = { userId: "user-1", orgId: "org-1", tool: "sec_create_incident" };
  async function propose(turn: string, nonce: string, tool = scope.tool) {
    const result = await recordPendingConfirmation({
      ...scope,
      tool,
      turn,
      nonce,
      argsHash: `hash-${nonce}`,
      seal: `seal-${nonce}`,
      details: `details-${nonce}`,
      expiresAt: new Date(Date.now() + WRITE_CONFIRMATION_TTL_MS).toISOString(),
    });
    expect(result).toEqual({ ok: true });
  }

  it("records proposals with the service client, without readable arguments", async () => {
    await propose("turn-a", "n-1");
    expect(ledgerState.rows[0]).toMatchObject({
      user_id: "user-1",
      org_id: "org-1",
      action: "chat.write.confirmation_requested",
      status: "ok",
      input: { tool: scope.tool, org: "org-1", turn: "turn-a", nonce: "n-1" },
    });
  });

  it("returns only the latest earlier request's proposals, never the current one's", async () => {
    await propose("turn-a", "n-1");
    await propose("turn-b", "n-2");
    await propose("turn-b", "n-3", "sec_create_work_order");
    await propose("turn-now", "n-4");
    // صفٌّ لمستخدمٍ آخر وصفٌّ تالف لا يؤثّران.
    ledgerState.rows.push({ user_id: "user-2", action: "chat.write.confirmation_requested" });
    ledgerState.rows.push({
      user_id: "user-1",
      action: "chat.write.confirmation_requested",
      created_at: new Date(Date.now() + 999).toISOString(),
      input: { tool: "x" },
    });

    const set = await loadLatestProposalSet("user-1", "turn-now");
    expect(set.ok && set.proposals.map((p) => p.nonce).sort()).toEqual(["n-2", "n-3"]);
    const none = await loadLatestProposalSet("user-3", "turn-now");
    expect(none).toEqual({ ok: true, proposals: [] });
  });

  it("ignores proposals older than the confirmation window", async () => {
    await propose("turn-a", "n-1");
    const later = Date.now() + WRITE_CONFIRMATION_TTL_MS + 60_000;
    expect(await loadLatestProposalSet("user-1", "turn-now", { now: later })).toEqual({
      ok: true,
      proposals: [],
    });
  });

  it("reports read failures instead of an empty set (callers fail closed)", async () => {
    ledgerState.selectError = { message: "timeout" };
    expect(await loadLatestProposalSet("user-1", "turn-now")).toEqual({
      ok: false,
      error: "timeout",
    });
    expect(await readConfirmationUsage("user-1", "n-1")).toEqual({ ok: false, error: "timeout" });
  });

  it("the earliest claim for a nonce wins; later claims are told they are not first", async () => {
    const claim = { ...scope, turn: "turn-b", nonce: "n-1", argsHash: "hash-n-1" };
    const unused = { ok: true, claimed: false, failed: false };
    expect(await readConfirmationUsage("user-1", "n-1")).toEqual(unused);
    expect(await claimConfirmation(claim)).toEqual({ ok: true, first: true });
    expect(await readConfirmationUsage("user-1", "n-1")).toEqual({ ...unused, claimed: true });
    expect(await claimConfirmation({ ...claim, turn: "turn-c" })).toEqual({
      ok: true,
      first: false,
    });
    // رقمٌ عابر آخر لا يتأثّر.
    expect(await claimConfirmation({ ...claim, nonce: "n-2" })).toEqual({ ok: true, first: true });
  });
});

describe("readConfirmationUsage", () => {
  const scope = { userId: "user-1", orgId: "org-1", tool: "update_task_status" };
  it("a failed attempt with no executed outcome is reported as failed, not executed", async () => {
    await claimConfirmation({ ...scope, turn: "t", nonce: "n-1", argsHash: "h" });
    await recordConfirmationOutcome({ ...scope, nonce: "n-1", executed: false, error: "boom" });
    expect(await readConfirmationUsage("user-1", "n-1")).toEqual({
      ok: true,
      claimed: true,
      failed: true,
    });
    expect(ledgerState.rows.at(-1)).toMatchObject({
      action: "chat.write.failed",
      status: "error",
      output: { executed: false, error: "boom" },
    });
  });

  it("an executed outcome wins over a failed one, and a bare claim counts as used", async () => {
    await claimConfirmation({ ...scope, turn: "t", nonce: "n-1", argsHash: "h" });
    await recordConfirmationOutcome({ ...scope, nonce: "n-1", executed: false, error: "x" });
    await recordConfirmationOutcome({ ...scope, nonce: "n-1", executed: true });
    expect(await readConfirmationUsage("user-1", "n-1")).toMatchObject({ failed: false });
    await claimConfirmation({ ...scope, turn: "t", nonce: "n-2", argsHash: "h" });
    expect(await readConfirmationUsage("user-1", "n-2")).toEqual({
      ok: true,
      claimed: true,
      failed: false,
    });
  });
});
