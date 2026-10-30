// @vitest-environment node
/**
 * التوقيع: ذهابٌ وإياب، والتلاعب بكل حقلٍ يُرفض، وتوقيع الردّ يُسقط ما لا يطابق.
 * وتحقّقٌ متقاطع من `node:crypto` يثبت أن Web Crypto يعطي بايتات الـHMAC نفسها التي سيحسبها n8n.
 */
import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { HEADER } from "./protocol";
import {
  constantTimeEqual,
  generateNonce,
  hmacSha256Hex,
  sha256Hex,
  signRequest,
  signResponse,
  verifyRequestSignature,
  verifyResponseSignature,
  type RequestRejection,
  type SignRequestInput,
  type SignResponseInput,
  type VerifyRequestInput,
  type VerifyResponseInput,
} from "./sign.server";

const SECRET = "test-only-sadeed-secret-0123456789-abcdef";
const OTHER_SECRET = "test-only-fnn-secret-9876543210-fedcba!!";
const NONCE = "0123456789abcdef0123456789abcdef";
const TS = 1_900_000_000;
const PATH = "sadeed-research-v1";
const BODY = JSON.stringify({ v: 1, requestId: "x", brief: { terms: ["أسوار"], codes: [] } });

async function signedHeaders(over: Partial<SignRequestInput> = {}) {
  return new Headers(
    await signRequest({
      secret: SECRET,
      ts: TS,
      nonce: NONCE,
      path: PATH,
      body: BODY,
      deadlineMs: 1800,
      ...over,
    }),
  );
}

describe("① البدائيات تطابق node:crypto بايتًا ببايت", () => {
  it("sha256Hex لنصٍّ عربي وبايتات", async () => {
    const text = "أسوار 2026 SEC-18";
    const expected = createHash("sha256").update(text, "utf8").digest("hex");
    expect(await sha256Hex(text)).toBe(expected);
    expect(await sha256Hex(new TextEncoder().encode(text))).toBe(expected);
  });

  it("hmacSha256Hex: المفتاح هو بايتات UTF-8 للسرّ", async () => {
    const msg = `nx-n8n:v1|${TS}|${NONCE}|${PATH}|abc`;
    expect(await hmacSha256Hex(SECRET, msg)).toBe(
      createHmac("sha256", SECRET).update(msg, "utf8").digest("hex"),
    );
  });

  it("توقيع الطلب يساوي الصيغة المكتوبة في العقد حرفيًّا", async () => {
    const h = await signedHeaders();
    const bodyHash = createHash("sha256").update(BODY, "utf8").digest("hex");
    const expected = createHmac("sha256", SECRET)
      .update(`nx-n8n:v1|${TS}|${NONCE}|${PATH}|${bodyHash}`, "utf8")
      .digest("hex");
    expect(h.get(HEADER.sig)).toBe(`v1=${expected}`);
    expect(h.get(HEADER.keyId)).toBe("v1");
    expect(h.get(HEADER.ts)).toBe(String(TS));
    expect(h.get(HEADER.nonce)).toBe(NONCE);
    expect(h.get(HEADER.deadlineMs)).toBe("1800");
  });

  it("توقيع الردّ يساوي الصيغة المكتوبة في العقد حرفيًّا", async () => {
    const body = '{"v":1}';
    const h = await signResponse({ secret: SECRET, respTs: TS, requestNonce: NONCE, body });
    const bodyHash = createHash("sha256").update(body, "utf8").digest("hex");
    const expected = createHmac("sha256", SECRET)
      .update(`nx-n8n:v1:resp|${TS}|${NONCE}|${bodyHash}`, "utf8")
      .digest("hex");
    expect(h[HEADER.respSig]).toBe(`v1=${expected}`);
    expect(h[HEADER.respTs]).toBe(String(TS));
  });
});

describe("② الطلب: ذهابٌ وإياب ورفضُ كل تلاعب", () => {
  const verify = (headers: Headers, over: Partial<VerifyRequestInput> = {}) =>
    verifyRequestSignature({
      secret: SECRET,
      headers,
      path: PATH,
      body: BODY,
      nowSeconds: TS,
      ...over,
    });

  it("طلبٌ سليم يُقبل ويعيد نونسه", async () => {
    expect(await verify(await signedHeaders())).toEqual({ ok: true, nonce: NONCE });
  });

  it("جسمٌ معدَّل بحرف ⇒ signature", async () => {
    expect(await verify(await signedHeaders(), { body: `${BODY} ` })).toEqual({
      ok: false,
      reason: "signature",
    });
  });

  it("مسارٌ آخر ⇒ signature (توقيع سَدِيد لا يصلح لمسار FNN)", async () => {
    expect(await verify(await signedHeaders(), { path: "fnn-research-v1" })).toEqual({
      ok: false,
      reason: "signature",
    });
  });

  it("ختم زمني معدَّل داخل النافذة ⇒ signature", async () => {
    const h = await signedHeaders();
    h.set(HEADER.ts, String(TS + 1));
    expect(await verify(h)).toEqual({ ok: false, reason: "signature" });
  });

  it("نونس معدَّل ⇒ signature", async () => {
    const h = await signedHeaders();
    h.set(HEADER.nonce, "f".repeat(32));
    expect(await verify(h)).toEqual({ ok: false, reason: "signature" });
  });

  it("سرٌّ آخر ⇒ signature (فصل النطاق بين السطحين)", async () => {
    expect(await verify(await signedHeaders(), { secret: OTHER_SECRET })).toEqual({
      ok: false,
      reason: "signature",
    });
  });

  it("انحراف أكثر من 30 ث ⇒ skew؛ وعند 30 بالضبط يُقبل", async () => {
    const h = await signedHeaders();
    const skew: RequestRejection = "skew";
    expect(await verify(h, { nowSeconds: TS + 31 })).toEqual({ ok: false, reason: skew });
    expect(await verify(h, { nowSeconds: TS - 31 })).toEqual({ ok: false, reason: "skew" });
    expect((await verify(h, { nowSeconds: TS + 30 })).ok).toBe(true);
    expect((await verify(h, { nowSeconds: TS - 30 })).ok).toBe(true);
  });

  it("رأسٌ ناقص ⇒ missing؛ وشكلٌ فاسد ⇒ shape", async () => {
    for (const name of [HEADER.keyId, HEADER.ts, HEADER.nonce, HEADER.sig]) {
      const h = await signedHeaders();
      h.delete(name);
      expect(await verify(h)).toEqual({ ok: false, reason: "missing" });
    }
    const badKey = await signedHeaders();
    badKey.set(HEADER.keyId, "v2");
    expect(await verify(badKey)).toEqual({ ok: false, reason: "shape" });
    const badSig = await signedHeaders();
    badSig.set(HEADER.sig, "v1=zz");
    expect(await verify(badSig)).toEqual({ ok: false, reason: "shape" });
    const badTs = await signedHeaders();
    badTs.set(HEADER.ts, "12abc");
    expect(await verify(badTs)).toEqual({ ok: false, reason: "shape" });
    const upper = await signedHeaders();
    upper.set(HEADER.sig, upper.get(HEADER.sig)!.toUpperCase().replace("V1=", "v1="));
    expect(await verify(upper)).toEqual({ ok: false, reason: "shape" });
  });
});

describe("③ الردّ: ما لا يطابق يُسقط كلّه", () => {
  const body = new TextEncoder().encode('{"v":1,"ok":true}');
  async function respHeaders(over: Partial<SignResponseInput> = {}) {
    return new Headers(
      await signResponse({
        secret: SECRET,
        respTs: TS,
        requestNonce: NONCE,
        body,
        ...over,
      }),
    );
  }
  const verify = (headers: Headers, over: Partial<VerifyResponseInput> = {}) =>
    verifyResponseSignature({
      secret: SECRET,
      headers,
      requestNonce: NONCE,
      body,
      nowSeconds: TS,
      ...over,
    });

  it("ردٌّ سليم يُقبل", async () => {
    expect(await verify(await respHeaders())).toBe(true);
  });

  it("جسمٌ معدَّل · سرٌّ آخر · نونس طلبٍ آخر (ردٌّ مُعاد) · ختمٌ قديم ⇒ كلها false", async () => {
    const h = await respHeaders();
    expect(await verify(h, { body: new TextEncoder().encode('{"v":1,"ok":false}') })).toBe(false);
    expect(await verify(h, { secret: OTHER_SECRET })).toBe(false);
    expect(await verify(h, { requestNonce: "f".repeat(32) })).toBe(false);
    expect(await verify(h, { nowSeconds: TS + 31 })).toBe(false);
    expect(await verify(h, { nowSeconds: TS - 31 })).toBe(false);
    expect(await verify(h, { nowSeconds: TS + 30 })).toBe(true);
  });

  it("رأسٌ مفقود أو بشكلٍ فاسد ⇒ false", async () => {
    for (const name of [HEADER.respTs, HEADER.respSig]) {
      const h = await respHeaders();
      h.delete(name);
      expect(await verify(h)).toBe(false);
    }
    const bad = await respHeaders();
    bad.set(HEADER.respSig, "nope");
    expect(await verify(bad)).toBe(false);
  });

  it("فاصل النطاق: توقيع طلبٍ لا يصلح ردًّا ولو تطابقت الحقول", async () => {
    // نفس الأجزاء (ts|nonce|hash) لكن بفاصل الطلب بدل فاصل الردّ.
    const bodyHash = await sha256Hex(body);
    const asRequest = await hmacSha256Hex(SECRET, `nx-n8n:v1|${TS}|${NONCE}|${bodyHash}`);
    const h = new Headers({ [HEADER.respTs]: String(TS), [HEADER.respSig]: `v1=${asRequest}` });
    expect(await verify(h)).toBe(false);
  });
});

describe("④ مقارنة بزمنٍ ثابت ونونس", () => {
  it("constantTimeEqual: تساوٍ، اختلاف حرف، اختلاف طول، فراغ", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
    expect(constantTimeEqual("abcd", "abc")).toBe(false);
    expect(constantTimeEqual("", "")).toBe(true);
    expect(constantTimeEqual("", "a")).toBe(false);
  });

  it("constantTimeEqual لا تقصر عند أول فرق: تمرّ على أطول الطولين (لا خروج مبكر)", () => {
    // لا نقيس زمنًا (هشّ)؛ نثبت البنية: المصدر يمرّ بحلقة على أطول الطولين بلا break/return داخلها.
    const src = constantTimeEqual.toString();
    expect(src).toContain("Math.max");
    expect(src).not.toMatch(/\bbreak\b/);
    // جسم الحلقة تراكمٌ بـ`|=` وحده: لا `if` ولا `return` ولا `continue` داخله.
    expect(src).toMatch(/for \([^)]*\) diff \|= /);
    expect(src).not.toMatch(/\bcontinue\b/);
  });

  it("generateNonce: 16 بايتًا ⇒ 32 رمزًا سداسيًّا، وغير متكرّرة، ومصدر العشوائية قابل للحقن", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
    expect(generateNonce(() => new Uint8Array(16).fill(255))).toBe("f".repeat(32));
    expect(generateNonce(() => Uint8Array.from({ length: 16 }, (_, i) => i))).toBe(
      "000102030405060708090a0b0c0d0e0f",
    );
  });
});
