// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * اتفاقُ جهتَي قناة n8n بلا تشغيل مسار: الثوابت والتوقيع بالبايت والمخطط وجداول الإغلاق وأسماء البيئة.
 *
 * جهة التطبيق (P1): `src/lib/n8n/*`. جهة n8n (P2): `n8n/code/*.js` و`n8n/workflows/*.json` و`n8n/README.md`.
 * المقارنة تتمّ بقراءة **القيمة الفعلية** من كل جهة (تنفيذ دالّة أو استقصاء مخطط أو قراءة JSON المتعقَّب)
 * لا بنسخ الرقم إلى الاختبار، فيحمرّ الفحص حين يتغيّر أحد الطرفين وحده.
 *
 * المادة ٣٠: كل كاشفٍ هنا دالّةٌ تعيد قائمة مشاكل، ويُجرَّب في القسم الأخير على مدخلٍ مزروع فيه الانتهاك
 * (يجب أن تعيد القائمة غير فارغة). فلا يمرّ كاشفٌ أخضر لأنه لا يرى شيئًا.
 */
import { createHmac } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SECRET_ENV, readN8nConfig } from "@/lib/n8n/config.server";
import { ENV_CAPABILITIES } from "@/lib/env/env-manifest";
import {
  ARM_DEADLINE_MS,
  FRESHNESS_VALUES,
  HEADER,
  KEY_ID,
  MAX_RESPONSE_BYTES,
  MAX_SKEW_SECONDS,
  MIN_SECRET_CHARS,
  N8N_PATHS,
  PATH_SURFACE,
  REQUEST_SIG_DOMAIN,
  RESEARCH_MODES,
  RESPONSE_SIG_DOMAIN,
  RUNNER_WORKFLOWS,
  SIG_PREFIX,
} from "@/lib/n8n/protocol";
import {
  researchEnvelopeSchema,
  researchRequestSchema,
  runnerEnvelopeSchema,
  runnerRequestSchema,
} from "@/lib/n8n/schema";
import {
  signRequest as p1SignRequest,
  signResponse as p1SignResponse,
  verifyRequestSignature,
  verifyResponseSignature,
} from "@/lib/n8n/sign.server";
import * as CHECKS from "../test-support/contract-checks.js";
import { NOW, ROOT, SECRET_FNN, SECRET_SADEED, loadCode } from "./helpers.js";

// التلقيح العشوائي والمصفوفات تتجاوز الخمس ثوانٍ الافتراضية تحت حِمل الحزمة الكاملة.
vi.setConfig({ testTimeout: 30_000 });

const V = loadCode("verify-request");
const S = loadCode("sign-response");
const B = loadCode("build-envelope");
const M = loadCode("merge-rank");
const R = loadCode("runner-dispatch");
const PLAN = loadCode("plan-queries");

const WF_DIR = join(ROOT, "n8n", "workflows");
const workflowFiles = readdirSync(WF_DIR).filter((f) => f.endsWith(".json"));
const readWorkflow = (f: string): any => JSON.parse(readFileSync(join(WF_DIR, f), "utf8"));
const ALL_WORKFLOWS: Record<string, any> = Object.fromEntries(
  workflowFiles.map((f) => [f.replace(/\.json$/, ""), readWorkflow(f)]),
);

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const NONCE = "00112233445566778899aabbccddeeff";

// ── ① الثوابت: القيمة الفعلية عند كل جهة ────────────────────────────────────

/** أكبر n في [0, hi] يقبله المخطط (رتيبٌ: يقبل حتى حدٍّ ثم يرفض). */
function largestAccepted(accepts: (n: number) => boolean, hi: number): number {
  let lo = 0;
  let top = hi;
  while (lo < top) {
    const mid = Math.ceil((lo + top) / 2);
    if (accepts(mid)) lo = mid;
    else top = mid - 1;
  }
  return lo;
}

const validEnvelope = () => ({
  v: 1,
  ok: true,
  code: "ok",
  requestId: UUID,
  degraded: false,
  fetchedAt: "2026-10-30T10:00:00.000Z",
  providers: [{ id: "google", status: "ok", ms: 120, n: 1 }],
  results: [
    {
      title: "t",
      url: "https://docs.example.com/a",
      snippet: "s",
      publishedAt: null,
      provider: "google",
    },
  ],
});
const validRunnerEnvelope = () => ({
  v: 1,
  ok: true,
  code: "ok",
  requestId: UUID,
  result: { summary: "s", items: ["a"] },
});

const accepts = (mutate: (e: any) => void): boolean => {
  const e = validEnvelope();
  mutate(e);
  return researchEnvelopeSchema.safeParse(e).success;
};

/** سقوف P1 كما يقيسها استقصاء المخطط نفسه، بوحدة المخطط (نقاط الرمز في zod 4). */
function p1Caps() {
  const rep = (c: string, n: number) => c.repeat(n);
  return {
    title: largestAccepted((n) => accepts((e) => (e.results[0].title = rep("ب", n))), 400),
    snippet: largestAccepted((n) => accepts((e) => (e.results[0].snippet = rep("ب", n))), 1000),
    url: largestAccepted(
      (n) =>
        accepts((e) => (e.results[0].url = "https://a.example/" + rep("a", Math.max(0, n - 18)))),
      1000,
    ),
    results: largestAccepted(
      (n) =>
        accepts((e) => (e.results = Array.from({ length: n }, () => validEnvelope().results[0]))),
      40,
    ),
    providers: largestAccepted(
      (n) =>
        accepts((e) => (e.providers = Array.from({ length: n }, () => ({ ...e.providers[0] })))),
      40,
    ),
    providerId: largestAccepted((n) => accepts((e) => (e.providers[0].id = rep("a", n))), 200),
    providerMs: largestAccepted((n) => accepts((e) => (e.providers[0].ms = n)), 700_000),
    providerN: largestAccepted((n) => accepts((e) => (e.providers[0].n = n)), 500),
    resultProvider: largestAccepted(
      (n) => accepts((e) => (e.results[0].provider = rep("a", n))),
      200,
    ),
    requestId: largestAccepted((n) => accepts((e) => (e.requestId = rep("a", n))), 200),
    summary: largestAccepted((n) => {
      const e = validRunnerEnvelope();
      e.result.summary = rep("ب", n);
      return runnerEnvelopeSchema.safeParse(e).success;
    }, 2000),
    items: largestAccepted((n) => {
      const e = validRunnerEnvelope();
      e.result.items = Array.from({ length: n }, () => "a");
      return runnerEnvelopeSchema.safeParse(e).success;
    }, 40),
    item: largestAccepted((n) => {
      const e = validRunnerEnvelope();
      e.result.items = [rep("ب", n)];
      return runnerEnvelopeSchema.safeParse(e).success;
    }, 1000),
  };
}

/** ما يصدره P2 بحسب كل حقل: يُقاس بتشغيل المُنشِئ على مدخلٍ أطول من أي سقف. */
function p2Emitted() {
  const long = (n: number) => "ب".repeat(n);
  const env = B.buildEnvelope({
    requestId: UUID,
    providers: Array.from({ length: 40 }, (_, i) => ({
      id: "p".repeat(300) + i,
      status: "ok",
      ms: 9_999_999,
      n: 9_999,
    })),
    results: Array.from({ length: 60 }, (_, i) => ({
      title: long(5000),
      url: "https://a.example/" + "a".repeat(200) + i,
      snippet: long(5000),
      publishedAt: "2026-01-01",
      provider: long(500),
    })),
    now: NOW,
  }).envelope;
  const run = B.buildRunnerEnvelope({
    requestId: UUID,
    code: "ok",
    result: { summary: long(9000), items: Array.from({ length: 40 }, () => long(9000)) },
  }).envelope;
  const cp = (s: string) => Array.from(s).length;
  return {
    title: Math.max(...env.results.map((r: any) => cp(r.title))),
    snippet: Math.max(...env.results.map((r: any) => cp(r.snippet))),
    url: Math.max(...env.results.map((r: any) => r.url.length)),
    results: env.results.length,
    providers: env.providers.length,
    providerId: Math.max(...env.providers.map((p: any) => cp(p.id))),
    providerMs: Math.max(...env.providers.map((p: any) => p.ms)),
    providerN: Math.max(...env.providers.map((p: any) => p.n)),
    resultProvider: Math.max(...env.results.map((r: any) => cp(r.provider))),
    requestId: largestAccepted(
      (n) => B.buildEnvelope({ requestId: "a".repeat(n) }).envelope.requestId.length === n,
      200,
    ),
    summary: cp(run.result.summary),
    items: run.result.items.length,
    item: Math.max(...run.result.items.map((i: string) => cp(i))),
  };
}

/** كل سقفٍ يصدره P2 ≤ سقف P1، ورفض P1 ثمرة تجاوزٍ حقيقي. يعيد المشاكل. */
function capProblems(p1: Record<string, number>, p2: Record<string, number>): string[] {
  const problems: string[] = [];
  for (const key of Object.keys(p1)) {
    if (p2[key] === undefined) problems.push(`سقف غير مقيس عند P2: ${key}`);
    else if (p2[key] > p1[key]) problems.push(`P2 يصدر ${key}=${p2[key]} وP1 يقبل حتى ${p1[key]}`);
  }
  return problems;
}

describe("① الثوابت والسقوف: القيمة الفعلية عند كل جهة", () => {
  it("سقوف الغلاف: ما يصدره P2 لا يتجاوز ما يقبله مخطط P1 في أي حقل (وP1 يرفض الغلاف كلّه عند التجاوز)", () => {
    const p1 = p1Caps();
    const p2 = p2Emitted();
    expect(capProblems(p1, p2)).toEqual([]);
    // الأرقام الأساسية في العقد، مقيسة من الطرفين لا منسوخة.
    expect(p1).toMatchObject({
      title: 120,
      snippet: 300,
      url: 300,
      results: 6,
      providers: 8,
      summary: 500,
      items: 10,
      item: 200,
      // حالة المزوّد: الاتجاه «ما يصدره P2 ≤ ما يقبله P1» لا يكشف تخفيف سقف P1، فتُثبَّت قيمه.
      providerMs: 600_000,
      providerN: 100,
    });
    expect(p2).toMatchObject({
      title: 120,
      snippet: 300,
      results: 6,
      providers: 8,
      summary: 500,
      items: 10,
    });
  });

  it("وحدة القياس واحدة: zod يعدّ نقاط الرمز كما يعدّها P2 (إيموجي بالحدّ بالضبط يمرّ، وبزيادة واحدة يُرفض)", () => {
    const emoji = "😀";
    expect(accepts((e) => (e.results[0].title = emoji.repeat(120)))).toBe(true);
    expect(accepts((e) => (e.results[0].title = emoji.repeat(121)))).toBe(false);
    const built = B.buildEnvelope({
      requestId: UUID,
      providers: [{ id: "google", status: "ok", ms: 1, n: 1 }],
      results: [
        {
          title: emoji.repeat(500),
          url: "https://a.example/x",
          snippet: emoji.repeat(900),
          publishedAt: null,
          provider: "google",
        },
      ],
      now: NOW,
    });
    expect(Array.from(built.envelope.results[0].title).length).toBe(120);
    expect(Array.from(built.envelope.results[0].snippet).length).toBe(300);
    expect(researchEnvelopeSchema.safeParse(built.envelope).success).toBe(true);
  });

  it("سقف الجسم: 32768 بايتًا عند P1 (MAX_RESPONSE_BYTES) وعند P2 (MAX_BODY_BYTES) وأكبر غلاف قانوني بعيد عنه", () => {
    expect(B.MAX_BODY_BYTES).toBe(MAX_RESPONSE_BYTES);
    const wide = B.buildEnvelope({
      requestId: UUID,
      providers: Array.from({ length: 8 }, (_, i) => ({
        id: `provider-${i}`,
        status: "error",
        ms: 60000,
        n: 100,
      })),
      results: Array.from({ length: 6 }, (_, i) => ({
        title: '"'.repeat(500),
        url: "https://a.example/" + "a".repeat(200) + i,
        snippet: "😀".repeat(900),
        publishedAt: "2026-01-01T00:00:00Z",
        provider: "google",
      })),
      now: NOW,
    });
    const bytes = Buffer.byteLength(wide.body, "utf8");
    expect(bytes).toBeLessThan(MAX_RESPONSE_BYTES / 2);
    expect(wide.envelope.code).toBe("ok");
  });

  it("الموعد: الرأس الذي يوقّعه P1 (signRequest الحقيقي) يقرؤه Verify عند P2 رقمًا، وما لا يصحّ يُهمل ولا يُرفض الطلب", async () => {
    // المقارنة السابقة كانت بين اسم الرأس عند P1 ومساعد اختبار عند P2؛ هنا ما تقرؤه عقدة Verify فعلًا.
    const body = JSON.stringify({ v: 1, requestId: UUID });
    const cases: Array<[number, number | null]> = [
      [1800, 1800],
      [900, 900],
      [6000, 6000],
      [20_000, 20_000],
      [1, 1],
      [120_000, 120_000],
      [0, null],
      [120_001, null],
      [-5, null],
    ];
    for (const [deadlineMs, expected] of cases) {
      const headers = await p1SignRequest({
        secret: SECRET_SADEED,
        ts: NOW / 1000,
        nonce: NONCE,
        path: "sadeed-research-v1",
        body,
        deadlineMs,
      });
      const verdict = V.verifyRequest({
        headers,
        body: JSON.parse(body),
        rawBodyBase64: Buffer.from(body, "utf8").toString("base64"),
        path: "sadeed-research-v1",
        secret: SECRET_SADEED,
        now: NOW,
        nonces: {},
      });
      expect(verdict.ok, `${deadlineMs}`).toBe(true);
      expect(verdict.deadlineMs, `${deadlineMs}`).toBe(expected);
    }
  });

  it("مهل الأذرع عند P1 = ما يوثّقه README عن P2، ويبقى تحتها هامشٌ للشبكة بعد الموعد الداخلي الأقصى", () => {
    const readme = readFileSync(join(ROOT, "n8n", "README.md"), "utf8");
    const num = (re: RegExp): number => Number(re.exec(readme)?.[1]);
    const documented = {
      "sadeed-research-v1": num(/مهلة التطبيق: (\d+) مللي ثانية لبحث سَدِيد/),
      "fnn-research-v1": num(/و(\d+) لبحث FNN/),
      "fnn-runner-v1": num(/و(\d+) للمشغّل/),
    };
    // تغيير مهلة أحد الأذرع عند P1 وحده (6000 إلى 7000 مثلًا) يحمرّ هنا قبل أن يختلف شيءٌ في الحلقة المغلقة.
    expect({ ...ARM_DEADLINE_MS }).toEqual(documented);
    expect(num(/\(موعد التطبيق (\d+)\)/)).toBe(ARM_DEADLINE_MS["fnn-research-v1"]);
    for (const [flavor, path] of [
      ["sadeed", "sadeed-research-v1"],
      ["fnn", "fnn-research-v1"],
    ] as const) {
      const internal = PLAN.deadlines(flavor, ARM_DEADLINE_MS[path], true).internalDeadlineMs;
      expect(ARM_DEADLINE_MS[path] - internal, path).toBeGreaterThanOrEqual(300);
    }
  });

  it("وحدة الطول واحدة في الطلب أيضًا: كلمات فوق BMP عدّها نقاط رمز (zod) يقبلها P2 بالعدّ نفسه ويرفض ما فوق الحدّ", () => {
    const astral = "\u{20000}";
    const make = (term: string, code: string) => ({
      v: 1,
      requestId: UUID,
      mode: "general",
      brief: { terms: [term], codes: [code], lang: "ar" },
      maxResults: 5,
      freshness: "any",
    });
    const atLimit = make(astral.repeat(40), astral.repeat(24));
    expect(researchRequestSchema.safeParse(atLimit).success).toBe(true);
    expect(PLAN.validateRequest(atLimit, "sadeed")).toMatchObject({ ok: true });
    const overTerm = make(astral.repeat(41), "A");
    expect(researchRequestSchema.safeParse(overTerm).success).toBe(false);
    expect(PLAN.validateRequest(overTerm, "sadeed")).toMatchObject({
      ok: false,
      reason: "bad_terms",
    });
    const overCode = make("x", astral.repeat(25));
    expect(researchRequestSchema.safeParse(overCode).success).toBe(false);
    expect(PLAN.validateRequest(overCode, "sadeed")).toMatchObject({
      ok: false,
      reason: "bad_codes",
    });
  });

  it("قائمتا النطاقات التنظيمية الرسمية عند P2 (تقييد الاستعلام في plan-queries والترتيب في merge-rank) متطابقتان وتضمّان الجهات التي سمّتها المادة ٩", () => {
    expect([...PLAN.OFFICIAL_REGULATORY_DOMAINS].sort()).toEqual(
      [...M.OFFICIAL_BY_MODE.regulatory].sort(),
    );
    for (const domain of ["zatca.gov.sa", "nca.gov.sa", "sdaia.gov.sa"]) {
      expect(PLAN.OFFICIAL_REGULATORY_DOMAINS, domain).toContain(domain);
    }
  });

  it("الانحراف والسرّ والتعدادات: P1 = P2", () => {
    expect(V.SKEW_MS).toBe(MAX_SKEW_SECONDS * 1000);
    expect(V.MIN_SECRET_LENGTH).toBe(MIN_SECRET_CHARS);
    expect(
      S.signResponse({
        secret: "x".repeat(MIN_SECRET_CHARS - 1),
        body: "{}",
        nonce: NONCE,
        now: NOW,
      }).signed,
    ).toBe(false);
    expect(
      S.signResponse({ secret: "x".repeat(MIN_SECRET_CHARS), body: "{}", nonce: NONCE, now: NOW })
        .signed,
    ).toBe(true);
    // الأوضاع لكل سطح: P2 يقبل بالضبط أوضاع P1 ويرفض غيرها.
    for (const [surface, modes] of Object.entries(RESEARCH_MODES)) {
      const accepted = (PLAN.FLAVORS[surface].modes as string[]).slice().sort();
      expect(accepted).toEqual([...modes].sort());
    }
    const freshnessAccepted = ["any", "month", "year", "week", ""].filter(
      (f) =>
        PLAN.validateRequest(
          {
            v: 1,
            requestId: UUID,
            mode: "general",
            brief: { terms: ["x"], codes: [], lang: "en" },
            maxResults: 5,
            freshness: f,
          },
          "sadeed",
        ).ok,
    );
    expect(freshnessAccepted.sort()).toEqual([...FRESHNESS_VALUES].sort());
    // مهلة التطبيق داخل مدى ما يقبله P2 من X-Nx-Deadline-Ms (1 إلى 120000).
    for (const [path, ms] of Object.entries(ARM_DEADLINE_MS)) {
      expect(ms, path).toBeGreaterThanOrEqual(1);
      expect(ms, path).toBeLessThanOrEqual(120_000);
    }
  });

  it("طلب P1 المقبول عند مخططه يقبله P2 دائمًا: السقوف والقيم", () => {
    const base = { v: 1, requestId: UUID, mode: "general", maxResults: 5, freshness: "any" };
    const maxBrief = {
      terms: Array.from({ length: 6 }, () => "ب".repeat(40)),
      codes: Array.from({ length: 4 }, () => "A".repeat(24)),
      lang: "ar",
    };
    expect(researchRequestSchema.safeParse({ ...base, brief: maxBrief }).success).toBe(true);
    expect(PLAN.validateRequest({ ...base, brief: maxBrief }, "sadeed").ok).toBe(true);
    // أقصى maxResults عند P1 لا يتجاوز أقصاه عند P2.
    const p1Max = largestAccepted(
      (n) => researchRequestSchema.safeParse({ ...base, brief: maxBrief, maxResults: n }).success,
      20,
    );
    const p2Max = largestAccepted(
      (n) => PLAN.validateRequest({ ...base, brief: maxBrief, maxResults: n }, "sadeed").ok,
      20,
    );
    expect(p1Max).toBeLessThanOrEqual(p2Max);
    // سقف عدد الكلمات والرموز وطولها: كل ما يمرّ من P1 يمرّ عند P2.
    const termsMax = largestAccepted(
      (n) =>
        researchRequestSchema.safeParse({
          ...base,
          brief: { ...maxBrief, terms: Array.from({ length: n }, () => "a") },
        }).success,
      30,
    );
    expect(
      PLAN.validateRequest(
        { ...base, brief: { ...maxBrief, terms: Array.from({ length: termsMax }, () => "a") } },
        "sadeed",
      ).ok,
    ).toBe(true);
    expect(termsMax).toBe(6);
  });
});

// ── ② التوقيع بالبايت ─────────────────────────────────────────────────────────

// متجهان محسوبان بـopenssl (مستقلّان عن الطرفين):
//   printf 'nx-n8n:v1|1761800000|<nonce>|sadeed-research-v1|<sha256 of {"v":1}>' | openssl dgst -sha256 -hmac <secret>
const GOLDEN = {
  secret: "0123456789abcdef0123456789abcdef",
  nonce: NONCE,
  path: "sadeed-research-v1",
  ts: 1761800000,
  body: '{"v":1}',
  req: "v1=cd86c695120c61381321c00931d287e01d9c558f5559949c3cf88476a8a5b253",
  respBody: '{"v":1,"ok":true}',
  respTs: 1761800001,
  resp: "v1=cd5eb20be2c70ebfd4aa6fbc13188d97400ca8b6d181bf48b3949675dc6ba6d2",
};

describe("② التوقيع: الصيغة والترميز والمفتاح والرؤوس بالبايت", () => {
  it("المتجهان الذهبيان (openssl) يعيدهما الطرفان بالبايت", async () => {
    const p1Req = await p1SignRequest({
      secret: GOLDEN.secret,
      ts: GOLDEN.ts,
      nonce: GOLDEN.nonce,
      path: GOLDEN.path,
      body: GOLDEN.body,
      deadlineMs: 1800,
    });
    expect(p1Req[HEADER.sig]).toBe(GOLDEN.req);
    const p2Req = S.signRequest({
      secret: GOLDEN.secret,
      ts: GOLDEN.ts,
      nonce: GOLDEN.nonce,
      path: GOLDEN.path,
      body: GOLDEN.body,
    });
    expect(p2Req["X-Nx-Sig"]).toBe(GOLDEN.req);
    const p1Resp = await p1SignResponse({
      secret: GOLDEN.secret,
      respTs: GOLDEN.respTs,
      requestNonce: GOLDEN.nonce,
      body: GOLDEN.respBody,
    });
    expect(p1Resp[HEADER.respSig]).toBe(GOLDEN.resp);
    const p2Resp = S.signResponse({
      secret: GOLDEN.secret,
      body: GOLDEN.respBody,
      nonce: GOLDEN.nonce,
      now: GOLDEN.respTs * 1000,
    });
    expect(p2Resp.respSig).toBe(GOLDEN.resp);
  });

  it("أسماء الرؤوس وبادئة التوقيع ومفتاح المفتاح وفواصل النطاق: ثوابت P1 = ما ينتجه P2 ويقرؤه", async () => {
    const p2 = S.signRequest({
      secret: SECRET_SADEED,
      path: "sadeed-research-v1",
      body: "{}",
      ts: 1,
      nonce: NONCE,
    });
    expect(Object.keys(p2).sort()).toEqual(
      [HEADER.keyId, HEADER.ts, HEADER.nonce, HEADER.deadlineMs, HEADER.sig, "Content-Type"].sort(),
    );
    expect(p2[HEADER.keyId]).toBe(KEY_ID);
    expect(p2[HEADER.sig].startsWith(SIG_PREFIX)).toBe(true);
    const p2r = S.signResponse({ secret: SECRET_SADEED, body: "{}", nonce: NONCE, now: NOW });
    expect(Object.keys(p2r.headers).sort()).toEqual([HEADER.respTs, HEADER.respSig].sort());
    // فاصل النطاق: ما يوقّعه P1 بفاصلٍ مغاير لا يقبله P2 (والعكس).
    const wrongDomain = await (async () => {
      const bodyHash = S.sha256hex("{}");
      return S.hmacHex(
        SECRET_SADEED,
        `${RESPONSE_SIG_DOMAIN}1|${NONCE}|sadeed-research-v1|${bodyHash}`,
      );
    })();
    const v = V.verifyRequest({
      headers: {
        "x-nx-key-id": KEY_ID,
        "x-nx-ts": "1",
        "x-nx-nonce": NONCE,
        "x-nx-sig": `${SIG_PREFIX}${wrongDomain}`,
      },
      body: {},
      path: "sadeed-research-v1",
      secret: SECRET_SADEED,
      now: 1000,
      nonces: {},
    });
    expect(v.ok).toBe(false);
    expect(REQUEST_SIG_DOMAIN).not.toBe(RESPONSE_SIG_DOMAIN);
  });

  it("مصفوفة: توقيع كل طرفٍ يقبله الطرف الآخر بأسرارٍ وأجسامٍ ومساراتٍ شتّى (عربي · إيموجي · أسطر · فراغات)", async () => {
    const secrets = [
      SECRET_SADEED,
      SECRET_FNN,
      "سرّ-عربي-طويل-جدًّا-لا-يقلّ-عن-اثنين-وثلاثين-حرفًا",
      "with spaces inside the secret value 0123456789",
      "9f".repeat(32),
    ];
    const bodies = [
      "{}",
      JSON.stringify({ a: "سَدِيد 😀", b: "\n\t", c: "\u2028", d: '"\\/' }),
      JSON.stringify({ blob: "x".repeat(20_000) }),
      JSON.stringify({ v: 1, requestId: UUID }, null, 2),
    ];
    let combos = 0;
    for (const secret of secrets) {
      for (const body of bodies) {
        for (const path of N8N_PATHS) {
          for (const ts of [1, NOW / 1000, 9_999_999_999]) {
            combos++;
            const p1 = await p1SignRequest({
              secret,
              ts,
              nonce: NONCE,
              path,
              body,
              deadlineMs: 1234,
            });
            const p2 = S.signRequest({ secret, ts, nonce: NONCE, path, body, deadlineMs: 1234 });
            expect(p1[HEADER.sig], `${path}`).toBe(p2["X-Nx-Sig"]);
            expect(p1[HEADER.ts]).toBe(p2["X-Nx-Ts"]);
            expect(p1[HEADER.deadlineMs]).toBe(p2["X-Nx-Deadline-Ms"]);
            // P2 يقبل ما وقّعه P1 (المتن الخام).
            const verdict = V.verifyRequest({
              headers: p1,
              body: JSON.parse(body),
              rawBodyBase64: Buffer.from(body, "utf8").toString("base64"),
              path,
              secret,
              now: ts * 1000,
              nonces: {},
            });
            expect(verdict.ok, `${path}|${body.slice(0, 20)}`).toBe(true);
            // والموعد الذي وقّعه P1 يقرؤه Verify نفسه (لا ثابتٌ منسوخ ولا مساعد اختبار): مفتاح الرأس يُقرأ من ثابت P1.
            expect(verdict.deadlineMs, `${path}|deadline`).toBe(1234);
            // وP1 (المرجع) يقبل ما وقّعه P2.
            const p1Verdict = await verifyRequestSignature({
              secret,
              headers: new Headers(p2),
              path,
              body,
              nowSeconds: ts,
            });
            expect(p1Verdict.ok).toBe(true);
            // الردّ: توقيع كل طرف يقبله الآخر.
            const respBody = JSON.stringify({ v: 1, echo: body.slice(0, 40) });
            const p2Resp = S.signResponse({ secret, body: respBody, nonce: NONCE, now: ts * 1000 });
            const accepted = await verifyResponseSignature({
              secret,
              headers: new Headers(p2Resp.headers),
              requestNonce: NONCE,
              body: new TextEncoder().encode(respBody),
              nowSeconds: ts,
            });
            expect(accepted).toBe(true);
            const p1Resp = await p1SignResponse({
              secret,
              respTs: ts,
              requestNonce: NONCE,
              body: respBody,
            });
            expect(
              S.verifyResponse({
                secret,
                respTs: ts,
                nonce: NONCE,
                body: respBody,
                respSig: p1Resp[HEADER.respSig],
                now: ts * 1000,
              }).ok,
            ).toBe(true);
          }
        }
      }
    }
    expect(combos).toBe(5 * 4 * 3 * 3);
  });

  it("المسار داخل التوقيع: طلبٌ موقَّع لمسارٍ لا يصلح لآخر، وسرّ سطحٍ لا يصلح لسطحٍ آخر", async () => {
    for (const path of N8N_PATHS) {
      const signed = await p1SignRequest({
        secret: SECRET_SADEED,
        ts: 1,
        nonce: NONCE,
        path,
        body: "{}",
        deadlineMs: 1,
      });
      for (const other of N8N_PATHS) {
        const verdict = V.verifyRequest({
          headers: signed,
          body: {},
          path: other,
          secret: SECRET_SADEED,
          now: 1000,
          nonces: {},
        });
        expect(verdict.ok, `${path}→${other}`).toBe(path === other);
      }
      const wrongSecret = V.verifyRequest({
        headers: signed,
        body: {},
        path,
        secret: SECRET_FNN,
        now: 1000,
        nonces: {},
      });
      expect(wrongSecret.ok).toBe(false);
    }
  });
});

// ── ③ الغلاف: كل ما يصدره P2 يقبله P1، وكل ما يرفضه P1 لا يصدره P2 ───────────────

/** مولّد شبه عشوائي حتمي. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABET = [
  ..."abcXYZ 0123",
  ..."سَدِيدالأمن",
  ...[
    "😀",
    "👨\u200d👩\u200d👧",
    "𝒳",
    "\u202e",
    "\u200b",
    "\u061c",
    "́",
    "️",
    "<",
    ">",
    "&",
    '"',
    "\\",
    "/",
    "\n",
    "\t",
    "\u0000",
    "\u2028",
    "\u{e0041}",
  ],
];

function randomText(rand: () => number, maxLen: number): string {
  const n = Math.floor(rand() * rand() * maxLen);
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return out;
}

function randomUrl(rand: () => number): string {
  const kinds = [
    () => "https://docs.example.com/" + randomText(rand, 120).replace(/[^a-z0-9]/gi, "x"),
    () => "https://www.example.org/" + "p".repeat(Math.floor(rand() * 400)),
    () => "http://insecure.example.com/a",
    () => "https://user:pw@example.com/a",
    () => "https://hcis.gov.sa/permits",
    () => "https://203.0.113.5/a",
    () => "javascript:alert(1)",
    () => String(randomText(rand, 30)),
  ];
  return kinds[Math.floor(rand() * kinds.length)]();
}

describe("③ الغلاف: P2 لا يصدر ما يرفضه مخطط P1", () => {
  it("تلقيح عشوائي حتمي (1500 غلاف بحث): كل جسمٍ يبنيه P2 صالحٌ عند P1 وتحت السقف", () => {
    const rand = mulberry32(20261030);
    const failures: string[] = [];
    const codes = [
      undefined,
      "all_providers_failed",
      "auth_failed",
      "bad_request",
      "budget_exhausted",
      "internal",
      "ok",
      "no_results",
      "bogus",
    ];
    const statuses = ["ok", "error", "timeout", "skipped", "weird"];
    const shapes = new Set<string>();
    for (let i = 0; i < 1500; i++) {
      const providers = Array.from({ length: Math.floor(rand() * 14) }, () => ({
        id: randomText(rand, 80) || "p",
        status: statuses[Math.floor(rand() * statuses.length)],
        ms: Math.floor(rand() * 2_000_000) - 10,
        n: Math.floor(rand() * 400) - 5,
      }));
      const results = Array.from({ length: Math.floor(rand() * 30) }, () => ({
        title: randomText(rand, 6000),
        url: randomUrl(rand),
        snippet: randomText(rand, 9000),
        publishedAt:
          rand() < 0.5
            ? null
            : ["2026-01-01", "not a date", "9999-12-31T00:00:00Z", "", 12345][
                Math.floor(rand() * 5)
              ],
        provider: randomText(rand, 100) || "g",
      }));
      const built = B.buildEnvelope({
        requestId: UUID,
        code: codes[Math.floor(rand() * codes.length)],
        providers,
        results,
        now: rand() < 0.1 ? "garbage" : NOW + Math.floor(rand() * 1e9),
      });
      const parsed = researchEnvelopeSchema.safeParse(JSON.parse(built.body));
      shapes.add(
        `${built.envelope.code}|${built.envelope.ok}|${built.envelope.results.length > 0}`,
      );
      if (!parsed.success)
        failures.push(
          `${i}: ${parsed.error.issues[0].path.join(".")} ${parsed.error.issues[0].message}`,
        );
      if (Buffer.byteLength(built.body, "utf8") > MAX_RESPONSE_BYTES) failures.push(`${i}: حجم`);
    }
    expect(failures.slice(0, 5)).toEqual([]);
    // تنوّع الأشكال المُولَّدة (كل رمزٍ وكل اقتران ok/code).
    expect(shapes.size).toBeGreaterThanOrEqual(6);
  });

  it("تلقيح عشوائي حتمي (2000 غلاف مشغّل) وملخّصات P2 العدائية: كلها صالحة عند مخطط P1", () => {
    const rand = mulberry32(777);
    const failures: string[] = [];
    const codes = [
      undefined,
      "ok",
      "already_done",
      "unknown_workflow",
      "bad_params",
      "auth_failed",
      "budget_exhausted",
      "internal",
      "bogus",
    ];
    for (let i = 0; i < 2000; i++) {
      const built = B.buildRunnerEnvelope({
        requestId: UUID,
        code: codes[Math.floor(rand() * codes.length)],
        result:
          rand() < 0.15
            ? null
            : {
                summary: randomText(rand, 12_000),
                items: Array.from({ length: Math.floor(rand() * 25) }, () =>
                  rand() < 0.1 ? Math.floor(rand() * 1e6) : randomText(rand, 4000),
                ),
              },
      });
      const parsed = runnerEnvelopeSchema.safeParse(JSON.parse(built.body));
      if (!parsed.success)
        failures.push(
          `${i}: ${parsed.error.issues[0].path.join(".")} ${parsed.error.issues[0].message}`,
        );
    }
    expect(failures.slice(0, 5)).toEqual([]);

    const hostileAdvisories = Array.from({ length: 30 }, (_, i) => ({
      ghsa_id: `GHSA-${i}`,
      severity: "😀".repeat(300),
      summary: "ب".repeat(5000) + "\u202e<script>",
      vulnerabilities: Array.from({ length: 6 }, () => ({ package: { name: "p".repeat(400) } })),
    }));
    const adv = R.summariseAdvisories(
      "engineering_digest",
      { severity: "critical", days: 7 },
      { statusCode: 200, data: JSON.stringify(hostileAdvisories) },
    );
    const canary = R.summariseCanary({
      observed: "down",
      checks: Array.from({ length: 30 }, () => ({
        name: "x".repeat(900),
        status: "down",
        detail: "😀".repeat(900),
      })),
    });
    for (const result of [
      adv,
      canary,
      R.summariseNotify({ error: "x" }),
      R.purgeResearchCache({ researchCache: {} }, "all", NOW),
    ]) {
      const built = B.buildRunnerEnvelope({ requestId: UUID, code: "ok", result });
      expect(runnerEnvelopeSchema.safeParse(JSON.parse(built.body)).success).toBe(true);
    }
  });

  it("رموز الغلاف: مجموعة P1 = مجموعة P2 للبحث وللمشغّل، وتعدادات الحالة كذلك", () => {
    const acceptedCodes = (schema: any, base: () => any, candidates: string[]): string[] =>
      candidates.filter((code) =>
        [true, false].some((ok) => schema.safeParse({ ...base(), code, ok }).success),
      );
    const candidates = [
      ...new Set([...B.RESEARCH_CODES, ...B.RUNNER_CODES, "bogus", "failed", "timeout"]),
    ];
    expect(acceptedCodes(researchEnvelopeSchema, validEnvelope, candidates).sort()).toEqual(
      [...B.RESEARCH_CODES].sort(),
    );
    expect(acceptedCodes(runnerEnvelopeSchema, validRunnerEnvelope, candidates).sort()).toEqual(
      [...B.RUNNER_CODES].sort(),
    );
    const statuses = ["ok", "error", "timeout", "skipped", "pending", "failed", ""].filter(
      (status) => accepts((e) => (e.providers[0].status = status)),
    );
    const p2Statuses = ["ok", "error", "timeout", "skipped", "pending", "failed", ""].filter(
      (status) =>
        B.validateEnvelope({ ...validEnvelope(), providers: [{ id: "g", status, ms: 1, n: 1 }] })
          .length === 0,
    );
    expect(statuses.sort()).toEqual(p2Statuses.sort());
  });

  it("كل ما يرفضه P1 من أشكال الغلاف يرفضه مدقّق P2 أيضًا (فلا يخرج منه)", () => {
    const mutations: Array<[string, (e: any) => void]> = [
      ["مفتاح زائد", (e) => (e.extra = 1)],
      ["مفتاح ناقص", (e) => delete e.degraded],
      ["إصدار 2", (e) => (e.v = 2)],
      ["ok نصّ", (e) => (e.ok = "true")],
      ["رمز مجهول", (e) => (e.code = "bogus")],
      ["اقتران ok=true مع auth_failed", (e) => ((e.code = "auth_failed"), (e.ok = true))],
      ["اقتران ok=false مع ok", (e) => (e.ok = false)],
      ["degraded نصّ", (e) => (e.degraded = "no")],
      ["نتائج 7", (e) => (e.results = Array.from({ length: 7 }, () => validEnvelope().results[0]))],
      ["عنوان 121", (e) => (e.results[0].title = "ب".repeat(121))],
      ["مقتطف 301", (e) => (e.results[0].snippet = "ب".repeat(301))],
      ["رابط 301", (e) => (e.results[0].url = "https://a.example/" + "a".repeat(290))],
      ["حالة مزوّد مجهولة", (e) => (e.providers[0].status = "weird")],
      ["ms سالب", (e) => (e.providers[0].ms = -1)],
      ["n كسري", (e) => (e.providers[0].n = 1.5)],
      ["publishedAt رقم", (e) => (e.results[0].publishedAt = 5)],
      ["مفتاح items بدل results", (e) => ((e.items = e.results), delete e.results)],
      ["حقل زائد داخل نتيجة", (e) => (e.results[0].domain = "x")],
      ["حقل زائد داخل حالة مزوّد", (e) => (e.providers[0].tier = "official")],
    ];
    const gaps: string[] = [];
    for (const [label, mutate] of mutations) {
      const e = validEnvelope();
      mutate(e);
      const p1Rejects = !researchEnvelopeSchema.safeParse(e).success;
      const p2Flags = B.validateEnvelope(e).length > 0;
      expect(p1Rejects, `P1 يرفض: ${label}`).toBe(true);
      if (!p2Flags) gaps.push(label);
    }
    expect(gaps).toEqual([]);
  });

  it("null مقابل الغياب: publishedAt وresult يُرسلان null صريحًا ولا يُحذفان", () => {
    const withAbsent = validEnvelope() as any;
    delete withAbsent.results[0].publishedAt;
    expect(researchEnvelopeSchema.safeParse(withAbsent).success).toBe(false);
    const built = B.buildEnvelope({
      requestId: UUID,
      providers: [{ id: "google", status: "ok", ms: 1, n: 1 }],
      results: [{ title: "t", url: "https://a.example/x", snippet: "s", provider: "google" }],
      now: NOW,
    });
    expect(Object.keys(built.envelope.results[0]).sort()).toEqual([
      "provider",
      "publishedAt",
      "snippet",
      "title",
      "url",
    ]);
    expect(built.envelope.results[0].publishedAt).toBeNull();
    const runner = B.buildRunnerEnvelope({ requestId: UUID, code: "bad_params" });
    expect(runner.envelope).toHaveProperty("result", null);
    expect(runnerEnvelopeSchema.safeParse(runner.envelope).success).toBe(true);
  });
});

// ── ④ الجداول المغلقة ─────────────────────────────────────────────────────────

const webhookPathsOf = (
  workflows: Record<string, any>,
): Record<string, { method: string; file: string }> => {
  const out: Record<string, { method: string; file: string }> = {};
  for (const [file, wf] of Object.entries(workflows)) {
    for (const node of wf.nodes) {
      if (String(node.type).endsWith(".webhook")) {
        out[String(node.parameters.path)] = { method: String(node.parameters.httpMethod), file };
      }
    }
  }
  return out;
};

const secretNamesIn = (wf: any): string[] =>
  [
    ...new Set(
      (JSON.stringify(wf).match(/\$env\.[A-Z0-9_]*_N8N_SECRET/g) ?? []).map((m) => m.slice(5)),
    ),
  ].sort();

const switchCases = (wf: any): string[] => {
  const sw = wf.nodes.find((n: any) => String(n.type).endsWith(".switch"));
  return sw.parameters.rules.values.map((v: any) => v.conditions.conditions[0].rightValue);
};

function tableProblems(workflows: Record<string, any>, readme: string): string[] {
  const problems: string[] = [];
  const hooks = webhookPathsOf(workflows);
  const p2Paths = Object.keys(hooks).sort();
  const p1Paths: string[] = [...N8N_PATHS].sort();
  for (const p of p1Paths) if (!p2Paths.includes(p)) problems.push(`مسار عند P1 فقط: ${p}`);
  for (const p of p2Paths) if (!p1Paths.includes(p)) problems.push(`مسار عند P2 فقط: ${p}`);
  for (const [p, info] of Object.entries(hooks))
    if (info.method !== "POST") problems.push(`${p}: الطريقة ${info.method}`);
  // السرّ الذي يقرؤه كل مسارٍ هو سرّ سطحه عند P1 (وسرٌّ واحد لا غير).
  for (const [p, info] of Object.entries(hooks)) {
    const surface = (PATH_SURFACE as Record<string, string>)[p];
    if (!surface) continue;
    const expected = (SECRET_ENV as Record<string, string>)[surface];
    const used = secretNamesIn(workflows[info.file]);
    if (used.length !== 1 || used[0] !== expected)
      problems.push(`${p}: يقرأ ${used.join("+")} والمتوقع ${expected}`);
  }
  // الكتالوج المغلق للمشغّل: P1 = الدفعة = ملف التبديل في المسار = الجدول الجاف = العقد المكتوب.
  const catalog: string[] = [...RUNNER_WORKFLOWS].sort();
  const sources: Record<string, string[]> = {
    "R.CATALOG": [...R.CATALOG],
    PARAM_SPECS: Object.keys(R.PARAM_SPECS),
    CATALOG_CONTRACT: [...CHECKS.CATALOG_CONTRACT],
    Switch: hooks["fnn-runner-v1"] ? switchCases(workflows[hooks["fnn-runner-v1"].file]) : [],
  };
  for (const [name, ids] of Object.entries(sources)) {
    const s = [...ids].sort();
    for (const id of catalog)
      if (!s.includes(id)) problems.push(`معرّف عند P1 فقط (${name}): ${id}`);
    for (const id of s) if (!catalog.includes(id)) problems.push(`معرّف عند ${name} فقط: ${id}`);
  }
  // README يسرد المسارات نفسها.
  const rows = readme.split("\n").filter((l) => /^\| `/.test(l) && l.includes("webhook") === false);
  const readmePaths = rows
    .map((l) => (l.match(/`([a-z]+-[a-z]+-v\d+)`\s*\|?\s*$/) ?? [])[1])
    .filter(Boolean);
  for (const p of p1Paths) if (!readmePaths.includes(p)) problems.push(`README بلا المسار ${p}`);
  return problems;
}

describe("④ الجداول المغلقة: مساراتُ الويب هوك ومعرّفات المشغّل متطابقة بين الجهتين", () => {
  const readme = readFileSync(join(ROOT, "n8n", "README.md"), "utf8");

  it("مسارات الويب هوك المتعقَّبة = جدول P1 = العقد المكتوب = README، بالطريقة POST وبسرّ سطح كل مسار", () => {
    expect(tableProblems(ALL_WORKFLOWS, readme)).toEqual([]);
    expect(Object.values(CHECKS.CONTRACT_PATHS).sort()).toEqual([...N8N_PATHS].sort());
  });

  it("معرّفات المشغّل: P1 (RUNNER_WORKFLOWS) = كتالوج P2 = جدول المعلمات = ملف التبديل", () => {
    expect([...R.CATALOG].sort()).toEqual([...RUNNER_WORKFLOWS].sort());
    expect(Object.keys(R.PARAM_SPECS).sort()).toEqual([...RUNNER_WORKFLOWS].sort());
    const wf = ALL_WORKFLOWS["fnn-automation-runner"];
    expect(switchCases(wf).sort()).toEqual([...RUNNER_WORKFLOWS].sort());
    // وما يقبله مخطط P1 من معرّفات = الكتالوج بالضبط.
    const accepted = [...RUNNER_WORKFLOWS, "deploy_production", "run_sql", ""].filter(
      (workflow) =>
        runnerRequestSchema.safeParse({ v: 1, requestId: UUID, workflow, params: {} }).success,
    );
    expect(accepted.sort()).toEqual([...RUNNER_WORKFLOWS].sort());
  });

  it("معلمات المشغّل التي يقبلها P2 يمرّرها مخطط P1 (المفاتيح والقيم) فلا يُحجب ما يقبله n8n", () => {
    for (const [workflow, spec] of Object.entries<any>(R.PARAM_SPECS)) {
      const params: Record<string, string | number> = {};
      for (const [key, rule] of Object.entries<any>(spec)) {
        for (const value of rule.type === "int" ? [rule.min, rule.max] : rule.values) {
          params[key] = value;
          expect(
            runnerRequestSchema.safeParse({ v: 1, requestId: UUID, workflow, params }).success,
            `${workflow}.${key}=${value}`,
          ).toBe(true);
          expect(R.validateParams(workflow, params).ok, `${workflow}.${key}=${value}`).toBe(true);
        }
      }
    }
  });

  it("المسارات التي ينادي بها n8n التطبيق (المراقب) موجودة عنده بطريقة GET بلا جسم", () => {
    const routeFiles: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) routeFiles.push(p);
      }
    };
    walk(join(ROOT, "src", "routes"));
    const sources = routeFiles.map((f) => readFileSync(f, "utf8"));
    const called: Array<{
      wf: string;
      node: string;
      path: string;
      method: string;
      sendBody: boolean;
    }> = [];
    for (const [name, wf] of Object.entries(ALL_WORKFLOWS)) {
      for (const node of wf.nodes) {
        const url = node.parameters && node.parameters.url;
        if (typeof url === "string" && url.startsWith("={{ $env.SADEED_APP_URL }}")) {
          called.push({
            wf: name,
            node: node.name,
            path: url.replace("={{ $env.SADEED_APP_URL }}", ""),
            method: node.parameters.method ?? "GET",
            sendBody: Boolean(node.parameters.sendBody),
          });
        }
      }
    }
    expect(called.length).toBeGreaterThan(0);
    expect([...new Set(called.map((c) => c.path))].sort()).toEqual([
      "/api/chat/health",
      "/api/public/health",
    ]);
    for (const c of called) {
      expect(c.method, `${c.wf}/${c.node}`).toBe("GET");
      expect(c.sendBody, `${c.wf}/${c.node}`).toBe(false);
      const owner = sources.find((s) => s.includes(`createFileRoute("${c.path}")`));
      expect(owner, `${c.path} لا مسار له في التطبيق`).toBeTruthy();
      expect(owner as string).toMatch(/GET:\s*async/);
    }
  });
});

// ── ⑤ أسماء البيئة ────────────────────────────────────────────────────────────

/** الأسماء التي يقرؤها `readN8nConfig` فعلًا (استقصاء بوكيل لا قراءة نص). */
function namesReadByConfig(): string[] {
  const names = new Set<string>();
  const env = new Proxy({} as Record<string, string | undefined>, {
    get: (_t, key) => {
      if (typeof key === "string") names.add(key);
      return undefined;
    },
  });
  readN8nConfig(env);
  return [...names].sort();
}

const manifestNames = (): string[] =>
  ENV_CAPABILITIES.filter((c) => ["sadeed-web-research", "fnn-n8n"].includes(c.key))
    .flatMap((c) => c.vars.map((v) => v.name))
    .sort();

function envProblems(args: {
  config: string[];
  manifest: string[];
  envExample: string;
  workflows: Record<string, any>;
  readme: string;
  codeSources: string[];
}): string[] {
  const problems: string[] = [];
  const { config, manifest, envExample, workflows, readme } = args;
  const configSet = new Set(config);
  for (const n of config)
    if (!manifest.includes(n)) problems.push(`يقرؤه الإعداد ولا يذكره البيان: ${n}`);
  for (const n of manifest)
    if (!configSet.has(n)) problems.push(`في البيان ولا يقرؤه الإعداد: ${n}`);
  const exampleNames = new Set([...envExample.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]));
  for (const n of config) if (!exampleNames.has(n)) problems.push(`غائب من .env.example: ${n}`);
  // أسماء الأسرار عند n8n (كل ما يقرأ كتلة $env في المسارات والشيفرة) = أسماء P1.
  const n8nSecretNames = new Set<string>();
  for (const text of [JSON.stringify(workflows), ...args.codeSources]) {
    for (const m of text.matchAll(/\$env\.([A-Z][A-Z0-9_]*_N8N_SECRET)/g)) n8nSecretNames.add(m[1]);
  }
  const p1Secrets = Object.values(SECRET_ENV);
  for (const n of p1Secrets)
    if (!n8nSecretNames.has(n)) problems.push(`سرّ عند P1 لا يقرؤه n8n: ${n}`);
  for (const n of n8nSecretNames)
    if (!p1Secrets.includes(n)) problems.push(`سرّ يقرؤه n8n ولا يعرفه P1: ${n}`);
  // README يسمّي كل اسمٍ بين backticks، ولا يخلط سرَّي السطحين.
  for (const n of config) if (!readme.includes("`" + n + "`")) problems.push(`README لا يذكر ${n}`);
  if (new Set(p1Secrets).size !== p1Secrets.length) problems.push("اسما السرّين متطابقان");
  // أسماء n8n وحدها (NX_* · SADEED_APP_URL · N8N_*) لا تتسرّب إلى بيان التطبيق.
  const n8nOnly = new Set<string>();
  for (const m of JSON.stringify(workflows).matchAll(/\$env\.([A-Z][A-Z0-9_]*)/g))
    n8nOnly.add(m[1]);
  for (const n of n8nOnly) {
    if (config.includes(n)) continue;
    if (manifest.includes(n) || exampleNames.has(n))
      problems.push(`اسمٌ خاص بـn8n في جهة التطبيق: ${n}`);
  }
  return problems;
}

describe("⑤ أسماء البيئة: التطبيق (config · البيان · .env.example) وn8n (المسارات · README)", () => {
  const readme = readFileSync(join(ROOT, "n8n", "README.md"), "utf8");
  const envExample = readFileSync(join(ROOT, ".env.example"), "utf8");
  const codeSources = readdirSync(join(ROOT, "n8n", "code"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => readFileSync(join(ROOT, "n8n", "code", f), "utf8"));

  it("الأسماء الخمسة متطابقة في كل موضع، وسرّا السطحين منفصلان باسمين لا يتداخلان", () => {
    const config = namesReadByConfig();
    expect(config).toEqual(
      [
        "FINN_N8N_SECRET",
        "SADEED_N8N_BASE_URL",
        "SADEED_N8N_SECRET",
        "SADEED_WEB_DISABLED",
        "SADEED_WEB_RESEARCH",
      ].sort(),
    );
    expect(
      envProblems({
        config,
        manifest: manifestNames(),
        envExample,
        workflows: ALL_WORKFLOWS,
        readme,
        codeSources,
      }),
    ).toEqual([]);
    expect(SECRET_ENV).toEqual({ sadeed: "SADEED_N8N_SECRET", fnn: "FINN_N8N_SECRET" });
  });

  it("سرٌّ واحد مكرّر في السطحين يعطّلهما (قيدٌ عند P1)، ومسار كل سطح يقرأ سرَّه وحده عند n8n", () => {
    const same = "same-secret-0123456789-abcdefghijklmnop";
    const cfg = readN8nConfig({
      SADEED_N8N_BASE_URL: "https://n8n.example.com",
      SADEED_N8N_SECRET: same,
      FINN_N8N_SECRET: same,
    });
    expect(cfg.secrets).toEqual({ sadeed: null, fnn: null });
    for (const [file, wf] of Object.entries(ALL_WORKFLOWS)) {
      const used = secretNamesIn(wf);
      if (file === "sadeed-web-research") expect(used).toEqual(["SADEED_N8N_SECRET"]);
      else if (file === "fnn-dev-research" || file === "fnn-automation-runner")
        expect(used).toEqual(["FINN_N8N_SECRET"]);
      else expect(used, file).toEqual([]);
    }
  });
});

// ── ⑥ انتهاكات مزروعة (المادة ٣٠) ─────────────────────────────────────────────

describe("⑥ انتهاكات مزروعة: كل كاشفٍ أعلاه يحمرّ على مدخلٍ مخالف", () => {
  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
  const readme = readFileSync(join(ROOT, "n8n", "README.md"), "utf8");
  const envExample = readFileSync(join(ROOT, ".env.example"), "utf8");
  const baseEnv = () => ({
    config: namesReadByConfig(),
    manifest: manifestNames(),
    envExample,
    workflows: ALL_WORKFLOWS,
    readme,
    codeSources: [] as string[],
  });

  it("سقف: P2 يصدر 121 عنوانًا أو 9 مزوّدين أو 11 بندًا ⇒ كاشف السقوف يحمرّ", () => {
    const p1 = p1Caps();
    const p2 = p2Emitted();
    expect(capProblems(p1, { ...p2, title: 121 })).toHaveLength(1);
    expect(capProblems(p1, { ...p2, providers: 9 })).toHaveLength(1);
    expect(capProblems(p1, { ...p2, items: 11 })).toHaveLength(1);
    const missing: Record<string, number> = { ...p2 };
    delete missing.snippet;
    expect(capProblems(p1, missing)).toHaveLength(1);
  });

  it("مسار: مسار زائد عند n8n أو ناقص، أو طريقة GET، أو سرّ سطحٍ خاطئ ⇒ كاشف الجداول يحمرّ", () => {
    const extra = clone(ALL_WORKFLOWS);
    extra["sadeed-web-research"].nodes.push({
      type: "n8n-nodes-base.webhook",
      name: "Extra",
      parameters: { path: "sadeed-admin-v1", httpMethod: "POST" },
    });
    expect(tableProblems(extra, readme).join("|")).toContain("مسار عند P2 فقط: sadeed-admin-v1");

    const missing = clone(ALL_WORKFLOWS);
    delete missing["fnn-dev-research"];
    expect(tableProblems(missing, readme).join("|")).toContain("مسار عند P1 فقط: fnn-research-v1");

    const get = clone(ALL_WORKFLOWS);
    get["sadeed-web-research"].nodes.find((n: any) =>
      String(n.type).endsWith(".webhook"),
    ).parameters.httpMethod = "GET";
    expect(tableProblems(get, readme).join("|")).toContain("الطريقة GET");

    const crossed = JSON.parse(
      JSON.stringify(ALL_WORKFLOWS).split("FINN_N8N_SECRET").join("SADEED_N8N_SECRET"),
    );
    expect(tableProblems(crossed, readme).join("|")).toContain(
      "يقرأ SADEED_N8N_SECRET والمتوقع FINN_N8N_SECRET",
    );
  });

  it("معرّف: معرّف سادس في ملف التبديل أو ناقص منه ⇒ كاشف الكتالوج يحمرّ", () => {
    const six = clone(ALL_WORKFLOWS);
    const sw = six["fnn-automation-runner"].nodes.find((n: any) =>
      String(n.type).endsWith(".switch"),
    );
    const extra = clone(sw.parameters.rules.values[0]);
    extra.conditions.conditions[0].rightValue = "deploy_production";
    sw.parameters.rules.values.push(extra);
    expect(tableProblems(six, readme).join("|")).toContain(
      "معرّف عند Switch فقط: deploy_production",
    );

    const five = clone(ALL_WORKFLOWS);
    const sw5 = five["fnn-automation-runner"].nodes.find((n: any) =>
      String(n.type).endsWith(".switch"),
    );
    sw5.parameters.rules.values.pop();
    expect(tableProblems(five, readme).join("|")).toContain(
      "معرّف عند P1 فقط (Switch): owner_notify_test",
    );
  });

  it("اسم: اسم ناقص من البيان أو من .env.example أو README، أو سرّ باسمٍ مختلف عند n8n ⇒ كاشف البيئة يحمرّ", () => {
    const noManifest = {
      ...baseEnv(),
      manifest: manifestNames().filter((n) => n !== "SADEED_N8N_BASE_URL"),
    };
    expect(envProblems(noManifest).join("|")).toContain(
      "يقرؤه الإعداد ولا يذكره البيان: SADEED_N8N_BASE_URL",
    );
    const noExample = {
      ...baseEnv(),
      envExample: envExample.replace(/^SADEED_WEB_DISABLED=.*$/m, ""),
    };
    expect(envProblems(noExample).join("|")).toContain("غائب من .env.example: SADEED_WEB_DISABLED");
    const noReadme = {
      ...baseEnv(),
      readme: readme.split("`SADEED_N8N_BASE_URL`").join("SADEED_N8N_BASE_URL"),
    };
    expect(envProblems(noReadme).join("|")).toContain("README لا يذكر SADEED_N8N_BASE_URL");
    const renamed = {
      ...baseEnv(),
      workflows: JSON.parse(
        JSON.stringify(ALL_WORKFLOWS).split("$env.FINN_N8N_SECRET").join("$env.FNN_N8N_SECRET"),
      ),
    };
    const joined = envProblems(renamed).join("|");
    expect(joined).toContain("سرّ عند P1 لا يقرؤه n8n: FINN_N8N_SECRET");
    expect(joined).toContain("سرّ يقرؤه n8n ولا يعرفه P1: FNN_N8N_SECRET");
    const leaking = {
      ...baseEnv(),
      manifest: [...manifestNames(), "NX_GOOGLE_CX"],
      config: [...namesReadByConfig()],
    };
    expect(envProblems(leaking).join("|")).toContain("اسمٌ خاص بـn8n في جهة التطبيق: NX_GOOGLE_CX");
  });

  it("توقيع: فاصل نطاق مبدَّل أو ترميز base64 أو ثوانٍ بالمللي ⇒ المقارنة بالمتجه الذهبي تفشل", async () => {
    const withDomain = (domain: string) =>
      S.hmacHex(
        GOLDEN.secret,
        `${domain}${GOLDEN.ts}|${GOLDEN.nonce}|${GOLDEN.path}|${S.sha256hex(GOLDEN.body)}`,
      );
    expect(`v1=${await withDomain(REQUEST_SIG_DOMAIN)}`).toBe(GOLDEN.req);
    expect(`v1=${await withDomain("nx-n8n:v2|")}`).not.toBe(GOLDEN.req);
    const b64 = createHmac("sha256", GOLDEN.secret)
      .update(
        `${REQUEST_SIG_DOMAIN}${GOLDEN.ts}|${GOLDEN.nonce}|${GOLDEN.path}|${S.sha256hex(GOLDEN.body)}`,
      )
      .digest("base64");
    expect(`v1=${b64}`).not.toBe(GOLDEN.req);
    const ms = S.hmacHex(
      GOLDEN.secret,
      `${REQUEST_SIG_DOMAIN}${GOLDEN.ts * 1000}|${GOLDEN.nonce}|${GOLDEN.path}|${S.sha256hex(GOLDEN.body)}`,
    );
    expect(`v1=${ms}`).not.toBe(GOLDEN.req);
    const crlf = S.hmacHex(
      GOLDEN.secret,
      `${REQUEST_SIG_DOMAIN}${GOLDEN.ts}|${GOLDEN.nonce}|${GOLDEN.path}|${S.sha256hex(GOLDEN.body + "\n")}`,
    );
    expect(`v1=${crlf}`).not.toBe(GOLDEN.req);
  });
});
