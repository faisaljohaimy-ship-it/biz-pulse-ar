// @vitest-environment node
/**
 * رمز تأكيد الاستيراد: يربط المستخدم وبصمة الملف والمدّة، ويفشل مغلقًا بلا سرٍّ سليم، ولا يصلح
 * لغير صاحبه ولا لملفٍ آخر، ويُستهلك مرّةً واحدة بالانتخاب الذرّي نفسه لبوابة تأكيد الكتابة.
 * عميل الخدمة وهمي (لا شبكة). البرهان المقابل بالتضعيف العمدي في `guards.mutation.server.test.ts`.
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  signWriteConfirmation,
  verifyWriteConfirmation,
} from "@/lib/sadeed/write-confirmation.server";
import { FINN_IMPORT_LIMITS } from "./contract";
import {
  FINN_IMPORT_CLAIM_WINDOW_SECONDS,
  FINN_IMPORT_TOKEN_DOMAIN,
  claimImportToken,
  fileSha256Hex,
  importConfirmationAvailable,
  signImportToken,
  verifyImportToken,
} from "./import-token.server";

const rpcState = vi.hoisted(() => ({
  buckets: new Map<string, number>(),
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  override: null as null | { kind: "error" | "value" | "throw"; data?: unknown },
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    async rpc(fn: string, args: Record<string, unknown>) {
      rpcState.calls.push({ fn, args });
      const o = rpcState.override;
      if (o?.kind === "throw") throw new Error("network down");
      if (o?.kind === "error") return { data: null, error: { message: "boom" } };
      if (o?.kind === "value") return { data: o.data, error: null };
      // كما `check_rate_limit`: نداءٌ واحد فقط ضمن الحدّ لكل مفتاح.
      const key = String(args._bucket_key);
      const count = (rpcState.buckets.get(key) ?? 0) + 1;
      rpcState.buckets.set(key, count);
      return { data: count <= Number(args._max_requests), error: null };
    },
  },
}));

const SECRET = "s".repeat(40);
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const SHA_1 = fileSha256Hex(new TextEncoder().encode("file one"));
const SHA_2 = fileSha256Hex(new TextEncoder().encode("file two"));
const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);

const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  saved.FINN = process.env.FINN_IMPORT_SIGNING_SECRET;
  saved.SADEED = process.env.SADEED_MESSAGE_APPROVAL_SECRET;
  saved.LEGACY = process.env.ARIA_MESSAGE_APPROVAL_SECRET;
  process.env.FINN_IMPORT_SIGNING_SECRET = SECRET;
  delete process.env.SADEED_MESSAGE_APPROVAL_SECRET;
  delete process.env.ARIA_MESSAGE_APPROVAL_SECRET;
  rpcState.buckets.clear();
  rpcState.calls.length = 0;
  rpcState.override = null;
});
afterEach(() => {
  for (const [key, name] of [
    ["FINN", "FINN_IMPORT_SIGNING_SECRET"],
    ["SADEED", "SADEED_MESSAGE_APPROVAL_SECRET"],
    ["LEGACY", "ARIA_MESSAGE_APPROVAL_SECRET"],
  ] as const) {
    if (saved[key] === undefined) delete process.env[name];
    else process.env[name] = saved[key];
  }
});

async function signed(overrides: Partial<Parameters<typeof signImportToken>[0]> = {}) {
  const r = await signImportToken({
    userId: USER_A,
    fileSha256: SHA_1,
    parts: 2,
    rows: 150,
    now: NOW,
    ...overrides,
  });
  if (!r.ok) throw new Error("sign failed");
  return r;
}

const flip = (value: string, index: number) =>
  value.slice(0, index) + (value[index] === "A" ? "B" : "A") + value.slice(index + 1);

describe("signImportToken / verifyImportToken", () => {
  it("دورة سليمة: يتحقق لصاحبه ولملفه ويعيد الرقم العابر والأعداد والانتهاء", async () => {
    const t = await signed();
    // عشر دقائق بالمللي ثانية **مكتوبةً**: اختبارٌ يقيس بـ`tokenTtlMs` نفسه يمرّ لو صار يومًا (المادة ٣٠).
    expect(t.expiresAt).toBe(new Date(NOW + 600_000).toISOString());
    expect(Date.parse(t.expiresAt) - NOW).toBe(600_000);
    const v = await verifyImportToken(t.token, {
      userId: USER_A,
      fileSha256: SHA_1,
      now: NOW + 1_000,
    });
    expect(v).toEqual({ ok: true, nonce: t.nonce, parts: 2, rows: 150, expiresAt: t.expiresAt });
    expect(t.token.split(".")).toHaveLength(2);
    expect(t.token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("كل رمز بنونسٍ فريد", async () => {
    const nonces = new Set(
      (await Promise.all(Array.from({ length: 20 }, () => signed()))).map((t) => t.nonce),
    );
    expect(nonces.size).toBe(20);
  });

  it("رمز المستخدم A لا يصلح للمستخدم B", async () => {
    const t = await signed();
    expect(
      await verifyImportToken(t.token, { userId: USER_B, fileSha256: SHA_1, now: NOW }),
    ).toEqual({
      ok: false,
      error: "token_invalid",
    });
  });

  it("رمز الملف الأول لا يصلح لملفٍ آخر", async () => {
    const t = await signed();
    expect(
      await verifyImportToken(t.token, { userId: USER_A, fileSha256: SHA_2, now: NOW }),
    ).toEqual({
      ok: false,
      error: "file_changed",
    });
  });

  it("الانتهاء: صالح قبل عشر دقائق بمللي ثانية، ومنتهٍ عند العشر وبعدها (بقيمٍ مطلقة لا نسبية)", async () => {
    const t = await signed();
    const at = (ms: number) =>
      verifyImportToken(t.token, { userId: USER_A, fileSha256: SHA_1, now: NOW + ms });
    expect((await at(599_999)).ok).toBe(true);
    expect(await at(600_000)).toEqual({ ok: false, error: "token_expired" });
    expect(await at(600_001)).toEqual({ ok: false, error: "token_expired" });
    expect(await at(6_000_000)).toEqual({ ok: false, error: "token_expired" });
    // ومن أول لحظة، وبعد دقيقة، وبعد تسع دقائق: صالح (لا انتهاء مبكّر).
    for (const ms of [0, 60_000, 540_000]) expect((await at(ms)).ok, `${ms}ms`).toBe(true);
  });

  it("العبث بالحمولة أو التوقيع أو ترقيعهما ⇒ token_invalid", async () => {
    const t = await signed();
    const [payload, signature] = t.token.split(".");
    const expected = { userId: USER_A, fileSha256: SHA_1, now: NOW };
    const bad = [
      `${flip(payload, 5)}.${signature}`,
      `${payload}.${flip(signature, 3)}`,
      `${payload}.${signature.slice(0, -2)}`,
      `${payload}.${signature}A`,
      `${signature}.${payload}`,
      `${payload}.`,
      `.${signature}`,
      payload,
      `${payload}.${signature}.extra`,
      "",
      "....",
      "نص.عربي",
      `${payload}.${"A".repeat(43)}`,
    ];
    for (const token of bad) {
      expect(await verifyImportToken(token, expected), `رُفض: ${token.slice(0, 24)}…`).toEqual({
        ok: false,
        error: "token_invalid",
      });
    }
    // رمز طويل جدًّا وقيمٌ ليست نصًّا.
    expect(await verifyImportToken("A".repeat(5_000), expected)).toEqual({
      ok: false,
      error: "token_invalid",
    });
    expect(await verifyImportToken(undefined as unknown as string, expected)).toEqual({
      ok: false,
      error: "token_invalid",
    });
    expect(await verifyImportToken({} as unknown as string, expected)).toEqual({
      ok: false,
      error: "token_invalid",
    });
  });

  it("حمولة معدَّلة بتوقيعٍ بسرٍّ آخر ⇒ token_invalid (لا يصنع مهاجم رمزًا لنفسه)", async () => {
    const t = await signed();
    process.env.FINN_IMPORT_SIGNING_SECRET = "x".repeat(40);
    const forged = await signImportToken({
      userId: USER_A,
      fileSha256: SHA_1,
      parts: 99,
      rows: 99,
      now: NOW,
    });
    process.env.FINN_IMPORT_SIGNING_SECRET = SECRET;
    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect(
      await verifyImportToken(forged.token, { userId: USER_A, fileSha256: SHA_1, now: NOW }),
    ).toEqual({
      ok: false,
      error: "token_invalid",
    });
    // والحمولة الأصلية بتوقيع المزوَّر (خلط) مرفوضة كذلك.
    const mixed = `${t.token.split(".")[0]}.${forged.token.split(".")[1]}`;
    expect(
      (await verifyImportToken(mixed, { userId: USER_A, fileSha256: SHA_1, now: NOW })).ok,
    ).toBe(false);
  });

  it("بلا سرّ أو بسرٍّ قصير ⇒ confirmation_unavailable (توقيعًا وتحققًا)", async () => {
    const t = await signed();
    for (const value of [undefined, "", "   ", "a".repeat(31)]) {
      if (value === undefined) delete process.env.FINN_IMPORT_SIGNING_SECRET;
      else process.env.FINN_IMPORT_SIGNING_SECRET = value;
      expect(importConfirmationAvailable()).toBe(false);
      expect(
        await signImportToken({ userId: USER_A, fileSha256: SHA_1, parts: 1, rows: 1, now: NOW }),
      ).toEqual({
        ok: false,
        error: "confirmation_unavailable",
      });
      expect(
        await verifyImportToken(t.token, { userId: USER_A, fileSha256: SHA_1, now: NOW }),
      ).toEqual({
        ok: false,
        error: "confirmation_unavailable",
      });
    }
  });

  it("السرّ ٣٢ حرفًا يكفي؛ وأسرار سَدِيد القديمة لا تُفتح بها بوابة الاستيراد (فصل المفاتيح)", async () => {
    process.env.FINN_IMPORT_SIGNING_SECRET = "k".repeat(32);
    expect(importConfirmationAvailable()).toBe(true);
    // سرّ كتابة سَدِيد وحده (بل والاسم القديم) لا يجعل الاستيراد متاحًا — وإلا فُتحت كتابات سَدِيد بتشغيل فِن.
    delete process.env.FINN_IMPORT_SIGNING_SECRET;
    process.env.SADEED_MESSAGE_APPROVAL_SECRET = "s".repeat(40);
    process.env.ARIA_MESSAGE_APPROVAL_SECRET = "legacy-secret-".padEnd(40, "z");
    expect(importConfirmationAvailable()).toBe(false);
    expect(
      await signImportToken({ userId: USER_A, fileSha256: SHA_1, parts: 1, rows: 1, now: NOW }),
    ).toEqual({ ok: false, error: "confirmation_unavailable" });
  });

  it("فصل النطاق: رمز كتابة الدردشة لا يصلح رمز استيراد ولا العكس (حتى لو تطابق السرّان)", async () => {
    expect(FINN_IMPORT_TOKEN_DOMAIN).toBe("finn-import-confirm:v1|");
    // أسوأ حالة: سرّا النظامين متطابقان؛ البادئة وحدها يجب أن تفصل.
    process.env.SADEED_MESSAGE_APPROVAL_SECRET = SECRET;
    const write = await signWriteConfirmation(
      { tool: "send_message", userId: USER_A, orgId: null, args: { to: "x" } },
      { now: NOW },
    );
    if (!write.ok) throw new Error("sign write failed");
    expect(
      await verifyImportToken(write.token, { userId: USER_A, fileSha256: SHA_1, now: NOW }),
    ).toEqual({
      ok: false,
      error: "token_invalid",
    });
    const imp = await signed();
    const asWrite = await verifyWriteConfirmation(
      imp.token,
      { tool: "send_message", userId: USER_A, orgId: null, args: { to: "x" } },
      { now: NOW },
    );
    expect(asWrite.ok).toBe(false);
  });

  describe("فصل النطاق يُثبَت من جهة الاستيراد وحدها (سرّان متساويان)", () => {
    const WRITE_DOMAIN = /const DOMAIN_PREFIX = "([^"]+)";/.exec(
      readFileSync("src/lib/sadeed/write-confirmation.server.ts", "utf8"),
    )?.[1];

    /** حمولة استيراد صالحة الشكل، يوقّعها الاختبار بنفسه بالبادئة التي يريد (أو بلا بادئة). */
    function forged(domain: string, patch: Record<string, unknown> = {}) {
      const payload = {
        v: 1,
        uid: USER_A,
        sha: SHA_1,
        parts: 2,
        rows: 150,
        exp: NOW + 600_000,
        n: "forged-nonce",
        ...patch,
      };
      const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
      const sig = createHmac("sha256", SECRET).update(`${domain}${encoded}`).digest("base64url");
      return `${encoded}.${sig}`;
    }
    const verify = (token: string) =>
      verifyImportToken(token, { userId: USER_A, fileSha256: SHA_1, now: NOW });

    it("ضابط: التزوير اليدوي ببادئة الاستيراد الصحيحة يُقبل (فرفض ما بعده سببه البادئة وحدها)", async () => {
      expect(await verify(forged(FINN_IMPORT_TOKEN_DOMAIN))).toMatchObject({
        ok: true,
        nonce: "forged-nonce",
      });
    });

    it("توقيعٌ بلا أي بادئة ⇒ token_invalid (يحمرّ لو أُسقطت بادئة الاستيراد)", async () => {
      expect(await verify(forged(""))).toEqual({ ok: false, error: "token_invalid" });
    });

    it("توقيعٌ ببادئة تأكيد كتابة الدردشة بالسرّ نفسه ⇒ token_invalid", async () => {
      expect(WRITE_DOMAIN, "ثابت بادئة الكتابة لم يُعثر عليه في مصدرها").toMatch(/\|$/);
      expect(WRITE_DOMAIN).not.toBe(FINN_IMPORT_TOKEN_DOMAIN);
      expect(await verify(forged(WRITE_DOMAIN as string))).toEqual({
        ok: false,
        error: "token_invalid",
      });
    });

    it("بادئةٌ أخرى أو نسخةٌ أخرى منها ⇒ token_invalid", async () => {
      for (const domain of [
        "finn-import-confirm:v2|",
        "finn-import-confirm:v1",
        "finn-import-confirm|",
        FINN_IMPORT_TOKEN_DOMAIN.toUpperCase(),
      ]) {
        expect(await verify(forged(domain)), domain).toEqual({ ok: false, error: "token_invalid" });
      }
    });

    it("سقف طول الرمز ٢٠٤٨: رمزٌ صحيح التوقيع أطول منه يُرفض، وتحته بقليل يُقبل", async () => {
      const under = forged(FINN_IMPORT_TOKEN_DOMAIN, { n: "x".repeat(1_000) });
      expect(under.length).toBeLessThan(2_048);
      expect((await verify(under)).ok).toBe(true);
      const over = forged(FINN_IMPORT_TOKEN_DOMAIN, { n: "x".repeat(2_000) });
      expect(over.length).toBeGreaterThan(2_048);
      expect(await verify(over)).toEqual({ ok: false, error: "token_invalid" });
    });

    it("والعكس: رمز استيرادٍ صحيح (بالسرّ نفسه) لا تقبله بوّابة تأكيد الكتابة لأي أداة", async () => {
      process.env.SADEED_MESSAGE_APPROVAL_SECRET = SECRET;
      const asWrite = await verifyWriteConfirmation(
        forged(FINN_IMPORT_TOKEN_DOMAIN),
        { tool: "send_message", userId: USER_A, orgId: null, args: { to: "x" } },
        { now: NOW },
      );
      expect(asWrite.ok).toBe(false);
    });
  });

  it("مدخلات التوقيع غير الصالحة تُرمى (خطأ برمجة لا ظرف تشغيل)", async () => {
    await expect(
      signImportToken({ userId: "", fileSha256: SHA_1, parts: 1, rows: 1 }),
    ).rejects.toThrow(TypeError);
    await expect(
      signImportToken({ userId: USER_A, fileSha256: "XYZ", parts: 1, rows: 1 }),
    ).rejects.toThrow(TypeError);
    await expect(
      signImportToken({ userId: USER_A, fileSha256: SHA_1, parts: -1, rows: 1 }),
    ).rejects.toThrow(TypeError);
    await expect(
      signImportToken({ userId: USER_A, fileSha256: SHA_1, parts: 1, rows: 1.5 }),
    ).rejects.toThrow(TypeError);
  });
});

describe("fileSha256Hex", () => {
  it("متجه معروف، وبايتان مختلفان ببصمتين مختلفتين", () => {
    expect(fileSha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(SHA_1).not.toBe(SHA_2);
    expect(SHA_1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("تغطي الملف كله: بايتٌ واحد يتغيّر في أوله أو وسطه أو آخره (ملفٌّ ٦٤ ك) ⇒ بصمةٌ أخرى", () => {
    const base = new Uint8Array(64 * 1024).map((_, i) => (i * 31 + 7) & 0xff);
    const withFlip = (at: number) => {
      const copy = base.slice();
      copy[at] ^= 0xff;
      return copy;
    };
    const shas = [0, 511, 512, 4_095, 4_096, 40_000, base.length - 1].map((at) =>
      fileSha256Hex(withFlip(at)),
    );
    // كلها تختلف عن الأصل وبعضها عن بعض (لا بصمة تقتصر على مقدّمةٍ ولا على ذيل).
    expect(new Set([...shas, fileSha256Hex(base)]).size).toBe(shas.length + 1);
    // وإضافة بايتٍ واحد في الذيل تُغيّرها أيضًا (الطول جزءٌ من المحتوى).
    expect(fileSha256Hex(new Uint8Array([...base, 0]))).not.toBe(fileSha256Hex(base));
  });

  it("الرمز لملفٍّ لا يصلح لملفٍّ يشاركه المقدّمة كلّها ويفترق في بايتٍ متأخر (file_changed)", async () => {
    const a = new Uint8Array(64 * 1024).map((_, i) => (i * 17 + 3) & 0xff);
    const tails = [40_000, a.length - 1].map((at) => {
      const b = a.slice();
      b[at] ^= 0x01;
      return b;
    });
    const t = await signed({ fileSha256: fileSha256Hex(a) });
    for (const b of tails) {
      expect(Buffer.compare(a.subarray(0, 4_096), b.subarray(0, 4_096))).toBe(0);
      expect(
        await verifyImportToken(t.token, {
          userId: USER_A,
          fileSha256: fileSha256Hex(b),
          now: NOW,
        }),
      ).toEqual({ ok: false, error: "file_changed" });
    }
    expect(
      (
        await verifyImportToken(t.token, {
          userId: USER_A,
          fileSha256: fileSha256Hex(a),
          now: NOW,
        })
      ).ok,
    ).toBe(true);
  });
});

describe("claimImportToken — مرّةً واحدة وفشلٌ مغلق", () => {
  it("الأول ينجح والباقي already_used (إعادة تشغيل الطلب نفسه)", async () => {
    expect(await claimImportToken({ nonce: "n1", userId: USER_A })).toEqual({ ok: true });
    expect(await claimImportToken({ nonce: "n1", userId: USER_A })).toEqual({
      ok: false,
      error: "already_used",
    });
    expect(await claimImportToken({ nonce: "n1", userId: USER_A })).toEqual({
      ok: false,
      error: "already_used",
    });
  });

  it("رمزٌ آخر أو مستخدمٌ آخر دلوٌ مستقل", async () => {
    expect((await claimImportToken({ nonce: "n1", userId: USER_A })).ok).toBe(true);
    expect((await claimImportToken({ nonce: "n2", userId: USER_A })).ok).toBe(true);
    expect((await claimImportToken({ nonce: "n1", userId: USER_B })).ok).toBe(true);
  });

  it("عشرة نداءات متعاقبة لرمزٍ واحد ⇒ واحد فقط ينجح (الذرّية الحقيقية في check_rate_limit)", async () => {
    const results: Awaited<ReturnType<typeof claimImportToken>>[] = [];
    for (let i = 0; i < 10; i++)
      results.push(await claimImportToken({ nonce: "race", userId: USER_A }));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.error === "already_used")).toHaveLength(9);
  });

  it("المفتاح فريد لكل (مستخدم، رمز) والنافذة أطول من عمر الرمز", async () => {
    await claimImportToken({ nonce: "abc", userId: USER_A });
    expect(rpcState.calls).toEqual([
      {
        fn: "check_rate_limit",
        args: {
          _bucket_key: `fi-claim:${USER_A}:abc`,
          _max_requests: 1,
          _window_seconds: FINN_IMPORT_CLAIM_WINDOW_SECONDS,
        },
      },
    ]);
    expect(FINN_IMPORT_CLAIM_WINDOW_SECONDS).toBeGreaterThan(FINN_IMPORT_LIMITS.tokenTtlMs / 1000);
  });

  it("خطأ المخزن أو رميه أو جوابٌ غير منطقي ⇒ confirmation_unavailable (لا كتابة)", async () => {
    for (const override of [
      { kind: "error" as const },
      { kind: "throw" as const },
      { kind: "value" as const, data: null },
      { kind: "value" as const, data: "true" },
      { kind: "value" as const, data: 1 },
    ]) {
      rpcState.override = override;
      expect(await claimImportToken({ nonce: "x", userId: USER_A })).toEqual({
        ok: false,
        error: "confirmation_unavailable",
      });
    }
  });

  it("رقم عابر أو مستخدم فارغ ⇒ token_invalid بلا نداء للمخزن", async () => {
    expect(await claimImportToken({ nonce: "", userId: USER_A })).toEqual({
      ok: false,
      error: "token_invalid",
    });
    expect(await claimImportToken({ nonce: "n", userId: "" })).toEqual({
      ok: false,
      error: "token_invalid",
    });
    expect(rpcState.calls).toHaveLength(0);
  });
});
