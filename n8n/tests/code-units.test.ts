// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * اختبارات وحدة لشيفرة عقد n8n (n8n/code/*.js) مع أعطال مزروعة (المادة ٣٠).
 *
 * النمط: لكل وحدة «مجموعة فحوص» تعيد أسماء الفحوص الفاشلة. على الوحدة الحقيقية يجب أن تكون
 * القائمة فارغة؛ وعلى نسخة معطوبة عمدًا (تعديل نصّي مؤكَّد التطبيق) يجب أن يحمرّ الفحص المسمّى.
 * فحصٌ لا يحمرّ حين يُزرع العطل ليس حارسًا.
 */
import { describe, expect, it } from "vitest";
import { FIXTURES } from "../test-support/fixtures.js";
import { loadCode } from "./helpers.js";

const SECRET = "0123456789abcdef0123456789abcdef";
const NONCE = "00112233445566778899aabbccddeeff";
const TS = 1761800000;
const GOLDEN_REQ = "v1=cd86c695120c61381321c00931d287e01d9c558f5559949c3cf88476a8a5b253";
const GOLDEN_RESP = "v1=cd5eb20be2c70ebfd4aa6fbc13188d97400ca8b6d181bf48b3949675dc6ba6d2";
const UUID = "123e4567-e89b-42d3-a456-426614174000";

/** فحص يُحسب فاشلًا (false) إن رمى: كي لا يوقف عطلٌ مزروع المجموعة كلها بدل أن يحمرّ فحصٌ مسمّى. */
const safely = (fn: () => boolean) => {
  try {
    return fn();
  } catch (e) {
    return false;
  }
};

type Mutation = { from: string; to: string };
type Suite = (m: any) => string[];

function expectRedOnPlanted(
  moduleName: string,
  suite: Suite,
  planted: { name: string; mutation: Mutation; red: string }[],
  extra: string[] = [],
) {
  describe(moduleName + ": الفحوص خضراء على الحقيقي وتحمرّ على العطل المزروع", () => {
    it("الوحدة الحقيقية بلا فحص فاشل", () => {
      expect(suite(loadCode(moduleName, undefined))).toEqual([]);
    });
    it("المجموعة غير فارغة (لا فحص فوق مجموعة فارغة)", () => {
      expect(planted.length).toBeGreaterThan(0);
    });
    for (const p of planted) {
      it("عطل مزروع: " + p.name + " ⇒ يحمرّ «" + p.red + "»", () => {
        const failed = suite(loadCode(moduleName, p.mutation));
        expect(failed).toContain(p.red);
      });
    }
    for (const note of extra) it(note, () => undefined);
  });
}

// ---------------------------------------------------------------------------
// verify-request
// ---------------------------------------------------------------------------
const verifySuite: Suite = (V) => {
  const failed: string[] = [];
  const S = loadCode("sign-response");
  const must = (name: string, ok: boolean) => ok || failed.push(name);
  const body = { v: 1 };
  const headers = (over: any = {}) => ({
    "x-nx-key-id": "v1",
    "x-nx-ts": String(TS),
    "x-nx-nonce": NONCE,
    "x-nx-sig": GOLDEN_REQ,
    ...over,
  });
  const base = { body, path: "sadeed-research-v1", secret: SECRET, now: TS * 1000, nonces: {} };
  const v = (o: any = {}) => V.verifyRequest({ ...base, headers: headers(), ...o });

  must("golden request accepted", v().ok === true);
  must(
    "golden vector matches independent openssl",
    S.signRequest({
      secret: SECRET,
      path: "sadeed-research-v1",
      body: '{"v":1}',
      ts: TS,
      nonce: NONCE,
    })["X-Nx-Sig"] === GOLDEN_REQ,
  );
  must("skew +31s rejected", v({ now: TS * 1000 + 31000 }).reason === "skew");
  must("skew -31s rejected", v({ now: TS * 1000 - 31000 }).reason === "skew");
  must("skew 30s boundary accepted", v({ now: TS * 1000 + 30000 }).ok === true);
  const first = v();
  must("replay rejected", v({ nonces: first.nonces, now: TS * 1000 + 1000 }).reason === "replay");
  // نونس مكرَّر بعد 119 ث (طابع جديد وتوقيع جديد) ما زال تكرارًا؛ وبعد 121 ث يُقبل.
  const resign = (dt: number) => {
    const ts = TS + dt;
    const h = S.signRequest({
      secret: SECRET,
      path: "sadeed-research-v1",
      body: '{"v":1}',
      ts,
      nonce: NONCE,
    });
    return V.verifyRequest({
      headers: h,
      body,
      path: "sadeed-research-v1",
      secret: SECRET,
      now: ts * 1000,
      nonces: first.nonces,
    });
  };
  must("replay window 119s still rejected", resign(119).reason === "replay");
  must("replay window expires after 121s", resign(121).ok === true);
  // السقف: 5001 نونسًا فيبقى 5000 ويُطرد الأقدم.
  const full: any = {};
  for (let i = 0; i < 4999; i += 1) full[i.toString(16).padStart(32, "0")] = TS * 1000 + 100000 + i;
  const at5000 = V.rememberNonce(full, "f".repeat(32), TS * 1000);
  const at5001 = V.rememberNonce(at5000.store, "e".repeat(32), TS * 1000);
  must(
    "nonce store capped at 5000",
    Object.keys(at5000.store).length === 5000 && Object.keys(at5001.store).length === 5000,
  );
  must(
    "oldest nonce evicted at cap",
    at5001.store["0".repeat(32)] === undefined &&
      at5001.store["e".repeat(32)] !== undefined &&
      at5001.evicted === 1,
  );
  must("tampered body rejected", v({ body: { v: 2 } }).reason === "bad_signature");
  must("path bound into signature", v({ path: "fnn-runner-v1" }).reason === "bad_signature");
  must("wrong secret rejected", v({ secret: "x".repeat(40) }).reason === "bad_signature");
  must("short secret is internal not auth", v({ secret: "short" }).code === "internal");
  must("missing secret is internal", v({ secret: undefined }).code === "internal");
  must("bad key id rejected", v({ headers: headers({ "x-nx-key-id": "v2" }) }).ok === false);
  must("bad nonce format rejected", v({ headers: headers({ "x-nx-nonce": "zz" }) }).ok === false);
  must("bad sig format rejected", v({ headers: headers({ "x-nx-sig": "v1=abc" }) }).ok === false);
  must("non-numeric ts rejected", v({ headers: headers({ "x-nx-ts": "17618x" }) }).ok === false);
  must(
    "header names case-insensitive",
    v({
      headers: {
        "X-Nx-Key-Id": "v1",
        "X-NX-TS": String(TS),
        "X-Nx-Nonce": NONCE,
        "X-Nx-Sig": GOLDEN_REQ,
      },
    }).ok === true,
  );
  must("failed auth does not store nonce", Object.keys(v({ body: { v: 2 } }).nonces).length === 0);
  must("success stores exactly one nonce", Object.keys(first.nonces).length === 1);
  must(
    "input store not mutated",
    (() => {
      const s = {};
      v({ nonces: s });
      return Object.keys(s).length === 0;
    })(),
  );
  // المتن الخام المنسَّق ≠ القانوني: يُقبل بالخام ويُرفض بدونه.
  const pretty = JSON.stringify(body, null, 2);
  const prettyHeaders = S.signRequest({
    secret: SECRET,
    path: "sadeed-research-v1",
    body: pretty,
    ts: TS,
    nonce: NONCE,
  });
  const rawB64 = Buffer.from(pretty, "utf8").toString("base64");
  must(
    "raw body candidate accepted",
    V.verifyRequest({ ...base, headers: prettyHeaders, rawBodyBase64: rawB64 }).bodySource ===
      "raw",
  );
  must(
    "raw absent: pretty-signed body rejected (no leniency)",
    V.verifyRequest({ ...base, headers: prettyHeaders }).ok === false,
  );
  must(
    "garbage raw falls back to canonical",
    V.verifyRequest({ ...base, headers: headers(), rawBodyBase64: "ZmlsZXN5c3RlbS12Mg==" })
      .bodySource === "canonical",
  );
  must(
    "never throws on garbage",
    (() => {
      try {
        V.verifyRequest(undefined);
        V.verifyRequest(null);
        V.verifyRequest({ headers: 5, body: () => 1, nonces: "x" });
        return true;
      } catch (e) {
        return false;
      }
    })(),
  );
  must(
    "claims nonce even on failure",
    V.verifyRequest({ ...base, headers: headers(), body: { v: 2 } }).claimedNonce === NONCE,
  );
  return failed;
};

expectRedOnPlanted("verify-request", verifySuite, [
  {
    name: "انحراف 30 ث ← 30000 ث",
    mutation: { from: "const SKEW_MS = 30000;", to: "const SKEW_MS = 30000000;" },
    red: "skew +31s rejected",
  },
  {
    name: "مدة النونس 120 ث ← 1 ث",
    mutation: { from: "const NONCE_TTL_MS = 120000;", to: "const NONCE_TTL_MS = 1000;" },
    red: "replay window 119s still rejected",
  },
  {
    name: "مدة النونس 120 ث ← عمر مضاعف",
    mutation: { from: "const NONCE_TTL_MS = 120000;", to: "const NONCE_TTL_MS = 120000000;" },
    red: "replay window expires after 121s",
  },
  {
    name: "سقف 5000 ← بلا سقف",
    mutation: { from: "const NONCE_CAP = 5000;", to: "const NONCE_CAP = 50000000;" },
    red: "nonce store capped at 5000",
  },
  {
    name: "حذف فحص التكرار",
    mutation: { from: 'if (nonces[nonce] !== undefined) return fail("replay", nonces);', to: "" },
    red: "replay rejected",
  },
  {
    name: "قبول أي توقيع",
    mutation: {
      from: 'if (constantTimeEqual(expected, signature) && matched === "") matched = candidate.source;',
      to: 'if (matched === "") matched = candidate.source;',
    },
    red: "tampered body rejected",
  },
  {
    name: "إسقاط المسار من النص الموقَّع",
    mutation: {
      from: '"nx-n8n:v1|" + ts + "|" + nonce + "|" + path + "|" + sha256hex(candidate.text)',
      to: '"nx-n8n:v1|" + ts + "|" + nonce + "|" + sha256hex(candidate.text)',
    },
    red: "golden request accepted",
  },
  {
    name: "بصمة المتن ثابتة",
    mutation: { from: "sha256hex(candidate.text)", to: 'sha256hex("")' },
    red: "golden request accepted",
  },
  {
    name: "حدّ السرّ الأدنى 32 ← 1",
    mutation: { from: "const MIN_SECRET_LENGTH = 32;", to: "const MIN_SECRET_LENGTH = 1;" },
    red: "short secret is internal not auth",
  },
]);

// ---------------------------------------------------------------------------
// sign-response
// ---------------------------------------------------------------------------
const signSuite: Suite = (S) => {
  const failed: string[] = [];
  const must = (name: string, ok: boolean) => ok || failed.push(name);
  const r = S.signResponse({
    secret: SECRET,
    body: '{"v":1,"ok":true}',
    nonce: NONCE,
    now: 1761800001000,
  });
  must("golden response matches independent openssl", r.respSig === GOLDEN_RESP);
  must("respTs is unix seconds", r.respTs === "1761800001");
  must(
    "headers carry both names",
    r.headers["X-Nx-Resp-Ts"] === "1761800001" && r.headers["X-Nx-Resp-Sig"] === GOLDEN_RESP,
  );
  must(
    "nonce changes signature",
    S.signResponse({
      secret: SECRET,
      body: '{"v":1,"ok":true}',
      nonce: "1".repeat(32),
      now: 1761800001000,
    }).respSig !== GOLDEN_RESP,
  );
  must(
    "body changes signature",
    S.signResponse({ secret: SECRET, body: '{"v":1,"ok":false}', nonce: NONCE, now: 1761800001000 })
      .respSig !== GOLDEN_RESP,
  );
  must(
    "ts changes signature",
    S.signResponse({ secret: SECRET, body: '{"v":1,"ok":true}', nonce: NONCE, now: 1761800002000 })
      .respSig !== GOLDEN_RESP,
  );
  must(
    "no secret ⇒ unsigned",
    S.signResponse({ secret: "", body: "x", nonce: NONCE, now: 1 }).signed === false,
  );
  must(
    "short secret ⇒ unsigned",
    S.signResponse({ secret: "short", body: "x", nonce: NONCE, now: 1 }).signed === false,
  );
  must(
    "never throws",
    (() => {
      try {
        S.signResponse(undefined);
        S.signResponse({ secret: SECRET, body: 5, nonce: {} });
        return true;
      } catch (e) {
        return false;
      }
    })(),
  );
  must(
    "response domain differs from request domain",
    S.signResponse({ secret: SECRET, body: "{}", nonce: NONCE, now: TS * 1000 }).respSig !==
      S.signRequest({ secret: SECRET, path: "p", body: "{}", ts: TS, nonce: NONCE })["X-Nx-Sig"],
  );
  must(
    "client verifies good response",
    S.verifyResponse({
      secret: SECRET,
      nonce: NONCE,
      body: '{"v":1,"ok":true}',
      respTs: "1761800001",
      respSig: GOLDEN_RESP,
      now: 1761800001000,
    }).ok === true,
  );
  must(
    "client rejects stale response",
    S.verifyResponse({
      secret: SECRET,
      nonce: NONCE,
      body: '{"v":1,"ok":true}',
      respTs: "1761800001",
      respSig: GOLDEN_RESP,
      now: 1761800001000 + 31000,
    }).ok === false,
  );
  return failed;
};

expectRedOnPlanted("sign-response", signSuite, [
  {
    name: "نطاق الردّ ← نطاق الطلب",
    mutation: {
      from: '"nx-n8n:v1:resp|" + respTs + "|" + nonce + "|" + sha256hex(body)',
      to: '"nx-n8n:v1|" + respTs + "|" + nonce + "|" + sha256hex(body)',
    },
    red: "golden response matches independent openssl",
  },
  {
    name: "إسقاط النونس من التوقيع",
    mutation: {
      from: '"nx-n8n:v1:resp|" + respTs + "|" + nonce + "|" + sha256hex(body)',
      to: '"nx-n8n:v1:resp|" + respTs + "|" + sha256hex(body)',
    },
    red: "golden response matches independent openssl",
  },
  {
    name: "توقيع بلا سرّ",
    mutation: {
      from: 'if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) {',
      to: "if (false) {",
    },
    red: "no secret ⇒ unsigned",
  },
]);

// ---------------------------------------------------------------------------
// plan-queries
// ---------------------------------------------------------------------------
const brief = (over: any = {}) => ({
  v: 1,
  requestId: UUID,
  mode: "regulatory",
  brief: { terms: ["permit", "hot work"], codes: ["SEC-12"], lang: "en" },
  maxResults: 5,
  freshness: "any",
  ...over,
});

const planSuite: Suite = (P) => {
  const failed: string[] = [];
  const must = (name: string, ok: boolean) => ok || failed.push(name);
  const plan = (body: any, extra: any = {}) =>
    P.planQueries({
      flavor: "sadeed",
      body,
      env: { googleCx: "cx" },
      now: 1793330000000,
      deadlineMs: 1800,
      ...extra,
    });
  const good = plan(brief());
  must("valid request plans", good.ok === true);
  const invalid: [string, any][] = [
    ["null body", null],
    ["array body", []],
    ["wrong version", brief({ v: 2 })],
    ["bad uuid", brief({ requestId: "nope" })],
    ["bad mode", brief({ mode: "everything" })],
    [
      "seven terms",
      brief({ brief: { terms: ["a", "b", "c", "d", "e", "f", "g"], codes: [], lang: "en" } }),
    ],
    ["41-char term", brief({ brief: { terms: ["x".repeat(41)], codes: [], lang: "en" } })],
    [
      "five codes",
      brief({ brief: { terms: ["a"], codes: ["a", "b", "c", "d", "e"], lang: "en" } }),
    ],
    ["25-char code", brief({ brief: { terms: ["a"], codes: ["c".repeat(25)], lang: "en" } })],
    ["bad lang", brief({ brief: { terms: ["a"], codes: [], lang: "fr" } })],
    ["missing brief", brief({ brief: undefined })],
    ["non-string term", brief({ brief: { terms: [5], codes: [], lang: "en" } })],
    ["maxResults 0", brief({ maxResults: 0 })],
    ["maxResults 7", brief({ maxResults: 7 })],
    ["maxResults 1.5", brief({ maxResults: 1.5 })],
    ["bad freshness", brief({ freshness: "week" })],
    ["empty after sanitise", brief({ brief: { terms: ["::: ((( )))"], codes: [], lang: "en" } })],
  ];
  must("invalid list non-empty", invalid.length > 10);
  for (const [name, body] of invalid) {
    const r = plan(body);
    must("rejects: " + name, r.ok === false && r.code === "bad_request");
  }
  // سبب الرفض باسمه (لا مجرد ok:false)، لأن المسار يعيد الجسم bad_request ويُسجَّل السبب.
  const reasons: [string, any, string][] = [
    ["null body", null, "not_object"],
    ["array body", [], "not_object"],
    ["wrong version", brief({ v: 2 }), "bad_version"],
    ["bad uuid", brief({ requestId: "nope" }), "bad_request_id"],
    ["bad mode", brief({ mode: "everything" }), "bad_mode"],
    [
      "seven terms",
      brief({ brief: { terms: ["a", "b", "c", "d", "e", "f", "g"], codes: [], lang: "en" } }),
      "bad_terms",
    ],
    [
      "41-char term",
      brief({ brief: { terms: ["x".repeat(41)], codes: [], lang: "en" } }),
      "bad_terms",
    ],
    ["non-string term", brief({ brief: { terms: [5], codes: [], lang: "en" } }), "bad_terms"],
    [
      "five codes",
      brief({ brief: { terms: ["a"], codes: ["a", "b", "c", "d", "e"], lang: "en" } }),
      "bad_codes",
    ],
    [
      "25-char code",
      brief({ brief: { terms: ["a"], codes: ["c".repeat(25)], lang: "en" } }),
      "bad_codes",
    ],
    ["bad lang", brief({ brief: { terms: ["a"], codes: [], lang: "fr" } }), "bad_lang"],
    ["missing brief", brief({ brief: undefined }), "bad_brief"],
    ["brief is text", brief({ brief: "x" }), "bad_brief"],
    ["maxResults 0", brief({ maxResults: 0 }), "bad_max_results"],
    ["maxResults 7", brief({ maxResults: 7 }), "bad_max_results"],
    ["maxResults 1.5", brief({ maxResults: 1.5 }), "bad_max_results"],
    ["bad freshness", brief({ freshness: "week" }), "bad_freshness"],
    [
      "empty after sanitise",
      brief({ brief: { terms: ["::: ((( )))"], codes: [], lang: "en" } }),
      "empty_brief",
    ],
  ];
  for (const [name, body, reason] of reasons) {
    const r = plan(body);
    must("reason for " + name, r.ok === false && r.code === "bad_request" && r.reason === reason);
  }
  must(
    "unknown flavor is bad_flavor",
    P.planQueries({ flavor: "nope", body: brief(), now: 0 }).reason === "bad_flavor" &&
      P.planQueries({ body: brief(), now: 0 }).ok === false,
  );
  must(
    "codes may be omitted, maxResults and freshness default",
    (() => {
      const r = plan(
        brief({
          brief: { terms: ["permit"], lang: "en" },
          maxResults: undefined,
          freshness: undefined,
        }),
      );
      return r.ok === true && r.maxResults === 5 && r.freshness === "any";
    })(),
  );
  must(
    "t0 is the supplied clock, and the real clock when none is supplied",
    (() => {
      const before = Date.now();
      const r = P.planQueries({ flavor: "sadeed", body: brief(), env: { googleCx: "cx" } });
      return good.t0 === 1793330000000 && r.t0 >= before && r.t0 <= Date.now();
    })(),
  );
  // الموعد الداخلي من موعد التطبيق: قيمة غير رقمية أو غير منتهية تعطي السقف الكامل لا 600.
  must(
    "internal deadline from the app deadline",
    (() => {
      const internal = (d: any) =>
        plan(brief({ mode: "general" }), { deadlineMs: d }).internalDeadlineMs;
      return (
        internal(undefined) === 1500 &&
        internal(null) === 1500 &&
        internal(NaN) === 1500 &&
        internal(Infinity) === 1500 &&
        internal("1800") === 1500 &&
        internal(5000) === 1500 &&
        internal(1800) === 1500 &&
        internal(1000) === 700 &&
        internal(700) === 600 &&
        internal(0) === 600
      );
    })(),
  );
  const evil = plan(
    brief({ brief: { terms: ['site:evil.com "x" (OR) -y', "a OR b"], codes: [], lang: "en" } }),
  );
  must(
    "operators neutralised",
    evil.ok === true &&
      !/[:"()]/.test(evil.queryText) &&
      !/\bOR\b/.test(evil.queryText) &&
      !/(^|\s)-/.test(evil.queryText),
  );
  for (const id of ["google", "tavily"])
    must("regulatory has " + id, good.providers[id] && good.providers[id].run === true);
  must(
    "regulatory has no brave (Art. 9: unrestricted provider)",
    good.providers.brave.run === false && good.providers.brave.reason === "not_in_mode",
  );
  must(
    "regulatory restricts google to official domains",
    good.providers.google.req.query.q.includes("site:hcis.gov.sa") &&
      good.providers.google.req.query.q.includes("site:uqn.gov.sa"),
  );
  must(
    "regulatory restricts tavily to official domains",
    Array.isArray(good.providers.tavily.req.body.include_domains) &&
      good.providers.tavily.req.body.include_domains.includes("hcis.gov.sa"),
  );
  must("regulatory keyless is empty (reference sources are unofficial)", good.keyless.length === 0);
  const general = plan(brief({ mode: "general" }));
  must(
    "general is unrestricted",
    !general.providers.google.req.query.q.includes("site:") &&
      general.providers.tavily.req.body.include_domains === undefined,
  );
  must(
    "general keyless trio",
    general.keyless.map((k: any) => k.id).join(",") === "wikipedia,wikidata,openalex",
  );
  const all = [
    good,
    general,
    plan(brief({ freshness: "month", mode: "general" })),
    plan(brief({ freshness: "year", mode: "general" })),
  ];
  const urls: string[] = [];
  for (const p of all) for (const k of p.keyless) urls.push(k.url);
  must("urls non-empty", urls.length >= 4);
  for (const u of urls) {
    const host = /^https:\/\/([^/]+)/.exec(u);
    must(
      "url host allowed: " + (host ? host[1] : u),
      Boolean(host) && P.ALLOWED_HOSTS.includes(host![1]),
    );
    must("no search-engine scraping url", !/(google|bing)\.com\/search/.test(u));
  }
  must(
    "month freshness mapped",
    all[2].providers.google.req.query.dateRestrict === "m1" &&
      all[2].providers.brave.req.query.freshness === "pm" &&
      all[2].providers.tavily.req.body.time_range === "month",
  );
  must(
    "lang drives wikipedia host",
    plan(
      brief({ mode: "general", brief: { terms: ["x"], codes: [], lang: "ar" } }),
    ).keyless[0].url.startsWith("https://ar.wikipedia.org/"),
  );
  must(
    "google absent cx is not_configured",
    plan(brief(), { env: {} }).providers.google.reason === "not_configured",
  );
  must("codes quoted by us", general.providers.brave.req.query.q.includes('"SEC-12"'));
  must("maxResults honoured", plan(brief({ maxResults: 3 })).providers.google.req.query.num === 3);
  // الميزانية: الموعد الداخلي 1500 من موعد التطبيق 1800؛ الدفعة بلا مفتاح تحجز 350؛ أقل نداء 250.
  must(
    "deadline 1800: internal 1500, reserve 350, keyed gate 900, keyless gate 1250",
    general.internalDeadlineMs === 1500 &&
      general.keylessReserveMs === 350 &&
      general.gateMs === 900 &&
      general.keylessGateMs === 1250,
  );
  must(
    "no keyless batch reserves nothing",
    good.keylessReserveMs === 0 && good.gateMs === 1250 && good.keylessGateMs === 1250,
  );
  must(
    "small deadline floors the internal deadline at 600",
    plan(brief({ mode: "general" }), { deadlineMs: 700 }).internalDeadlineMs === 600 &&
      plan(brief({ mode: "general" }), { deadlineMs: 700 }).gateMs === 0,
  );
  const at = (ms: number, id = "brave", p: any = general) =>
    P.gateProvider({ plan: p, id, now: p.t0 + ms });
  must("gate allows at boundary", at(general.gateMs).run === true);
  must("gate boundary leaves exactly the minimum call", at(general.gateMs).timeoutMs === 250);
  must("gate blocks after boundary", at(general.gateMs + 1).reason === "deadline");
  must("first call gets the full provider timeout", at(0).timeoutMs === 1100);
  must("timeout shrinks as time is spent", at(100).timeoutMs === 1050 && at(500).timeoutMs === 650);
  must(
    "keyed call never overruns the keyless reserve; keyless never overruns the deadline",
    [0, 1, 99, 250, 400, 649, 650, 651, 800, 899, 900, 901, 1250, 1251, 1499, 1500, 1600].every(
      (ms) => {
        const k = at(ms);
        const l = P.gateKeyless({ plan: general, now: general.t0 + ms });
        const keyedOk =
          !k.run ||
          (k.timeoutMs >= 250 &&
            k.timeoutMs <= general.timeoutMs &&
            ms + k.timeoutMs <= general.internalDeadlineMs - general.keylessReserveMs);
        const keylessOk =
          !l.run ||
          (l.timeoutMs >= 250 &&
            l.timeoutMs <= general.timeoutMs &&
            ms + l.timeoutMs <= general.internalDeadlineMs);
        return keyedOk && keylessOk;
      },
    ),
  );
  must(
    "fnn budget respects its larger timeout and deadline",
    (() => {
      const fp = P.planQueries({
        flavor: "fnn",
        body: brief({ mode: "docs", brief: { terms: ["fetch"], codes: [], lang: "en" } }),
        env: { googleCx: "cx" },
        now: 1793330000000,
        deadlineMs: 6000,
      });
      return (
        fp.internalDeadlineMs === 5000 &&
        P.gateProvider({ plan: fp, id: "google", now: fp.t0 }).timeoutMs === 2500 &&
        P.gateProvider({ plan: fp, id: "google", now: fp.t0 + 3000 }).timeoutMs === 1650 &&
        P.gateProvider({ plan: fp, id: "google", now: fp.t0 + 4400 }).timeoutMs === 250 &&
        P.gateProvider({ plan: fp, id: "google", now: fp.t0 + 4401 }).reason === "deadline"
      );
    })(),
  );
  must("non-finite clock fails closed (no call)", at(NaN).run === false);
  must(
    "gate respects not_configured",
    P.gateProvider({ plan: plan(brief(), { env: {} }), id: "google", now: good.t0 }).reason ===
      "not_configured",
  );
  must(
    "gate keyless empty is not_in_mode",
    P.gateKeyless({ plan: { keyless: [], t0: 0, gateMs: 100 }, now: 0 }).run === false,
  );
  must(
    "keyless gate allows at its boundary with the minimum call, blocks after",
    P.gateKeyless({ plan: general, now: general.t0 + 1250 }).timeoutMs === 250 &&
      P.gateKeyless({ plan: general, now: general.t0 + 1251 }).reason === "deadline",
  );
  must(
    "keyless batch takes all that remains",
    P.gateKeyless({ plan: general, now: general.t0 + 600 }).timeoutMs === 900,
  );
  // بوّابات بلا تشغيل: run=false صريح بسببه، ولا تُسلَّم مهلة.
  must(
    "gates that must not run say so",
    (() => {
      const unknown = P.gateProvider({ plan: general, id: "nope", now: general.t0 });
      const hidden = P.gateProvider({ plan: good, id: "brave", now: good.t0 });
      const unconfigured = P.gateProvider({
        plan: plan(brief(), { env: {} }),
        id: "google",
        now: good.t0,
      });
      const noPlan = P.gateProvider({ plan: undefined, id: "brave", now: 0 });
      return (
        unknown.run === false &&
        unknown.reason === "not_in_mode" &&
        hidden.run === false &&
        hidden.reason === "not_in_mode" &&
        unconfigured.run === false &&
        unconfigured.reason === "not_configured" &&
        noPlan.run === false &&
        noPlan.reason === "not_in_mode" &&
        [unknown, hidden, unconfigured, noPlan].every((g: any) => g.timeoutMs === undefined)
      );
    })(),
  );
  must(
    "keyless gate: garbage plans do not run; a real plan runs with its budget",
    (() => {
      const none = [undefined, {}, { keyless: "x" }, { keyless: [] }].map((pl: any) =>
        P.gateKeyless({ plan: pl, now: 0 }),
      );
      const real = P.gateKeyless({ plan: general, now: general.t0 });
      return (
        none.every((g: any) => g.run === false && g.reason === "not_in_mode") &&
        real.run === true &&
        real.reason === "" &&
        real.timeoutMs === 1100
      );
    })(),
  );
  must(
    "a keyed call that may run says so with a reason-free answer",
    (() => {
      const g = P.gateProvider({ plan: general, id: "brave", now: general.t0 });
      return g.run === true && g.reason === "" && g.timeoutMs === 1100;
    })(),
  );
  const stubbed = plan(brief({ mode: "general" }), { stubBase: "http://127.0.0.1:8787/stub/" });
  must(
    "stubBase rewrites every host",
    stubbed.keyless.every((k: any) => k.url.startsWith("http://127.0.0.1:8787/stub/")),
  );
  // FNN
  const f = (mode: string, terms: string[], codes: string[] = []) =>
    P.planQueries({
      flavor: "fnn",
      body: brief({ mode, brief: { terms, codes, lang: "en" } }),
      env: { googleCx: "cx" },
      now: 1793330000000,
      deadlineMs: 6000,
    });
  must("fnn rejects sadeed mode", f("regulatory", ["x"]).ok === false);
  must("fnn code uses github", f("code", ["retry"]).providers.github.run === true);
  must(
    "fnn security uses osv with package term",
    f("security", ["zod"]).providers.osv.run === true,
  );
  must(
    "fnn security without package term skips osv",
    f("security", ["Not A Package!"]).providers.osv.reason === "no_package_term" &&
      f("security", ["Not A Package!"]).providers.osv.run === false,
  );
  must(
    "fnn security keyless is npm+nvd",
    f("security", ["zod"])
      .keyless.map((k: any) => k.id)
      .join(",") === "npm,nvd",
  );
  must(
    "fnn security CVE routes to cveId",
    f("security", [], ["CVE-2024-12345"]).keyless.some((k: any) =>
      k.url.includes("cveId=CVE-2024-12345"),
    ),
  );
  must(
    "fnn docs restricts google to docs domains",
    f("docs", ["fetch"]).providers.google.req.query.q.includes("site:developer.mozilla.org"),
  );
  must(
    "fnn gate wider",
    f("docs", ["fetch"]).gateMs === 4400 && f("docs", ["fetch"]).timeoutMs === 2500,
  );
  must("fnn docs keyless mdn", f("docs", ["fetch"]).keyless[0].id === "mdn");

  // لغة الطلب تقود جوجل وBrave وويكيبيديا (عطل شائع: عكس الشرط فيُسأل جوجل بالإنجليزية عن طلب عربي).
  const ar = plan(brief({ mode: "general", brief: { terms: ["x"], codes: [], lang: "ar" } }));
  const en = plan(brief({ mode: "general", brief: { terms: ["x"], codes: [], lang: "en" } }));
  must("lang drives google lr", ar.providers.google.req.query.lr === "lang_ar");
  must("lang drives google lr (en)", en.providers.google.req.query.lr === "lang_en");
  must(
    "lang drives brave search_lang",
    ar.providers.brave.req.query.search_lang === "ar" &&
      en.providers.brave.req.query.search_lang === "en",
  );

  // حداثة الطلب تصل كل مزوّد بقيمته (any بلا قيد). التواريخ ثابتة من now = 2026-10-30T03:13:20Z.
  const fresh = (freshness: string) => plan(brief({ mode: "general", freshness }));
  const openalex = (p: any) => p.keyless.find((k: any) => k.id === "openalex").url;
  must(
    "freshness any adds no restriction anywhere",
    (() => {
      const a = fresh("any");
      return (
        a.providers.google.req.query.dateRestrict === undefined &&
        a.providers.brave.req.query.freshness === undefined &&
        a.providers.tavily.req.body.time_range === undefined &&
        !openalex(a).includes("filter=")
      );
    })(),
  );
  must(
    "freshness month maps to every provider",
    (() => {
      const m = fresh("month");
      return (
        m.providers.google.req.query.dateRestrict === "m1" &&
        m.providers.brave.req.query.freshness === "pm" &&
        m.providers.tavily.req.body.time_range === "month" &&
        openalex(m).includes("filter=" + encodeURIComponent("from_publication_date:2026-09-29"))
      );
    })(),
  );
  must(
    "freshness year maps to every provider",
    (() => {
      const y = fresh("year");
      return (
        y.providers.google.req.query.dateRestrict === "y1" &&
        y.providers.brave.req.query.freshness === "py" &&
        y.providers.tavily.req.body.time_range === "year" &&
        openalex(y).includes("filter=" + encodeURIComponent("from_publication_date:2025-10-29"))
      );
    })(),
  );

  // أعلام Tavily وجوجل وBrave: لا إجابة مولَّدة ولا متن خام ولا صور؛ بحث أساسي؛ بحث آمن.
  const tv = general.providers.tavily.req.body;
  must(
    "tavily asks for links only",
    tv.include_answer === false &&
      tv.include_raw_content === false &&
      tv.include_images === false &&
      tv.search_depth === "basic" &&
      tv.topic === "general" &&
      tv.max_results === 5,
  );
  must(
    "safe search flags",
    general.providers.google.req.query.safe === "active" &&
      general.providers.brave.req.query.safesearch === "moderate" &&
      general.providers.brave.req.query.text_decorations === "false" &&
      general.providers.brave.req.query.result_filter === "web",
  );

  // مصفوفة المزوّد × الوضع: من يُشغَّل في أي وضع، وما عداه not_in_mode صريح (لا تسرّب بين الأوضاع).
  const runs = (p: any) =>
    Object.keys(p.providers)
      .filter((id) => p.providers[id].run)
      .join(",");
  const off = (p: any, id: string) =>
    p.providers[id].run === false && p.providers[id].reason === "not_in_mode";
  must(
    "sadeed regulatory runs google,tavily",
    runs(good) === "google,tavily" && Object.keys(good.providers).join() === "google,brave,tavily",
  );
  must("sadeed general runs google,brave,tavily", runs(general) === "google,brave,tavily");
  must(
    "fnn docs runs google,brave,tavily only",
    runs(f("docs", ["fetch"])) === "google,brave,tavily" &&
      off(f("docs", ["fetch"]), "github") &&
      off(f("docs", ["fetch"]), "osv"),
  );
  must(
    "fnn code runs google,brave,tavily,github only",
    runs(f("code", ["retry"])) === "google,brave,tavily,github" && off(f("code", ["retry"]), "osv"),
  );
  must(
    "fnn general runs google,brave,tavily only",
    runs(f("general", ["zod"])) === "google,brave,tavily" &&
      off(f("general", ["zod"]), "github") &&
      off(f("general", ["zod"]), "osv"),
  );
  must(
    "fnn security runs osv only",
    runs(f("security", ["zod"])) === "osv" &&
      off(f("security", ["zod"]), "google") &&
      off(f("security", ["zod"]), "brave") &&
      off(f("security", ["zod"]), "tavily") &&
      off(f("security", ["zod"]), "github"),
  );
  must(
    "fnn security without a package term: osv is off with its reason",
    f("security", ["Not A Package!"]).providers.osv.run === false,
  );
  must(
    "an advisory code adds an OSV lookup by id, in security mode only",
    (() => {
      const sec = f("security", ["zod"], ["GHSA-abcd-efgh-ijkl"]);
      const hit = sec.keyless.find((k: any) => k.id === "osv");
      const docs = f("docs", ["fetch"], ["GHSA-abcd-efgh-ijkl"]);
      return (
        Boolean(hit) &&
        hit.url === "https://api.osv.dev/v1/vulns/GHSA-abcd-efgh-ijkl" &&
        !docs.keyless.some((k: any) => k.id === "osv") &&
        !f("security", ["zod"], ["SEC-12"]).keyless.some((k: any) => k.id === "osv")
      );
    })(),
  );
  // الكلمات العربية: التشكيل يُحذف ولا تتفتت الكلمة؛ علامات اللغات الأخرى تبقى.
  must(
    "arabic diacritics stripped without splitting the word",
    P.sanitizeTerm("سَدِيد") === "سديد" &&
      P.sanitizeTerm("القِيَادَةُ الصناعية") === "القيادة الصناعية" &&
      P.sanitizeTerm("ســـديد") === "سديد",
  );
  must(
    "other scripts keep their combining marks",
    P.sanitizeTerm("हिन्दी") === "हिन्दी" && P.sanitizeTerm("e\u0301") === "\u00e9",
  );
  must(
    "invisible format characters never reach a query",
    P.sanitizeTerm("a\u{E0049}b") === "a b" &&
      P.sanitizeTerm("a\uFE0Fb") === "ab" &&
      P.sanitizeTerm("a\u200Bb") === "a b",
  );
  must(
    "diacritised term plans as the clean word",
    plan(brief({ mode: "general", brief: { terms: ["سَدِيد"], codes: [], lang: "ar" } }))
      .queryText === "سديد",
  );
  return failed;
};

expectRedOnPlanted("plan-queries", planSuite, [
  {
    name: "إبقاء النقطتين في الكلمات",
    mutation: {
      from: "/[^\\p{L}\\p{N}\\p{M}\\s._+#@/-]/gu",
      to: '/[^\\p{L}\\p{N}\\p{M}\\s:"()._+#@/-]/gu',
    },
    red: "operators neutralised",
  },
  {
    name: "جوجل بلا تقييد بالنطاقات الرسمية",
    mutation: {
      from: 'q: restrictDomains ? quoted + " " + siteClause(restrictDomains) : quoted,',
      to: "q: quoted,",
    },
    red: "regulatory restricts google to official domains",
  },
  {
    name: "بوّابة زمنية معطّلة",
    mutation: {
      from: "|| left < MIN_CALL_MS) return 0;",
      to: ") return 0;",
    },
    red: "gate blocks after boundary",
  },
  {
    name: "مهلة النداء تتجاوز مهلة المزوّد",
    mutation: {
      from: "return Math.min(plan.timeoutMs, Math.floor(left));",
      to: "return Math.floor(left);",
    },
    red: "first call gets the full provider timeout",
  },
  {
    name: "لا حجز لذيل الدفعة بلا مفتاح",
    mutation: {
      from: "const reserve = hasKeyless ? KEYLESS_RESERVE_MS : 0;",
      to: "const reserve = 0;",
    },
    red: "deadline 1800: internal 1500, reserve 350, keyed gate 900, keyless gate 1250",
  },
  {
    name: "Brave يعود إلى وضع regulatory غير المقيَّد",
    mutation: {
      from: 'brave: ["general", "docs", "code"],',
      to: 'brave: ["general", "regulatory", "docs", "code"],',
    },
    red: "regulatory has no brave (Art. 9: unrestricted provider)",
  },
  {
    name: "ويكيبيديا تعود إلى regulatory",
    mutation: { from: "regulatory: [],", to: 'regulatory: ["wikipedia"],' },
    red: "regulatory keyless is empty (reference sources are unofficial)",
  },
  {
    name: "عكس لغة جوجل",
    mutation: {
      from: 'lr: req.lang === "ar" ? "lang_ar" : "lang_en",',
      to: 'lr: req.lang !== "ar" ? "lang_ar" : "lang_en",',
    },
    red: "lang drives google lr",
  },
  {
    name: "عكس مرشّح حداثة OpenAlex",
    mutation: {
      from: 'if (req.freshness === "month") {\n        pairs.push(',
      to: 'if (req.freshness !== "month") {\n        pairs.push(',
    },
    red: "freshness month maps to every provider",
  },
  {
    name: "Tavily يطلب إجابة مولَّدة",
    mutation: { from: "include_answer: false,", to: "include_answer: true," },
    red: "tavily asks for links only",
  },
  {
    name: "التشكيل العربي يعود فيفتّت الكلمة",
    mutation: { from: '.replace(/[\\u0640\\u064b-\\u065f\\u0670]/g, "")', to: "" },
    red: "arabic diacritics stripped without splitting the word",
  },
  {
    name: "محدّد الصيغة يمرّ إلى الاستعلام",
    mutation: { from: '.replace(/[\\u{FE00}-\\u{FE0F}\\u{E0100}-\\u{E01EF}]/gu, "")', to: "" },
    red: "invisible format characters never reach a query",
  },
  {
    name: "قبول إصدار مختلف",
    mutation: { from: "if (body.v !== 1)", to: "if (false)" },
    red: "rejects: wrong version",
  },
  {
    name: "تجاوز حدّ طول الكلمة",
    mutation: {
      from: "isStringArray(brief.terms, 6, 40)",
      to: "isStringArray(brief.terms, 6, 4000)",
    },
    red: "rejects: 41-char term",
  },
  {
    name: "مضيف غير مسموح في خطة keyless",
    mutation: { from: 'at("api.openalex.org")', to: 'at("www.google.com/search?x")' },
    red: "no search-engine scraping url",
  },
]);

// ---------------------------------------------------------------------------
// merge-rank
// ---------------------------------------------------------------------------
const mergeSuite: Suite = (M) => {
  const failed: string[] = [];
  const must = (name: string, ok: boolean) => ok || failed.push(name);
  const ok = (id: string, body: any, over: any = {}) => ({
    id,
    status: "ok",
    ms: 100,
    text: typeof body === "string" ? body : JSON.stringify(body),
    ...over,
  });
  const rank = (entries: any[], over: any = {}) =>
    M.mergeRank({
      entries,
      mode: "general",
      lang: "en",
      maxResults: 6,
      now: 1793330000000,
      ...over,
    });

  // normalizeUrl
  const n = M.normalizeUrl;
  must("http rejected", n("http://example.com/a") === null);
  must("javascript: rejected", n("javascript:alert(1)") === null);
  must("IPv4 rejected", n("https://10.0.0.1/a") === null);
  must("IPv6 rejected", n("https://[::1]/a") === null);
  must("userinfo rejected", n("https://user:pw@example.com/a") === null);
  must("single-label host rejected", n("https://localhost/a") === null);
  must("space in url rejected", n("https://example.com/a b") === null);
  must("301-char url rejected", n("https://example.com/" + "a".repeat(285)) === null);
  must("299-char url kept", n("https://example.com/" + "a".repeat(279)) !== null);
  must("non-string rejected", n(5) === null && n(null) === null);
  must(
    "www + fragment + utm collapse",
    n("https://WWW.Example.com/a/?utm_source=x&b=1#frag").key ===
      n("https://example.com/a?b=1").key,
  );
  must(
    "tracking params stripped from url",
    n("https://example.com/a?utm_medium=x&gclid=1&q=2").url === "https://example.com/a?q=2",
  );
  must("default port dropped", n("https://example.com:443/a").url === "https://example.com/a");
  must(
    "trailing slash collapse",
    n("https://example.com/a/").key === n("https://example.com/a").key,
  );

  // sanitizeText
  const st = M.sanitizeText;
  const bidi = String.fromCharCode(0x202e);
  const zw = String.fromCharCode(0x200b);
  must("tags stripped", st("a <b>bold</b> <script>x</script> c", 100) === "a bold x c");
  must(
    "encoded tags stripped after decode",
    !/[<>]/.test(st("&lt;script&gt;alert(1)&lt;/script&gt;ok", 100)),
  );
  must("entities decoded", st("a &amp; b &quot;c&quot; &#65;", 100) === 'a & b "c" A');
  must(
    "control + bidi + zero-width stripped",
    st("a\u0000b" + bidi + "c" + zw + "d\n\te", 100) === "a bcd e",
  );
  must(
    "truncation by code points with ellipsis",
    Array.from(st("x".repeat(500), 300)).length === 300 &&
      st("x".repeat(500), 300).endsWith("\u2026"),
  );
  must(
    "surrogate pairs not split",
    (() => {
      const t = st("😀".repeat(400), 300);
      return Array.from(t).length === 300 && !/[\ud800-\udbff]$/.test(t.slice(0, -1) + "x");
    })(),
  );
  must(
    "null/object become empty",
    st(null, 10) === "" && st({}, 10) === "" && st(undefined, 10) === "",
  );
  must("number accepted", st(42, 10) === "42");

  // adapters: كل fixture ينتج نتيجة واحدة على الأقل برابط https
  const map: Record<string, string> = {
    google: "google",
    brave: "brave",
    tavily: "tavily",
    github: "github",
    wikipedia: "wikipedia",
    wikidata: "wikidata",
    openalex: "openalex",
    mdn: "mdn",
    npm: "npm",
    nvd: "nvd",
    osv: "osv",
  };
  must("adapter table non-empty", Object.keys(map).length === 11);
  for (const id of Object.keys(map)) {
    const r = rank([ok(id, (FIXTURES as any)[map[id]])], { mode: "general" });
    must(
      "adapter " + id + " yields https result",
      r.results.length >= 1 &&
        r.results.every((x: any) => x.url.startsWith("https://")) &&
        r.providers[0].n >= 1,
    );
  }
  must("osv by id fixture handled", rank([ok("osv", FIXTURES.osvById)]).results.length === 1);

  // الدمج
  const g = ok("google", {
    items: [
      { title: "G", link: "https://hcis.gov.sa/a", snippet: "s" },
      { title: "G2", link: "https://blog.example.com/x", snippet: "s" },
    ],
  });
  const b = ok("brave", {
    web: {
      results: [{ title: "B", url: "https://www.hcis.gov.sa/a/?utm_source=z", description: "d" }],
    },
  });
  const w = ok("wikipedia", {
    query: { search: [{ title: "Hot work", snippet: "s", timestamp: "2026-01-01T00:00:00Z" }] },
  });
  const merged = rank([g, b, w]);
  must(
    "dedupe across providers",
    merged.results.filter((r: any) => /hcis\.gov\.sa\/a/.test(r.url)).length === 1 &&
      merged.results.length === 3,
  );
  must(
    "duplicate keeps first provider",
    merged.results.find((r: any) => r.url === "https://hcis.gov.sa/a").provider === "google",
  );
  must(
    "official tier first, reference then rest",
    merged.results.map((r: any) => r.provider + ":" + new URL(r.url).hostname).join(",") ===
      "google:hcis.gov.sa,wikipedia:en.wikipedia.org,google:blog.example.com",
  );
  must(
    "provider order breaks tier ties",
    (() => {
      const r = rank(
        [
          ok("tavily", {
            results: [{ title: "T", url: "https://zzz.example.com/1", content: "c" }],
          }),
          ok("google", {
            items: [{ title: "G", link: "https://aaa.example.com/1", snippet: "c" }],
          }),
        ],
        { mode: "general" },
      );
      return r.results[0].provider === "google";
    })(),
  );
  const many = ok("tavily", {
    results: Array.from({ length: 10 }, (_, i) => ({
      title: "T" + i,
      url: "https://s" + i + ".example.com/",
      content: "c",
    })),
  });
  const manyB = ok("brave", {
    web: {
      results: Array.from({ length: 10 }, (_, i) => ({
        title: "B" + i,
        url: "https://b" + i + ".example.com/",
        description: "c",
      })),
    },
  });
  must("cap is 6", rank([many, manyB]).results.length === 6);
  must("cap honours maxResults 3", rank([many, manyB], { maxResults: 3 }).results.length === 3);
  must(
    "cap never exceeds 6 even if asked 99",
    rank([many, manyB], { maxResults: 99 }).results.length === 6,
  );
  const longOne = rank([
    ok("tavily", {
      results: [
        { title: "T".repeat(500), url: "https://x.example.com/", content: "C".repeat(900) },
      ],
    }),
  ]);
  must("title ≤120", Array.from(longOne.results[0].title).length <= 120);
  must("snippet ≤300", Array.from(longOne.results[0].snippet).length <= 300);
  must("url ≤300", longOne.results[0].url.length <= 300);
  must(
    "publishedAt ISO or null",
    merged.results.every(
      (r: any) => r.publishedAt === null || /^\d{4}-\d\d-\d\dT/.test(r.publishedAt),
    ),
  );
  must(
    "future date rejected",
    rank([
      ok("tavily", {
        results: [
          { title: "T", url: "https://x.example.com/", content: "c", published_date: "2999-01-01" },
        ],
      }),
    ]).results[0].publishedAt === null,
  );
  must(
    "per-provider items limited to 10",
    rank([
      ok("tavily", {
        results: Array.from({ length: 40 }, (_, i) => ({
          title: "T",
          url: "https://s" + i + ".example.com/",
          content: "c",
        })),
      }),
    ]).providers[0].n === 10,
  );
  must(
    "malformed json is error",
    rank([ok("google", "{not json")]).providers[0].status === "error",
  );
  must("non-object json is error", rank([ok("google", "42")]).providers[0].status === "error");
  must(
    "oversize text is error (classify)",
    M.classifyHttp({
      id: "google",
      gate: { run: true },
      startedAt: 0,
      now: 5,
      out: { statusCode: 200, data: "x".repeat(262145) },
    }).status === "error",
  );
  must(
    "unknown provider id is error not crash",
    rank([ok("mystery", { a: 1 })]).providers[0].status === "error",
  );
  must(
    "garbage entries ignored",
    rank([null, 5, "x", {}, { id: 3 }] as any).providers.length === 0,
  );
  must(
    "same provider twice keeps best status",
    rank([ok("osv", FIXTURES.osv), { id: "osv", status: "error", ms: 5, text: null }]).providers[0]
      .status === "ok",
  );

  // classifyHttp
  const c = (out: any, gate: any = { run: true, reason: "" }, over: any = {}) =>
    M.classifyHttp({
      id: "brave",
      gate,
      startedAt: 1000,
      now: 1250,
      out,
      timeoutMs: 1100,
      ...over,
    });
  must(
    "2xx is ok with ms",
    c({ statusCode: 200, data: "{}" }).status === "ok" &&
      c({ statusCode: 200, data: "{}" }).ms === 250,
  );
  // الشكل الحقيقي لناتج n8n (ردّ نصّي كامل): المتن في data. شكل body وحده ليس ردًّا صالحًا.
  must(
    "n8n shape: text lives in data, a body-only item is an error",
    c({ statusCode: 200, data: "{}" }).status === "ok" &&
      c({ statusCode: 200, body: "{}" }).status === "error" &&
      c({ statusCode: 200, data: "{}" }).text === "{}",
  );
  must("500 is error", c({ statusCode: 500, data: "x" }).status === "error");
  must("429 is error", c({ statusCode: 429, data: "x" }).status === "error");
  must(
    "timeout message is timeout",
    c({ error: "timeout of 1100ms exceeded" }).status === "timeout",
  );
  must("ETIMEDOUT is timeout", c({ error: "connect ETIMEDOUT 1.2.3.4:443" }).status === "timeout");
  must(
    "credential message is skipped",
    c({ error: 'Credentials with name "x" for type "y" not found' }).status === "skipped",
  );
  must("other error message is error", c({ error: "socket hang up" }).status === "error");
  must("error object message", c({ error: { message: "boom" } }).status === "error");
  must(
    "deadline gate is timeout ms 0",
    (() => {
      const r = c(undefined, { run: false, reason: "deadline" });
      return r.status === "timeout" && r.ms === 0;
    })(),
  );
  must(
    "not_in_mode is hidden skipped",
    (() => {
      const r = c(undefined, { run: false, reason: "not_in_mode" });
      return r.status === "skipped" && r.hidden === true;
    })(),
  );
  must(
    "not_configured is visible skipped",
    (() => {
      const r = c(undefined, { run: false, reason: "not_configured" });
      return r.status === "skipped" && !r.hidden;
    })(),
  );
  must("missing out is error", c(undefined).status === "error");
  must("ms clamped", c({ statusCode: 200, data: "{}" }, undefined, { now: 10 ** 9 }).ms === 60000);
  must(
    "hidden entries omitted from providers",
    rank([{ id: "github", status: "skipped", ms: 0, text: null, hidden: true }]).providers
      .length === 0,
  );
  // دفعة
  const planned = [{ id: "wikipedia" }, { id: "wikidata" }];
  const okOut = (b: any) => ({ statusCode: 200, data: JSON.stringify(b) });
  const batch = M.classifyBatch({
    planned,
    gate: { run: true, reason: "" },
    outs: [okOut(FIXTURES.wikipedia), { error: "timeout of 1100ms exceeded" }],
    startedAt: 0,
    now: 100,
    timeoutMs: 1100,
  });
  must("batch aligns by index", batch[0].status === "ok" && batch[1].status === "timeout");
  must(
    "batch misalignment errors all",
    M.classifyBatch({
      planned,
      gate: { run: true, reason: "" },
      outs: [okOut({})],
      startedAt: 0,
      now: 1,
      timeoutMs: 1,
    }).every((x: any) => x.status === "error"),
  );
  must(
    "batch gate off carries reason",
    M.classifyBatch({
      planned,
      gate: { run: false, reason: "deadline" },
      outs: [],
      startedAt: 0,
      now: 1,
      timeoutMs: 1,
    }).every((x: any) => x.status === "timeout"),
  );
  // الطبقات
  must(
    "tier official",
    M.tierOf("hcis.gov.sa", "regulatory") === 0 && M.tierOf("sub.hcis.gov.sa", "regulatory") === 0,
  );
  must(
    "tier lookalike is not official",
    M.tierOf("evilhcis.gov.sa", "regulatory") === 1 &&
      M.tierOf("hcis.gov.sa.evil.com", "regulatory") === 3,
  );
  must("tier government", M.tierOf("other.gov.sa", "regulatory") === 1);
  must("tier reference", M.tierOf("en.wikipedia.org", "regulatory") === 2);
  must("tier other", M.tierOf("blog.example.com", "regulatory") === 3);
  must(
    "tier depends on mode",
    M.tierOf("developer.mozilla.org", "docs") === 0 &&
      M.tierOf("developer.mozilla.org", "regulatory") === 2,
  );
  must(
    "mergeRank never throws on garbage",
    (() => {
      try {
        M.mergeRank(undefined);
        M.mergeRank({ entries: "x" });
        M.mergeRank({
          entries: [{ id: "google", status: "ok", text: '{"items": 5}' }],
          maxResults: "z",
        });
        return true;
      } catch (e) {
        return false;
      }
    })(),
  );

  // وضع regulatory (المادة ٩): ما ليس نطاقًا رسميًّا ولا حكوميًّا سعوديًّا يسقط قبل العدّ والترتيب.
  const regulatory = rank([g, b, w], { mode: "regulatory" });
  must(
    "regulatory keeps only official hosts",
    regulatory.results.length === 1 && regulatory.results[0].url === "https://hcis.gov.sa/a",
  );
  must(
    "regulatory counts only what it kept",
    regulatory.providers.find((p: any) => p.id === "google").n === 1 &&
      regulatory.providers.find((p: any) => p.id === "wikipedia").n === 0,
  );
  must(
    "regulatory keeps listed and .gov.sa hosts, drops lookalikes",
    (() => {
      const list = (hosts: string[]) =>
        rank(
          [
            ok("tavily", {
              results: hosts.map((h, i) => ({
                title: "T" + i,
                url: "https://" + h + "/p",
                content: "c",
              })),
            }),
          ],
          { mode: "regulatory" },
        ).results.map((r: any) => new URL(r.url).hostname);
      const kept = list([
        "hcis.gov.sa",
        "sub.hcis.gov.sa",
        "laws.boe.gov.sa",
        "zatca.gov.sa",
        "x.moh.gov.sa",
      ]);
      const dropped = list([
        "evilgov.sa",
        "hcis.gov.sa.evil.example",
        "gov.sa.evil.example",
        "evilhcis.gov.sa.com",
        "en.wikipedia.org",
        "www.gov.uk",
        "school.edu.sa",
        "blog.example.com",
      ]);
      return kept.length === 5 && dropped.length === 0;
    })(),
  );
  must(
    "regulatoryHostAllowed table",
    M.regulatoryHostAllowed("nca.gov.sa") === true &&
      M.regulatoryHostAllowed("x.gov.sa") === true &&
      M.regulatoryHostAllowed("gov.sa") === false &&
      M.regulatoryHostAllowed("evilgov.sa") === false &&
      M.regulatoryHostAllowed("en.wikipedia.org") === false,
  );
  must("other modes still return unofficial hosts", rank([g]).results.length === 2);

  // toIso: التاريخ يصل غلافًا ISO كاملًا أو null، ولا شيء بينهما.
  const iso = M.toIso;
  const NOW_MS = 1793330000000;
  must(
    "toIso normalises ISO strings, numbers and dates",
    iso("2026-01-02T03:04:05Z", NOW_MS) === "2026-01-02T03:04:05.000Z" &&
      iso(1767323045000, NOW_MS) === "2026-01-02T03:04:05.000Z" &&
      iso("2025-12-31", NOW_MS) === "2025-12-31T00:00:00.000Z",
  );
  must(
    "toIso empty or foreign values are null",
    [undefined, null, "", {}, [], true, "not a date", NaN].every((v) => iso(v, NOW_MS) === null),
  );
  must(
    "toIso lower bound is 1990-01-01",
    iso("1989-12-31T23:59:59Z", NOW_MS) === null &&
      iso("1990-01-01T00:00:00Z", NOW_MS) === "1990-01-01T00:00:00.000Z",
  );
  must(
    "toIso upper bound is one day past now",
    iso(new Date(NOW_MS + 86400000 + 1).toISOString(), NOW_MS) === null &&
      iso(new Date(NOW_MS + 86400000).toISOString(), NOW_MS) ===
        new Date(NOW_MS + 86400000).toISOString() &&
      iso("2999-01-01", undefined) === "2999-01-01T00:00:00.000Z",
  );
  must(
    "published dates reach the result",
    rank([ok("google", FIXTURES.google)]).results.find((r: any) => r.url.includes("hot-work"))
      .publishedAt === "2026-05-01T00:00:00.000Z" &&
      rank([w]).results[0].publishedAt === "2026-01-01T00:00:00.000Z",
  );

  // محوّلات المزوّدين: الحقول البديلة حين تغيب الأساسية (كل مزوّد يغيّر بنية ردّه).
  const first = (id: string, body: any, over: any = {}) => {
    const r = rank([ok(id, body)], over);
    return r.results[0] || null;
  };
  const repoItem = (extra: any) => ({
    items: [{ html_url: "https://github.com/e/r/blob/main/a.ts", ...extra }],
  });
  must(
    "github: title and snippet fall back step by step",
    safely(() => {
      const withPath = first(
        "github",
        repoItem({
          path: "src/a.ts",
          name: "a.ts",
          repository: { full_name: "e/r", description: "desc" },
          text_matches: [{ fragment: "frag" }],
        }),
      );
      const nameOnly = first(
        "github",
        repoItem({ name: "a.ts", repository: { full_name: "e/r", description: "desc" } }),
      );
      const repoOnly = first("github", repoItem({ repository: { full_name: "e/r" } }));
      const bare = first("github", repoItem({ name: "a.ts" }));
      return (
        withPath.title === "e/r/src/a.ts" &&
        withPath.snippet === "frag" &&
        nameOnly.title === "e/r/a.ts" &&
        nameOnly.snippet === "desc" &&
        repoOnly.title === "e/r/" &&
        repoOnly.snippet === "e/r" &&
        bare.title === "a.ts" &&
        bare.snippet === ""
      );
    }),
  );
  must(
    "osv: summary or details, published or modified",
    safely(() => {
      const a = first("osv", {
        vulns: [
          { id: "GHSA-aaaa-bbbb-cccc", details: "the details", modified: "2024-07-01T00:00:00Z" },
        ],
      });
      const b = first("osv", {
        vulns: [
          {
            id: "GHSA-aaaa-bbbb-cccc",
            summary: "sum",
            details: "d",
            published: "2024-06-01T00:00:00Z",
            modified: "2024-07-01T00:00:00Z",
          },
        ],
      });
      return (
        a.title === "GHSA-aaaa-bbbb-cccc" &&
        a.snippet === "the details" &&
        a.publishedAt === "2024-07-01T00:00:00.000Z" &&
        b.title === "GHSA-aaaa-bbbb-cccc: sum" &&
        b.snippet === "sum" &&
        b.publishedAt === "2024-06-01T00:00:00.000Z" &&
        b.url === "https://osv.dev/vulnerability/GHSA-aaaa-bbbb-cccc"
      );
    }),
  );
  must(
    "osv: an id outside the safe pattern yields no link",
    first("osv", { vulns: [{ id: "bad id with spaces", summary: "x" }] }) === null,
  );
  must(
    "npm: link or built link, version suffix",
    safely(() => {
      const pkg = (p: any) => ({ objects: [{ package: { name: "zod", ...p } }] });
      const full = first(
        "npm",
        pkg({
          version: "4.6.7",
          links: { npm: "https://www.npmjs.com/package/zod" },
          description: "d",
        }),
      );
      const built = first("npm", pkg({}));
      return (
        full.title === "zod@4.6.7" &&
        full.url === "https://www.npmjs.com/package/zod" &&
        full.snippet === "d" &&
        built.title === "zod@" &&
        built.url === "https://www.npmjs.com/package/zod"
      );
    }),
  );
  must(
    "nvd: the English description wins, else the first one, else empty",
    safely(() => {
      const cve = (descriptions: any) => ({
        vulnerabilities: [{ cve: { id: "CVE-2024-12345", descriptions } }],
      });
      const en = first(
        "nvd",
        cve([
          { lang: "es", value: "hola" },
          { lang: "en", value: "hello" },
        ]),
      );
      const es = first("nvd", cve([{ lang: "es", value: "hola" }]));
      const none = first("nvd", cve(undefined));
      return (
        en.snippet === "hello" &&
        es.snippet === "hola" &&
        none.snippet === "" &&
        en.url === "https://nvd.nist.gov/vuln/detail/CVE-2024-12345" &&
        first("nvd", { vulnerabilities: [{ cve: { id: "not-a-cve", descriptions: [] } }] }) === null
      );
    }),
  );
  must(
    "wikidata and openalex: label or id, doi or id, venue and year",
    safely(() => {
      const nolabel = first("wikidata", { search: [{ id: "Q7", description: "d" }] });
      const label = first("wikidata", { search: [{ id: "Q7", label: "Seven" }] });
      const work = (w: any) =>
        first("openalex", {
          results: [{ id: "https://openalex.org/W1", display_name: "T", ...w }],
        });
      return (
        nolabel.title === "Q7" &&
        label.title === "Seven" &&
        label.url === "https://www.wikidata.org/wiki/Q7" &&
        work({}).url === "https://openalex.org/W1" &&
        work({ doi: "https://doi.org/10.1/x" }).url === "https://doi.org/10.1/x" &&
        work({ primary_location: { source: { display_name: "J" } } }).snippet === "J" &&
        work({ publication_date: "2021-03-04" }).snippet === "2021" &&
        work({
          primary_location: { source: { display_name: "J" } },
          publication_date: "2021-03-04",
        }).snippet === "J - 2021"
      );
    }),
  );
  must(
    "a missing or empty title falls back to the host",
    first("tavily", {
      results: [{ title: "<b></b>", url: "https://x.example.com/p", content: "c" }],
    })?.title === "x.example.com" &&
      first("tavily", { results: [{ url: "https://x.example.com/p" }] })?.title === "x.example.com",
  );
  must(
    "wikipedia language and path encoding follow the request",
    safely(() => {
      const row = { query: { search: [{ title: "Hot work/permit", snippet: "s" }] } };
      return (
        first("wikipedia", row, { lang: "ar" }).url ===
          "https://ar.wikipedia.org/wiki/Hot_work%2Fpermit" &&
        first("wikipedia", row, { lang: "en" }).url ===
          "https://en.wikipedia.org/wiki/Hot_work%2Fpermit" &&
        first("wikipedia", row, { lang: "fr" }).url ===
          "https://en.wikipedia.org/wiki/Hot_work%2Fpermit"
      );
    }),
  );
  must(
    "null or scalar nested fields do not turn a provider into an error",
    safely(() => {
      const g = rank([
        ok("google", {
          items: [
            { title: "T", link: "https://x.example.com/1", snippet: "s", pagemap: null },
            { title: "T", link: "https://x.example.com/2", snippet: "s", pagemap: 5 },
            {
              title: "T",
              link: "https://x.example.com/3",
              snippet: "s",
              pagemap: { metatags: [null] },
            },
          ],
        }),
      ]);
      return g.providers[0].status === "ok" && g.results.length === 3;
    }),
  );
  must(
    "entities that decode to control, surrogate or out-of-range code points become spaces",
    st("a&#31;b&#x110000;c&#55296;d&#32;e", 100) === "a b c d e" &&
      st("a&#x10FFFF;b", 100) === "a\u{10FFFF}b" &&
      st("&#65;&#x42;", 100) === "AB",
  );
  must(
    "entry text must be a non-empty string under the cap",
    [5, "", '{"items":[],"pad":"' + "x".repeat(262200) + '"}'].every(
      (text: any) =>
        rank([{ id: "google", status: "ok", ms: 1, text }]).providers[0].status === "error",
    ),
  );
  must(
    "classifyHttp tolerates every odd output and a missing gate",
    safely(() => {
      const odd = [
        null,
        "text",
        5,
        {},
        { data: "{}" },
        { statusCode: "200", data: "{}" },
        { error: { message: 5 } },
      ];
      const classes = odd.map((o: any) => c(o).status);
      const objMsg = (message: string) => c({ error: { message } }).status;
      const noGate = M.classifyHttp({
        id: "x",
        startedAt: 0,
        now: 1,
        out: { statusCode: 200, data: "{}" },
      });
      const noGateBatch = M.classifyBatch({
        planned: [{ id: "x" }],
        outs: [{ statusCode: 200, data: "{}" }],
        startedAt: 0,
        now: 1,
      });
      return (
        classes.every((s: string) => s === "error") &&
        objMsg("timeout of 5ms exceeded") === "timeout" &&
        objMsg('Credentials with name "x" not found') === "skipped" &&
        objMsg("boom") === "error" &&
        noGate.status === "skipped" &&
        noGate.hidden === true &&
        noGateBatch[0].status === "skipped" &&
        noGateBatch[0].hidden === true
      );
    }),
  );
  must(
    "providers are listed in the fixed order, unknown ones alphabetically after",
    rank([
      ok("zzz", {}),
      ok("aaa", {}),
      ok("google", FIXTURES.google),
      ok("wikipedia", FIXTURES.wikipedia),
    ])
      .providers.map((p: any) => p.id)
      .join() === "google,wikipedia,aaa,zzz",
  );

  // أحرف التنسيق غير المرئية: كل Cf وكل محدّد صيغة يسقط (القاعدة فئة Unicode لا قائمة مختارة).
  const hidden = hiddenFormatCodePoints();
  must("hidden set is a class, not a hand-picked list", hidden.length > 150);
  must(
    "every format character and variation selector is stripped from titles and snippets",
    hidden.filter((cp: number) => st("a" + String.fromCodePoint(cp) + "b", 100) !== "ab").length ===
      0,
  );
  must(
    "tag-character smuggling and Arabic letter mark are gone",
    st("Ign\u{E0069}\u{E0067}ore \u061Cthis\u00AD", 100) === "Ignore this",
  );
  // الكلفة محدودة: حقل ضخم من < بلا > لا يجعل الترتيب تربيعيًّا (الأصل: 2208 ms لمزوّد واحد).
  must(
    "hostile angle-bracket fields stay cheap",
    (() => {
      const evil = "<".repeat(12500);
      const started = Date.now();
      const r = rank([
        ok("tavily", {
          results: Array.from({ length: 10 }, (_, i) => ({
            title: evil,
            url: "https://h" + i + ".example.com/",
            content: evil,
          })),
        }),
      ]);
      return r.results.length === 6 && Date.now() - started < 400;
    })(),
  );
  return failed;
};

/** كل محرف فئته Cf + محدّدات الصيغة (تُحسب مرة واحدة من قاعدة بيانات Unicode في Node). */
let hiddenCache: number[] | undefined;
function hiddenFormatCodePoints(): number[] {
  if (hiddenCache) return hiddenCache;
  const out: number[] = [];
  for (let cp = 0; cp <= 0x10ffff; cp += 1) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    if (
      /\p{Cf}/u.test(String.fromCodePoint(cp)) ||
      (cp >= 0xfe00 && cp <= 0xfe0f) ||
      (cp >= 0xe0100 && cp <= 0xe01ef)
    ) {
      out.push(cp);
    }
  }
  hiddenCache = out;
  return out;
}

expectRedOnPlanted("merge-rank", mergeSuite, [
  {
    name: "قبول http",
    mutation: { from: "/^https:\\/\\/([^/?#]+)", to: "/^https?:\\/\\/([^/?#]+)" },
    red: "http rejected",
  },
  {
    name: "الترتيب بلا طبقة",
    mutation: { from: "a.tier - b.tier || a.order - b.order", to: "a.order - b.order" },
    red: "official tier first, reference then rest",
  },
  {
    name: "حذف إزالة التكرار",
    mutation: { from: "if (seen[candidate.key]) continue;", to: "" },
    red: "dedupe across providers",
  },
  {
    name: "السقف 6 ← 60",
    mutation: { from: "const RESULT_CAP = 6;", to: "const RESULT_CAP = 60;" },
    red: "cap never exceeds 6 even if asked 99",
  },
  {
    name: "إبقاء الوسوم في المقتطف",
    mutation: {
      from: 'text = text.replace(TAG_RE, " ");\n  text = decodeEntities(text);\n  text = text.replace(TAG_RE, " ").replace(/[<>]/g, " ");',
      to: "text = decodeEntities(text);",
    },
    red: "tags stripped",
  },
  {
    name: "قبول مضيف IP",
    mutation: { from: "if (/^[0-9.]+$/.test(host)) return null;", to: "" },
    red: "IPv4 rejected",
  },
  {
    name: "قبول معرّف مستخدم (الطبقتان: فحص السلطة ومحارف المضيف)",
    mutation: [
      {
        from: 'if (authority.indexOf("@") !== -1 || authority.indexOf("[") !== -1) return null;',
        to: "",
      },
      {
        from: "if (!/^[a-z0-9.-]+$/.test(host) || /(^|\\.)(-|\\.)|-\\.|\\.\\./.test(host)) {",
        to: "if (false) {",
      },
      {
        from: "const hostPort = /^([^:]+)(?::([0-9]{1,5}))?$/.exec(authority);",
        to: "const hostPort = /^(.+?)(?::([0-9]{1,5}))?$/.exec(authority);",
      },
    ],
    red: "userinfo rejected",
  },
  {
    name: "رابط أطول من 300",
    mutation: { from: "if (url.length > URL_MAX) return null;", to: "" },
    red: "301-char url rejected",
  },
  {
    name: "اعتماد غائب يُعدّ خطأ",
    mutation: {
      from: 'if (CREDENTIAL_RE.test(message)) return { id, status: "skipped", ms: 0, text: null };',
      to: "",
    },
    red: "credential message is skipped",
  },
  {
    name: "ختم المهلة يُعدّ خطأ",
    mutation: {
      from: 'if (TIMEOUT_RE.test(message)) return { id, status: "timeout", ms, text: null };',
      to: "",
    },
    red: "timeout message is timeout",
  },
  {
    name: "حدّ حجم الردّ",
    mutation: { from: "const MAX_TEXT_CHARS = 262144;", to: "const MAX_TEXT_CHARS = 262144000;" },
    red: "oversize text is error (classify)",
  },
  {
    name: "طبقة بنهاية نطاق فقط",
    mutation: {
      from: 'return host === domain || host.endsWith("." + domain);',
      to: "return host.endsWith(domain);",
    },
    red: "tier lookalike is not official",
  },
  {
    name: "حدّ 10 عناصر لكل مزوّد",
    mutation: {
      from: "const MAX_ITEMS_PER_PROVIDER = 10;",
      to: "const MAX_ITEMS_PER_PROVIDER = 1000;",
    },
    red: "per-provider items limited to 10",
  },
  {
    name: "الشيفرة تعود إلى قراءة body بدل data",
    mutation: {
      from: 'const text = typeof out.data === "string" ? out.data : JSON.stringify(out.data);',
      to: 'const text = typeof out.body === "string" ? out.body : JSON.stringify(out.body);',
    },
    red: "n8n shape: text lives in data, a body-only item is an error",
  },
  {
    name: "وضع regulatory يمرّر غير الرسمي",
    mutation: {
      from: 'if (mode === "regulatory" && !regulatoryHostAllowed(link.host)) return;',
      to: "",
    },
    red: "regulatory keeps only official hosts",
  },
  {
    name: "تطابق نهاية فقط مع .gov.sa",
    mutation: { from: 'return host.endsWith(".gov.sa");', to: 'return host.endsWith("gov.sa");' },
    red: "regulatory keeps listed and .gov.sa hosts, drops lookalikes",
  },
  {
    name: "قائمة الأحرف الخفية المنتقاة بدل فئة Cf",
    mutation: {
      from: "const INVISIBLE_RE = /[\\p{Cf}\\u{FE00}-\\u{FE0F}\\u{E0100}-\\u{E01EF}]/gu;",
      to: "const INVISIBLE_RE = /[\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u2064\\u2066-\\u2069\\ufeff]/g;",
    },
    red: "every format character and variation selector is stripped from titles and snippets",
  },
  {
    name: "محدّدات الصيغة خارج التنظيف",
    mutation: {
      from: "const INVISIBLE_RE = /[\\p{Cf}\\u{FE00}-\\u{FE0F}\\u{E0100}-\\u{E01EF}]/gu;",
      to: "const INVISIBLE_RE = /[\\p{Cf}]/gu;",
    },
    red: "every format character and variation selector is stripped from titles and snippets",
  },
  {
    name: "عودة الكلفة التربيعية (الأصل: سقف 20000 والنمط القديم)",
    mutation: [
      { from: "const RAW_FIELD_CAP = 4000;", to: "const RAW_FIELD_CAP = 20000;" },
      { from: "const TAG_RE = /<[^<>]*>/g;", to: "const TAG_RE = /<[^>]*>/g;" },
    ],
    red: "hostile angle-bracket fields stay cheap",
  },
  {
    name: "toIso يقبل ما قبل 1990",
    mutation: {
      from: 'if (ms < Date.parse("1990-01-01T00:00:00Z")) return null;',
      to: "",
    },
    red: "toIso lower bound is 1990-01-01",
  },
  {
    name: "toIso يقبل المستقبل البعيد",
    mutation: {
      from: 'if (typeof nowMs === "number" && ms > nowMs + 86400000) return null;',
      to: "",
    },
    red: "toIso upper bound is one day past now",
  },
  {
    name: "تاريخ النشر يُهمل دائمًا",
    mutation: { from: "publishedAt: toIso(item.publishedAt, nowMs),", to: "publishedAt: null," },
    red: "published dates reach the result",
  },
]);

// ---------------------------------------------------------------------------
// build-envelope
// ---------------------------------------------------------------------------
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const envelopeSuite: Suite = (B) => {
  const failed: string[] = [];
  const must = (name: string, ok: boolean) => ok || failed.push(name);
  const valid = (input: any) => {
    try {
      const r = B.buildEnvelope(input);
      return (
        B.validateEnvelope(r.envelope).length === 0 &&
        JSON.parse(r.body).v === 1 &&
        Buffer.byteLength(r.body) <= 32768
      );
    } catch (e) {
      return false;
    }
  };
  const throwing = new Proxy(
    {},
    {
      get() {
        throw new Error("boom");
      },
      has() {
        throw new Error("boom");
      },
      ownKeys() {
        throw new Error("boom");
      },
    },
  );
  const getter = {} as any;
  Object.defineProperty(getter, "providers", {
    get() {
      throw new Error("boom");
    },
    enumerable: true,
  });
  const circ: any = { results: [] };
  circ.results.push(circ);
  const hostile: any[] = [
    undefined,
    null,
    0,
    1,
    true,
    "str",
    [],
    {},
    () => 1,
    Symbol("x"),
    throwing,
    getter,
    circ,
    { providers: "x", results: "y", code: 7 },
    {
      providers: [null, 5, "x", {}, { id: "a" }, { id: "a", status: "bogus", ms: -5, n: "z" }],
      results: [
        null,
        { url: {} },
        { url: "http://x.com/" },
        { url: "https://ok.example.com/", title: 5, snippet: [], provider: "p" },
      ],
    },
    { now: "yesterday" },
    { now: NaN },
    { now: {} },
    {
      requestId: {
        toString() {
          throw new Error("x");
        },
      },
    },
    { requestId: "<script>" },
    { requestId: "a".repeat(5000) },
    { code: "ok", results: [] },
    { code: "no_results" },
    { code: "__proto__" },
  ];
  must("hostile list non-empty", hostile.length > 20);
  hostile.forEach((h, i) => must("hostile input " + i + " yields valid envelope", valid(h)));
  const rnd = prng(20261030);
  const junk = (depth = 0): any => {
    const k = Math.floor(rnd() * 9);
    if (depth > 3 || k < 3)
      return [
        null,
        undefined,
        0,
        -1,
        1e21,
        NaN,
        "",
        "x".repeat(Math.floor(rnd() * 700)),
        true,
        "https://e.example.com/" + Math.floor(rnd() * 99),
        "<b>x</b>",
        String.fromCharCode(0x202e),
      ][Math.floor(rnd() * 12)];
    if (k < 6) return Array.from({ length: Math.floor(rnd() * 8) }, () => junk(depth + 1));
    const o: any = {};
    for (const key of [
      "id",
      "status",
      "ms",
      "n",
      "title",
      "url",
      "snippet",
      "publishedAt",
      "provider",
      "providers",
      "results",
      "code",
      "requestId",
      "now",
    ])
      if (rnd() < 0.5) o[key] = junk(depth + 1);
    return o;
  };
  let bad = 0;
  for (let i = 0; i < 600; i += 1) if (!valid(junk())) bad += 1;
  must("600 fuzz inputs all valid", bad === 0);
  const rid = "123e4567-e89b-42d3-a456-426614174000";
  const good = B.buildEnvelope({
    requestId: rid,
    providers: [{ id: "google", status: "ok", ms: 100, n: 1 }],
    results: [
      {
        title: "T",
        url: "https://a.example.com/",
        snippet: "s",
        publishedAt: "2026-01-01T00:00:00Z",
        provider: "google",
      },
    ],
    now: 1793330000000,
  }).envelope;
  must("ok when results", good.code === "ok" && good.ok === true && good.degraded === false);
  must("fetchedAt from now", good.fetchedAt === "2026-10-30T03:13:20.000Z");
  must("requestId echoed", good.requestId === rid);
  must(
    "http result dropped, not kept",
    B.buildEnvelope({
      providers: [{ id: "g", status: "ok", ms: 1, n: 1 }],
      results: [
        { title: "T", url: "http://a.example.com/", snippet: "s", provider: "g" },
        { title: "T", url: "https://b.example.com/", snippet: "s", provider: "g" },
      ],
    }).envelope.results.length === 1,
  );
  must(
    "code ok only with results (no_results otherwise)",
    B.buildEnvelope({ providers: [{ id: "g", status: "ok", ms: 1, n: 0 }], results: [] }).envelope
      .code === "no_results",
  );
  must(
    "all providers errored ⇒ all_providers_failed",
    B.buildEnvelope({
      providers: [
        { id: "g", status: "error", ms: 1, n: 0 },
        { id: "h", status: "timeout", ms: 1, n: 0 },
      ],
      results: [],
    }).envelope.code === "all_providers_failed",
  );
  must(
    "all skipped ⇒ all_providers_failed",
    B.buildEnvelope({ providers: [{ id: "g", status: "skipped", ms: 0, n: 0 }], results: [] })
      .envelope.code === "all_providers_failed",
  );
  must(
    "no providers ⇒ all_providers_failed",
    B.buildEnvelope({}).envelope.code === "all_providers_failed",
  );
  must(
    "explicit ok cannot be forced",
    B.buildEnvelope({
      code: "ok",
      results: [],
      providers: [{ id: "g", status: "ok", ms: 1, n: 0 }],
    }).envelope.code === "no_results",
  );
  must(
    "explicit ok cannot mask total failure",
    B.buildEnvelope({
      code: "ok",
      results: [],
      providers: [{ id: "g", status: "error", ms: 1, n: 0 }],
    }).envelope.code === "all_providers_failed",
  );
  for (const code of ["auth_failed", "bad_request", "budget_exhausted", "internal"]) {
    const e = B.buildEnvelope({
      code,
      results: [{ title: "T", url: "https://a.example.com/", snippet: "s", provider: "g" }],
      providers: [{ id: "g", status: "ok", ms: 1, n: 1 }],
    }).envelope;
    must(
      "explicit " + code + " drops results and providers",
      e.code === code &&
        e.ok === false &&
        e.degraded === true &&
        e.results.length === 0 &&
        e.providers.length === 0,
    );
  }
  must(
    "degraded when provider errored but ok",
    B.buildEnvelope({
      providers: [
        { id: "g", status: "ok", ms: 1, n: 1 },
        { id: "h", status: "error", ms: 1, n: 0 },
      ],
      results: [{ title: "T", url: "https://a.example.com/", snippet: "s", provider: "g" }],
    }).envelope.degraded === true,
  );
  must(
    "not degraded when only skipped",
    B.buildEnvelope({
      providers: [
        { id: "g", status: "ok", ms: 1, n: 1 },
        { id: "h", status: "skipped", ms: 0, n: 0 },
      ],
      results: [{ title: "T", url: "https://a.example.com/", snippet: "s", provider: "g" }],
    }).envelope.degraded === false,
  );
  const sixteen = Array.from({ length: 16 }, (_, i) => ({
    title: "ع".repeat(200),
    url: "https://a" + i + ".example.com/" + "p".repeat(200),
    snippet: "ن".repeat(400),
    publishedAt: null,
    provider: "p",
  }));
  const big = B.buildEnvelope({
    providers: [{ id: "p", status: "ok", ms: 1, n: 16 }],
    results: sixteen,
  });
  must(
    "results capped at exactly 6",
    big.envelope.code === "ok" && big.envelope.results.length === 6,
  );
  must("body ≤32KB", Buffer.byteLength(big.body) <= 32768);
  must(
    "title ≤120 / snippet ≤300 in envelope",
    big.envelope.results.length > 0 &&
      big.envelope.results.every(
        (r: any) => Array.from(r.title).length <= 120 && Array.from(r.snippet).length <= 300,
      ),
  );
  const hugeFields = B.buildEnvelope({
    providers: [{ id: "p", status: "ok", ms: 1, n: 16 }],
    results: Array.from({ length: 16 }, (_, i) => ({
      title: "t".repeat(20000),
      url: "https://h" + i + ".example.com/",
      snippet: "ن".repeat(20000),
      provider: "p",
    })),
  });
  must(
    "huge fields still ok, 6 results, under 32KB",
    hugeFields.envelope.code === "ok" &&
      hugeFields.envelope.results.length === 6 &&
      Buffer.byteLength(hugeFields.body) <= 32768,
  );
  must(
    "providers capped at 20",
    B.buildEnvelope({
      providers: Array.from({ length: 50 }, (_, i) => ({ id: "p" + i, status: "ok", ms: 1, n: 1 })),
    }).envelope.providers.length === 20,
  );
  must("requestId sanitised", B.buildEnvelope({ requestId: "<script>" }).envelope.requestId === "");

  // publishedAt: ISO صالح يبقى مطبَّعًا وكل ما عداه null (عطل شائع: عكس الشرط فيصير الكل null).
  const pub = (v: any) =>
    B.buildEnvelope({
      providers: [{ id: "g", status: "ok", ms: 1, n: 1 }],
      results: [
        { title: "T", url: "https://a.example.com/", snippet: "s", publishedAt: v, provider: "g" },
      ],
    }).envelope.results[0].publishedAt;
  must(
    "publishedAt keeps a valid ISO string, normalised",
    pub("2026-01-02T03:04:05Z") === "2026-01-02T03:04:05.000Z" &&
      pub("2025-12-31") === "2025-12-31T00:00:00.000Z",
  );
  must(
    "publishedAt is null for empty, invalid or non-string values",
    [null, undefined, "", "not a date", 5, {}, true].every((v) => pub(v) === null),
  );

  // أحرف التنسيق غير المرئية تسقط من العنوان والمقتطف (القاعدة فئة Cf + محدّدات الصيغة).
  const hiddenCps = hiddenFormatCodePoints();
  must(
    "no format character or variation selector survives title or snippet",
    (() => {
      let bad = 0;
      for (let i = 0; i < hiddenCps.length; i += 100) {
        const chunk = hiddenCps.slice(i, i + 100);
        const piece = chunk.map((cp: number) => "a" + String.fromCodePoint(cp)).join("");
        const r = B.buildEnvelope({
          providers: [{ id: "g", status: "ok", ms: 1, n: 1 }],
          results: [{ title: piece, url: "https://a.example.com/", snippet: piece, provider: "g" }],
        }).envelope.results[0];
        const want = "a".repeat(chunk.length);
        if (r.title !== want || r.snippet !== want) bad += 1;
      }
      return hiddenCps.length > 150 && bad === 0;
    })(),
  );
  // الكلفة محدودة على حقول ضخمة من < بلا > (الأصل: نحو 263 ms للحقل الواحد من 20000).
  must(
    "hostile angle-bracket fields stay cheap in the envelope",
    (() => {
      const evil = "<".repeat(20000);
      const started = Date.now();
      const e = B.buildEnvelope({
        providers: [{ id: "g", status: "ok", ms: 1, n: 6 }],
        results: Array.from({ length: 6 }, (_, i) => ({
          title: evil,
          url: "https://c" + i + ".example.com/",
          snippet: evil,
          provider: "g",
        })),
      }).envelope;
      return e.results.length === 6 && Date.now() - started < 400;
    })(),
  );
  // مدقّق الغلاف: يقبل السليم ويرفض كل صنف انتهاك باسمه (هو بوّابة الغلاف الأخيرة قبل الردّ).
  const sound = B.buildEnvelope({
    requestId: rid,
    providers: [{ id: "g", status: "ok", ms: 1, n: 1 }],
    results: [
      { title: "T", url: "https://a.example.com/", snippet: "s", publishedAt: null, provider: "g" },
    ],
    now: 1793330000000,
  }).envelope;
  must("validateEnvelope accepts a sound envelope", B.validateEnvelope(sound).length === 0);
  const flaw = (mutate: (e: any) => void) => {
    const e = JSON.parse(JSON.stringify(sound));
    mutate(e);
    return B.validateEnvelope(e).join("|");
  };
  const flaws: [string, (e: any) => void, string][] = [
    ["extra key", (e) => (e.extra = 1), "extra:extra"],
    ["missing key", (e) => delete e.degraded, "missing:degraded"],
    ["version", (e) => (e.v = 2), "v"],
    ["ok type", (e) => (e.ok = "yes"), "ok"],
    ["code", (e) => (e.code = "bogus"), "code"],
    ["requestId type", (e) => (e.requestId = 5), "requestId"],
    ["degraded type", (e) => (e.degraded = "no"), "degraded"],
    ["fetchedAt type", (e) => (e.fetchedAt = 5), "fetchedAt"],
    ["fetchedAt text", (e) => (e.fetchedAt = "not a date"), "fetchedAt"],
    ["providers type", (e) => (e.providers = "x"), "providers"],
    ["provider null", (e) => (e.providers = [null]), "provider:0"],
    ["provider scalar", (e) => (e.providers = [5]), "provider:0"],
    ["provider id type", (e) => (e.providers[0].id = 5), "provider.id:0"],
    ["provider id empty", (e) => (e.providers[0].id = ""), "provider.id:0"],
    ["provider status", (e) => (e.providers[0].status = "bogus"), "provider.status:0"],
    ["provider ms fraction", (e) => (e.providers[0].ms = 1.5), "provider.ms:0"],
    ["provider ms negative", (e) => (e.providers[0].ms = -1), "provider.ms:0"],
    ["provider n fraction", (e) => (e.providers[0].n = 1.5), "provider.n:0"],
    ["provider n negative", (e) => (e.providers[0].n = -1), "provider.n:0"],
    ["results type", (e) => (e.results = "x"), "results"],
    ["seven results", (e) => (e.results = Array(7).fill(e.results[0])), "results"],
    ["result null", (e) => (e.results = [null]), "result:0"],
    ["result scalar", (e) => (e.results = [5]), "result:0"],
    ["title type", (e) => (e.results[0].title = 5), "result.title:0"],
    ["title length", (e) => (e.results[0].title = "x".repeat(121)), "result.title:0"],
    ["url type", (e) => (e.results[0].url = 5), "result.url:0"],
    [
      "url length",
      (e) => (e.results[0].url = "https://a.example.com/" + "a".repeat(300)),
      "result.url:0",
    ],
    ["url http", (e) => (e.results[0].url = "http://a.example.com/"), "result.url:0"],
    ["snippet type", (e) => (e.results[0].snippet = 5), "result.snippet:0"],
    ["snippet length", (e) => (e.results[0].snippet = "x".repeat(301)), "result.snippet:0"],
    ["publishedAt number", (e) => (e.results[0].publishedAt = 5), "result.publishedAt:0"],
    ["publishedAt text", (e) => (e.results[0].publishedAt = "nope"), "result.publishedAt:0"],
    ["result provider empty", (e) => (e.results[0].provider = ""), "result.provider:0"],
    ["result provider type", (e) => (e.results[0].provider = 5), "result.provider:0"],
    ["ok without ok code", (e) => (e.ok = false), "ok_code_mismatch"],
    ["ok code without results", (e) => (e.results = []), "ok_without_results"],
  ];
  for (const [label, mutate, expected] of flaws) {
    must("validateEnvelope rejects: " + label, flaw(mutate).includes(expected));
  }
  must(
    "validateEnvelope rejects non-objects",
    [null, 5, "x", []].every((v) => B.validateEnvelope(v).join() === "not_object"),
  );
  must(
    "garbage entries are filtered, not fatal",
    (() => {
      const e = B.buildEnvelope({
        requestId: rid,
        providers: [null, 5, "x", { id: "g", status: "ok", ms: 1, n: 1 }],
        results: [
          null,
          5,
          "x",
          { title: "T", url: "https://a.example.com/", snippet: "s", provider: "g" },
        ],
        now: 1793330000000,
      }).envelope;
      return e.code === "ok" && e.providers.length === 1 && e.results.length === 1;
    })(),
  );
  const attempt = (fn: () => boolean) => {
    try {
      return fn();
    } catch (e) {
      return false;
    }
  };
  must(
    "no input at all is all_providers_failed, not internal",
    attempt(() => {
      const e = B.buildEnvelope(null).envelope;
      return e.code === "all_providers_failed" && e.ok === false && e.degraded === true;
    }),
  );
  must(
    "the literal fallback keeps its exact shape",
    attempt(
      () =>
        JSON.stringify(B.buildEnvelope(throwing).envelope) ===
        JSON.stringify({
          v: 1,
          ok: false,
          code: "internal",
          requestId: "",
          degraded: true,
          fetchedAt: "1970-01-01T00:00:00.000Z",
          providers: [],
          results: [],
        }),
    ),
  );
  must(
    "the fallback keeps the request id and the time already read",
    attempt(() => {
      const partial: any = { requestId: rid, now: 1793330000000 };
      Object.defineProperty(partial, "providers", {
        get() {
          throw new Error("boom");
        },
        enumerable: true,
      });
      const e = B.buildEnvelope(partial).envelope;
      return (
        e.code === "internal" && e.requestId === rid && e.fetchedAt === "2026-10-30T03:13:20.000Z"
      );
    }),
  );
  // المشغّل
  const R = (i: any) => B.buildRunnerEnvelope(i).envelope;
  must(
    "runner items: numbers become text, empties are dropped",
    JSON.stringify(
      R({ code: "ok", result: { summary: "s", items: [5, "a", null, "", "  ", 0] } }).result.items,
    ) === JSON.stringify(["5", "a", "0"]),
  );
  must(
    "the runner fallback keeps its exact shape",
    attempt(
      () =>
        JSON.stringify(B.buildRunnerEnvelope(throwing).envelope) ===
        JSON.stringify({ v: 1, ok: false, code: "internal", requestId: "", result: null }),
    ),
  );
  const longItems = Array.from({ length: 30 }, () => "x".repeat(500));
  const ok = R({
    requestId: rid,
    code: "ok",
    result: { summary: "s".repeat(900), items: longItems },
  });
  must(
    "runner ok keeps trimmed result",
    ok.ok === true &&
      ok.result.summary.length <= 500 &&
      ok.result.items.length === 10 &&
      ok.result.items.every((s: string) => Array.from(s).length <= 160),
  );
  must(
    "runner already_done keeps result and ok",
    R({ code: "already_done", result: { summary: "s", items: [] } }).ok === true,
  );
  for (const code of [
    "unknown_workflow",
    "bad_params",
    "auth_failed",
    "budget_exhausted",
    "internal",
  ]) {
    must(
      "runner " + code + " has null result",
      (() => {
        const e = R({ code, result: { summary: "s", items: [] } });
        return e.code === code && e.ok === false && e.result === null;
      })(),
    );
  }
  must("runner ok without result becomes internal", R({ code: "ok" }).code === "internal");
  must("runner unknown code becomes internal", R({ code: "deploy" }).code === "internal");
  must(
    "runner hostile inputs never throw",
    (() => {
      try {
        for (const h of hostile) B.buildRunnerEnvelope(h);
        return true;
      } catch (e) {
        return false;
      }
    })(),
  );
  // استخلاص السياق
  const ctx = B.contextFromWebhook({
    headers: { "X-Nx-Nonce": NONCE.toUpperCase() },
    body: { requestId: rid },
  });
  must("context from webhook", ctx.nonce === NONCE && ctx.requestId === rid);
  must(
    "context accepts only a well-formed nonce (header array form too) and a uuid-like id",
    (() => {
      const arr = B.contextFromWebhook({ headers: { "x-nx-nonce": [NONCE] }, body: {} });
      const short = B.contextFromWebhook({ headers: { "x-nx-nonce": NONCE.slice(1) }, body: {} });
      const strBody = B.contextFromWebhook({ headers: {}, body: "text" });
      const badId = B.contextFromWebhook({ headers: {}, body: { requestId: "not-a-uuid" } });
      const nullBody = B.contextFromWebhook({ headers: {}, body: null });
      const okId = B.contextFromWebhook({ headers: {}, body: { requestId: rid } });
      return (
        arr.nonce === NONCE &&
        short.nonce === "" &&
        strBody.requestId === "" &&
        badId.requestId === "" &&
        nullBody.requestId === "" &&
        okId.requestId === rid
      );
    })(),
  );
  must(
    "context ignores junk",
    B.contextFromWebhook({ headers: { "x-nx-nonce": "zz" }, body: { requestId: "no" } }).nonce ===
      "" && B.contextFromWebhook(undefined).requestId === "",
  );
  return failed;
};

expectRedOnPlanted("build-envelope", envelopeSuite, [
  {
    name: "تاريخ النشر يُمسح لكل نتيجة",
    mutation: {
      from: 'if (typeof value !== "string" || value.length === 0) return null;',
      to: 'if (typeof value !== "string" || value.length !== 0) return null;',
    },
    red: "publishedAt keeps a valid ISO string, normalised",
  },
  {
    name: "قائمة الأحرف الخفية المنتقاة بدل فئة Cf",
    mutation: {
      from: "const INVISIBLE_RE = /[\\p{Cf}\\u{FE00}-\\u{FE0F}\\u{E0100}-\\u{E01EF}]/gu;",
      to: "const INVISIBLE_RE = /[\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u2064\\u2066-\\u2069\\ufeff]/g;",
    },
    red: "no format character or variation selector survives title or snippet",
  },
  {
    name: "عودة الكلفة التربيعية (بلا سقف والنمط القديم)",
    mutation: [
      { from: "const RAW_FIELD_CAP = 4000;", to: "const RAW_FIELD_CAP = 100000000;" },
      { from: "const TAG_RE = /<[^<>]*>/g;", to: "const TAG_RE = /<[^>]*>/g;" },
    ],
    red: "hostile angle-bracket fields stay cheap in the envelope",
  },
  {
    name: "السقف 6 نتائج (التحقق الذاتي يسقط إلى الاحتياطي)",
    mutation: { from: "if (out.length >= 6) break;", to: "" },
    red: "results capped at exactly 6",
  },
  {
    name: "تمرير رابط http (طبقة التطبيع وحدها، فيلتقطه التحقق الذاتي)",
    mutation: {
      from: "if (url.length === 0 || url.length > 300 || !HTTPS_RE.test(url)) continue;",
      to: "if (url.length === 0 || url.length > 300) continue;",
    },
    red: "http result dropped, not kept",
  },
  {
    name: "تمرير رابط http مع تعطيل التحقق الذاتي (الطبقتان)",
    mutation: [
      {
        from: "if (url.length === 0 || url.length > 300 || !HTTPS_RE.test(url)) continue;",
        to: "if (url.length === 0 || url.length > 300) continue;",
      },
      { from: 'throw new Error("invalid_envelope");', to: "return { envelope, body };" },
    ],
    red: "http result dropped, not kept",
  },
  {
    name: "رمز ok صريح يُصدَّق",
    mutation: {
      from: "const explicit = EXPLICIT_FAILURE_CODES.indexOf(safe.code) !== -1;",
      to: 'const explicit = EXPLICIT_FAILURE_CODES.indexOf(safe.code) !== -1 || safe.code === "ok";',
    },
    red: "explicit ok cannot mask total failure",
  },
  {
    name: "حدود الحقول مرفوعة والجسم يتجاوز 32 كيلوبايت (الفحص النهائي للحجم)",
    mutation: [
      {
        from: "snippet: cleanText(item.snippet, 300),",
        to: "snippet: cleanText(item.snippet, 9000),",
      },
      { from: "Array.from(r.snippet).length > 300", to: "Array.from(r.snippet).length > 9000" },
    ],
    red: "huge fields still ok, 6 results, under 32KB",
  },
  {
    name: "ترك عنوان المقتطف بلا حدّ",
    mutation: {
      from: "snippet: cleanText(item.snippet, 300),",
      to: "snippet: String(item.snippet || ''),",
    },
    red: "title ≤120 / snippet ≤300 in envelope",
  },
  {
    name: "رمي بدل الاحتياطي",
    mutation: {
      from: "const envelope = literalFallback(requestId, fetchedAt);\n    return { envelope, body: JSON.stringify(envelope) };\n  }\n}\n\nfunction normaliseItems",
      to: "throw error;\n  }\n}\n\nfunction normaliseItems",
    },
    red: "hostile input 10 yields valid envelope",
  },
]);

// ---------------------------------------------------------------------------
// budget
// ---------------------------------------------------------------------------
const budgetSuite: Suite = (B) => {
  const failed: string[] = [];
  const must = (name: string, ok: boolean) => ok || failed.push(name);
  const T = 1793330000000;
  let state: any;
  let allowed = 0;
  for (let i = 0; i < 61; i += 1) {
    const r = B.checkBudget({ state, now: T + i });
    state = r.state;
    if (r.allowed) allowed += 1;
  }
  must("60 allowed then deny", allowed === 60);
  must("denied request not recorded", state.hits.length === 60);
  const denied = B.checkBudget({ state, now: T + 100 });
  must(
    "denied reports retryAfter",
    denied.allowed === false && denied.retryAfterMs > 0 && denied.retryAfterMs <= 60000,
  );
  must("window slides after 60s", B.checkBudget({ state, now: T + 60000 }).allowed === true);
  must(
    "edge: 59999ms still denied for first hit",
    B.checkBudget({ state, now: T + 59999 }).allowed === false,
  );
  must("remaining counts down", B.checkBudget({ state: undefined, now: T }).remaining === 59);
  must(
    "corrupt state resets and allows",
    B.checkBudget({ state: "garbage", now: T }).allowed === true &&
      B.checkBudget({ state: { hits: "x" }, now: T }).allowed === true,
  );
  must(
    "future/NaN timestamps dropped",
    B.checkBudget({ state: { hits: [T + 10 ** 9, NaN, "a", null] }, now: T }).state.hits.length ===
      1,
  );
  const flood = { hits: Array.from({ length: 10000 }, (_, i) => T - 1000 + (i % 900)) };
  const f = B.checkBudget({ state: flood, now: T });
  must("giant corrupt state denied and bounded", f.allowed === false && f.state.hits.length <= 60);
  must(
    "custom limit",
    B.checkBudget({ state: { hits: [T, T] }, now: T + 1, limit: 2 }).allowed === false,
  );
  must(
    "custom window: denied inside it, allowed at its edge; bad values fall back to 60s",
    B.checkBudget({ state: { hits: [T] }, now: T + 999, limit: 1, windowMs: 1000 }).allowed ===
      false &&
      B.checkBudget({ state: { hits: [T] }, now: T + 1000, limit: 1, windowMs: 1000 }).allowed ===
        true &&
      B.checkBudget({ state: { hits: [T] }, now: T + 5000, limit: 1, windowMs: 0 }).allowed ===
        false &&
      B.checkBudget({ state: { hits: [T] }, now: T + 5000, limit: 1, windowMs: -5 }).allowed ===
        false,
  );
  must(
    "never throws",
    (() => {
      try {
        B.checkBudget(undefined);
        B.checkBudget({ now: "x" });
        return true;
      } catch (e) {
        return false;
      }
    })(),
  );
  return failed;
};

expectRedOnPlanted("budget", budgetSuite, [
  {
    name: "السقف 60 ← 600",
    mutation: { from: "const DEFAULT_LIMIT = 60;", to: "const DEFAULT_LIMIT = 600;" },
    red: "60 allowed then deny",
  },
  {
    name: "حافة النافذة",
    mutation: { from: "now - t < windowMs", to: "now - t <= windowMs" },
    red: "window slides after 60s",
  },
  {
    name: "حالة غير محدودة",
    mutation: { from: ".slice(-limit)", to: "" },
    red: "giant corrupt state denied and bounded",
  },
  {
    name: "تسجيل المرفوض",
    mutation: {
      from: "return { allowed: false, state: { hits }, remaining: 0, retryAfterMs };",
      to: "hits.push(now);\n    return { allowed: false, state: { hits }, remaining: 0, retryAfterMs };",
    },
    red: "denied request not recorded",
  },
]);

// ---------------------------------------------------------------------------
// canary-evaluate
// ---------------------------------------------------------------------------
const canarySuite: Suite = (C) => {
  const failed: string[] = [];
  const must = (name: string, ok: boolean) => ok || failed.push(name);
  const T = 1793330000000;
  const h = (
    app = "ok",
    chat: any = { ok: true, gate: "verified", key_present: true },
    provider = 200,
  ) => ({
    // شكل ناتج HTTP في n8n الحقيقي (ردّ نصّي كامل): المتن في data.
    app: {
      statusCode: app === "unreachable" ? undefined : 200,
      data: JSON.stringify({
        status: app,
        subsystems: { db: { status: app === "ok" ? "ok" : app } },
      }),
    },
    chat: { statusCode: 200, data: JSON.stringify(chat) },
    provider: { statusCode: provider, data: "{}" },
  });
  let s = C.canaryEvaluate({ health: h(), now: T });
  must("first ok sample is silent", s.notify === false && s.status === "ok");
  s = C.canaryEvaluate({ health: h("down"), state: s.state, now: T + 60000 });
  must("single bad sample does not alert", s.notify === false && s.status === "ok");
  s = C.canaryEvaluate({ health: h("ok"), state: s.state, now: T + 120000 });
  must("flap back clears pending", s.notify === false && s.state.pendingCount === 0);
  s = C.canaryEvaluate({ health: h("down"), state: s.state, now: T + 180000 });
  s = C.canaryEvaluate({ health: h("down"), state: s.state, now: T + 240000 });
  must(
    "two bad samples alert once as change",
    s.notify === true && s.type === "change" && s.status === "down",
  );
  must(
    "alert message is Arabic and short",
    /متوقفة/.test(s.message) && s.message.split("\n").length <= 6 && !s.message.includes("—"),
  );
  const lastAt = s.state.lastNotifiedAt;
  s = C.canaryEvaluate({ health: h("down"), state: s.state, now: T + 300000 });
  must("no repeat inside 6h", s.notify === false);
  must(
    "no repeat after 1h",
    C.canaryEvaluate({ health: h("down"), state: s.state, now: lastAt + 3600000 }).notify === false,
  );
  must("lastNotifiedAt kept without notify", s.state.lastNotifiedAt === lastAt);
  const six = C.canaryEvaluate({ health: h("down"), state: s.state, now: lastAt + 6 * 3600000 });
  must(
    "reminder at exactly 6h",
    six.notify === true && six.type === "reminder" && /تذكير/.test(six.message),
  );
  must(
    "no reminder just before 6h",
    C.canaryEvaluate({ health: h("down"), state: s.state, now: lastAt + 6 * 3600000 - 1 })
      .notify === false,
  );
  let r = C.canaryEvaluate({ health: h("ok"), state: s.state, now: T + 400000 });
  r = C.canaryEvaluate({ health: h("ok"), state: r.state, now: T + 460000 });
  must(
    "recovery after two ok samples",
    r.notify === true && r.type === "recovery" && /تعافى/.test(r.message),
  );
  must(
    "recovery once only",
    C.canaryEvaluate({ health: h("ok"), state: r.state, now: T + 520000 }).notify === false,
  );
  const init = C.canaryEvaluate({ health: h("down"), now: T });
  must("initial bad state alerts immediately", init.notify === true && init.type === "initial");
  must(
    "degraded app maps to degraded",
    C.canaryEvaluate({ health: h("degraded"), now: T }).observed === "degraded",
  );
  must(
    "chat gate closed is degraded",
    C.canaryEvaluate({ health: h("ok", { ok: true, gate: "closed", key_present: true }), now: T })
      .observed === "degraded",
  );
  must(
    "chat missing key is degraded",
    C.canaryEvaluate({
      health: h("ok", { ok: true, gate: "verified", key_present: false }),
      now: T,
    }).observed === "degraded",
  );
  must(
    "chat unreachable is down",
    C.canaryEvaluate({ health: { ...h(), chat: { error: "x" } }, now: T }).observed === "down",
  );
  must(
    "provider canary failure only degrades",
    C.canaryEvaluate({ health: h("ok", undefined, 500), now: T }).observed === "degraded",
  );
  must(
    "app unreachable is down",
    C.canaryEvaluate({ health: h("unreachable"), now: T }).observed === "down",
  );
  must(
    "bad json body is down",
    C.canaryEvaluate({ health: { ...h(), app: { statusCode: 200, data: "<html>" } }, now: T })
      .observed === "down",
  );
  // الشكل الذي كان يخترعه المحرّك (body) ليس ردًّا صالحًا: يُرصد متوقفًا بدل أن يُقرأ سليمًا بالخطأ.
  must(
    "a body-only item is not a healthy answer (n8n puts text in data)",
    (() => {
      const stale = {
        app: { statusCode: 200, body: JSON.stringify({ status: "ok" }) },
        chat: { statusCode: 200, body: JSON.stringify({ ok: true, gate: "verified" }) },
        provider: { statusCode: 200, body: "{}" },
      };
      const e = C.canaryEvaluate({ health: stale, now: T });
      return e.observed === "down" && e.checks[0].detail === "bad_body";
    })(),
  );
  must(
    "a healthy data item is silent and ok",
    (() => {
      const e = C.canaryEvaluate({ health: h(), now: T });
      return e.observed === "ok" && e.notify === false && e.message === "";
    })(),
  );

  // محتوى الرسالة: تُسرد الفحوص الفاشلة وحدها (عطل شائع: عكس الشرط فتُسرد السليمة وتُحذف الفاشلة).
  const closed = C.canaryEvaluate({
    health: h("ok", { ok: true, gate: "closed", key_present: true }),
    now: T,
  });
  must(
    "alert lists the failing check and omits the healthy ones",
    closed.notify === true &&
      closed.message.includes("الدردشة: متدهورة (gate_closed)") &&
      !closed.message.includes("الصحة العامة") &&
      !closed.message.includes("مزوّد الويب") &&
      closed.message.split("\n").length === 2,
  );
  const two = C.canaryEvaluate({ health: h("down", undefined, 500), now: T });
  must(
    "alert lists every failing check with its label and status",
    two.message.includes("الصحة العامة: متوقفة") &&
      two.message.includes("مزوّد الويب: متدهورة (unreachable)") &&
      !two.message.includes("الدردشة") &&
      two.message.startsWith("تنبيه: حالة سَدِيد الآن متوقفة."),
  );
  must(
    "reminder names the status and the elapsed hours",
    (() => {
      const first = C.canaryEvaluate({ health: h("down"), now: T });
      const later = C.canaryEvaluate({
        health: h("down"),
        state: first.state,
        now: T + 7 * 3600000,
      });
      return (
        later.type === "reminder" &&
        later.message.startsWith("تذكير: الحالة ما زالت متوقفة منذ نحو 7 ساعات.") &&
        later.message.includes("الصحة العامة: متوقفة")
      );
    })(),
  );
  must(
    "recovery message carries no failing-check lines",
    (() => {
      let st = C.canaryEvaluate({ health: h("down"), now: T }).state;
      st = C.canaryEvaluate({ health: h("ok"), state: st, now: T + 60000 }).state;
      const rec = C.canaryEvaluate({ health: h("ok"), state: st, now: T + 120000 });
      return rec.type === "recovery" && rec.message === "تعافى سَدِيد. كل الفحوص سليمة الآن.";
    })(),
  );

  // تيليجرام: وضع HTML يحتاج تهريب & و< و> فقط، والشرطة السفلية لا تمسّ.
  must(
    "telegram html escapes only & < >",
    C.toTelegramHtml("gate_closed <b>&amp; x>y") === "gate_closed &lt;b&gt;&amp;amp; x&gt;y" &&
      C.toTelegramHtml(undefined) === "" &&
      C.toTelegramHtml(null) === "" &&
      C.toTelegramHtml("a_b_c") === "a_b_c",
  );
  must(
    "telegram html of a real alert keeps its underscores",
    C.toTelegramHtml(closed.message).includes("(gate_closed)"),
  );

  // التسليم: يكفي نجاح قناة؛ الفشل بعنصر error؛ الفارغ ليس نجاحًا.
  const tgOk = [{ ok: true, result: { message_id: 1 } }];
  const tgBad = [{ error: "Bad Request: can't parse entities" }];
  const mailOk = [{ messageId: "<x@y>", accepted: ["a@b"] }];
  const mailBad = [{ error: "Invalid login" }];
  must(
    "delivery: telegram alone is enough",
    C.deliveryOutcome({ telegram: tgOk, email: mailBad }).delivered === true &&
      C.deliveryOutcome({ telegram: tgOk, email: mailBad }).telegram === true &&
      C.deliveryOutcome({ telegram: tgOk, email: mailBad }).email === false,
  );
  must(
    "delivery: email alone is enough",
    C.deliveryOutcome({ telegram: tgBad, email: mailOk }).delivered === true,
  );
  must(
    "delivery: both failed or empty is not delivered",
    C.deliveryOutcome({ telegram: tgBad, email: mailBad }).delivered === false &&
      C.deliveryOutcome({ telegram: [], email: [] }).delivered === false &&
      C.deliveryOutcome(undefined).delivered === false &&
      C.deliveryOutcome({ telegram: [null, 5, "x"], email: [{}] }).telegram === false,
  );
  must(
    "delivery: a telegram item without ok or result is not delivered",
    C.deliveryOutcome({ telegram: [{}], email: [] }).delivered === false,
  );
  const prevState = {
    status: "down",
    since: 5,
    lastNotifiedAt: 7,
    pendingStatus: "",
    pendingCount: 0,
  };
  const fail1 = C.planDeliveryFailure({ prevState, raisedAt: 0, now: T });
  must(
    "delivery failure rolls the state back to a clone and raises the first time",
    fail1.raise === true &&
      fail1.raisedAt === T &&
      JSON.stringify(fail1.state) === JSON.stringify(prevState) &&
      fail1.state !== prevState,
  );
  must(
    "delivery failure raises at most once per 30 minutes",
    C.planDeliveryFailure({ prevState, raisedAt: T - 29 * 60000, now: T }).raise === false &&
      C.planDeliveryFailure({ prevState, raisedAt: T - 29 * 60000, now: T }).raisedAt ===
        T - 29 * 60000 &&
      C.planDeliveryFailure({ prevState, raisedAt: T - 30 * 60000, now: T }).raise === true,
  );
  must(
    "delivery failure with no prior state rolls back to empty (initial re-evaluation)",
    JSON.stringify(C.planDeliveryFailure({ prevState: null, raisedAt: 0, now: T }).state) ===
      "{}" && C.planDeliveryFailure(undefined).raise === true,
  );
  must(
    "rolled-back state re-notifies on the next evaluation",
    (() => {
      const bad = C.canaryEvaluate({ health: h("down"), now: T });
      const rolled = C.planDeliveryFailure({ prevState: null, raisedAt: 0, now: T }).state;
      const again = C.canaryEvaluate({ health: h("down"), state: rolled, now: T + 60000 });
      return bad.notify === true && again.notify === true && again.type === "initial";
    })(),
  );
  must(
    "never throws on garbage",
    (() => {
      try {
        C.canaryEvaluate(undefined);
        C.canaryEvaluate({ health: { app: 5, chat: null }, state: "x", now: "y" });
        return true;
      } catch (e) {
        return false;
      }
    })(),
  );
  // تفاصيل الفحوص: أسماء الأنظمة الفرعية المتعثرة، وقيمة status الغريبة، والأجسام التالفة.
  const appCheck = (data: any) =>
    C.canaryEvaluate({ health: { ...h(), app: { statusCode: 200, data } }, now: T }).checks[0];
  const appObj = (obj: any) => appCheck(JSON.stringify(obj));
  must(
    "app detail lists the failing subsystems only, in order",
    (() => {
      const c = appObj({
        status: "degraded",
        subsystems: {
          db: { status: "down" },
          cache: { status: "degraded" },
          web: { status: "ok" },
        },
      });
      return c.status === "degraded" && c.detail === "db,cache";
    })(),
  );
  must(
    "app down names the failing subsystem, or the odd status when none",
    appObj({ status: "down", subsystems: { db: { status: "down" } } }).detail === "db" &&
      appObj({ status: "weird" }).detail === "status_weird" &&
      appObj({ status: "weird" }).status === "down",
  );
  must(
    "app subsystems garbage is tolerated",
    appObj({ status: "ok", subsystems: null }).status === "ok" &&
      appObj({ status: "ok", subsystems: { a: null, b: 5 } }).status === "ok" &&
      appObj({ status: "degraded", subsystems: "x" }).detail === "",
  );
  must(
    "app detail is capped at five names",
    appObj({
      status: "degraded",
      subsystems: Object.fromEntries(
        ["a", "b", "c", "d", "e", "f"].map((k) => [k, { status: "down" }]),
      ),
    }).detail === "a,b,c,d,e",
  );
  must(
    "empty, null, scalar, broken and oversize bodies are bad_body",
    ["", "null", "5", '"x"', "[", JSON.stringify({ status: "ok", pad: "x".repeat(262144) })].every(
      (d) => appCheck(d).status === "down" && appCheck(d).detail === "bad_body",
    ),
  );
  must(
    "chat and provider failure modes",
    (() => {
      const chat = (res: any) =>
        C.canaryEvaluate({ health: { ...h(), chat: res }, now: T }).checks[1];
      const prov = (res: any) =>
        C.canaryEvaluate({ health: { ...h(), provider: res }, now: T }).checks[2];
      return (
        chat({ statusCode: 503, data: "{}" }).detail === "unreachable" &&
        chat({ statusCode: 200, data: JSON.stringify({ ok: false }) }).detail === "bad_body" &&
        chat({ statusCode: 200, data: "x" }).status === "down" &&
        chat({ statusCode: 200, data: JSON.stringify({ ok: true, gate: "degraded" }) }).detail ===
          "gate_degraded" &&
        chat({ statusCode: 200, data: JSON.stringify({ ok: true, key_present: false }) }).detail ===
          "no_key" &&
        prov({ statusCode: 200, data: "not json" }).detail === "bad_body" &&
        prov({ statusCode: 200, data: "not json" }).status === "degraded" &&
        prov({ statusCode: 429, data: "{}" }).detail === "unreachable" &&
        prov({ statusCode: 200, data: "{}" }).status === "ok"
      );
    })(),
  );
  // الحجب
  const red = C.redactErrorMessage(
    "fail Bearer abcdef123456 https://x.example/a?key=SECRET123&b=2 token=abc123 " + "A".repeat(40),
    200,
  );
  must("redacts bearer", !red.includes("abcdef123456"));
  must("redacts url query", !red.includes("SECRET123") && !red.includes("key="));
  must("redacts token= pairs", !red.includes("abc123"));
  must("redacts long opaque strings", !red.includes("A".repeat(30)));
  must(
    "first 200 chars only",
    Array.from(C.redactErrorMessage("x ".repeat(400), 200)).length <= 200,
  );
  const msg = C.formatErrorAlert({
    workflow: "wf",
    node: "HTTP Google",
    message: "boom",
    input: { secret: "S3CRET" },
  });
  must(
    "error alert has workflow node message",
    msg.includes("wf") && msg.includes("HTTP Google") && msg.includes("boom"),
  );
  must("error alert never includes input data", !msg.includes("S3CRET"));
  must("error alert handles missing fields", C.formatErrorAlert(undefined).includes("غير معروف"));
  return failed;
};

expectRedOnPlanted("canary-evaluate", canarySuite, [
  {
    name: "تثبيت رصدين ← رصد",
    mutation: { from: "const CONFIRMATIONS = 2;", to: "const CONFIRMATIONS = 1;" },
    red: "single bad sample does not alert",
  },
  {
    name: "التذكير 6 س ← 6 د",
    mutation: {
      from: "const REMINDER_MS = 6 * 3600 * 1000;",
      to: "const REMINDER_MS = 6 * 60 * 1000;",
    },
    red: "no repeat after 1h",
  },
  {
    name: "حذف حجب Bearer",
    mutation: {
      from: '.replace(/\\b(bearer|basic)\\s+[A-Za-z0-9._~+/=-]{6,}/gi, "$1 [محجوب]")',
      to: "",
    },
    red: "redacts bearer",
  },
  {
    name: "حذف قصّ الرابط",
    mutation: {
      from: '.replace(/https?:\\/\\/[^\\s)\'"]+/gi, (url) => url.split("?")[0].split("#")[0])',
      to: "",
    },
    red: "redacts url query",
  },
  {
    name: "الدردشة المغلقة تُعدّ سليمة",
    mutation: {
      from: 'if (body.gate === "closed") return { name: "chat", status: "degraded", detail: "gate_closed" };',
      to: "",
    },
    red: "chat gate closed is degraded",
  },
  {
    name: "الرسالة تسرد السليمة وتحذف الفاشلة",
    mutation: {
      from: 'if (check.status === "ok") continue;',
      to: 'if (check.status !== "ok") continue;',
    },
    red: "alert lists the failing check and omits the healthy ones",
  },
  {
    name: "الشيفرة تعود إلى قراءة body بدل data",
    mutation: {
      from: "const body = parseBody(res.data);",
      to: "const body = parseBody(res.body);",
    },
    red: "a healthy data item is silent and ok",
  },
  {
    name: "تهريب & يُحذف (تيليجرام يرفض الرسالة)",
    mutation: { from: '.replace(/&/g, "&amp;")', to: "" },
    red: "telegram html escapes only & < >",
  },
  {
    name: "قناة بريد فاشلة تُعدّ تسليمًا",
    mutation: {
      from: "const email = em.length > 0 && em.every((j) => isRecord(j) && !j.error);",
      to: "const email = em.length > 0;",
    },
    red: "delivery: telegram alone is enough",
  },
  {
    name: "تيليجرام بلا ok أو result يُعدّ تسليمًا",
    mutation: {
      from: "tg.every((j) => isRecord(j) && !j.error && (j.ok === true || j.result !== undefined));",
      to: "tg.every((j) => isRecord(j) && !j.error);",
    },
    red: "delivery: a telegram item without ok or result is not delivered",
  },
  {
    name: "خطأ التسليم يُرفع في كل دقيقة",
    mutation: {
      from: "const DELIVERY_RAISE_EVERY_MS = 30 * 60 * 1000;",
      to: "const DELIVERY_RAISE_EVERY_MS = 1;",
    },
    red: "delivery failure raises at most once per 30 minutes",
  },
  {
    name: "الحالة لا تعود عند فشل التسليم",
    mutation: {
      from: "state: JSON.parse(JSON.stringify(prev)),",
      to: "state: { status: 'ok', since: now, lastNotifiedAt: now, pendingStatus: '', pendingCount: 0 },",
    },
    red: "delivery failure rolls the state back to a clone and raises the first time",
  },
]);

// ---------------------------------------------------------------------------
// runner-dispatch
// ---------------------------------------------------------------------------
const runnerSuite: Suite = (R) => {
  const failed: string[] = [];
  const must = (name: string, ok: boolean) => ok || failed.push(name);
  const T = 1793330000000;
  const body = (workflow: string, params: any = {}, over: any = {}) => ({
    v: 1,
    requestId: UUID,
    workflow,
    params,
    ...over,
  });
  const d = (b: any, over: any = {}) =>
    R.dispatch({ body: b, idemKey: "abcdefgh12345678", now: T, store: {}, ...over });
  must(
    "catalog is exactly the five ids",
    JSON.stringify(R.CATALOG) ===
      JSON.stringify([
        "engineering_digest",
        "dependency_advisory_scan",
        "research_cache_purge",
        "canary_run_now",
        "owner_notify_test",
      ]),
  );
  must(
    "param specs cover exactly the catalog",
    JSON.stringify(Object.keys(R.PARAM_SPECS).sort()) === JSON.stringify(R.CATALOG.slice().sort()),
  );
  for (const id of R.CATALOG) must("known id runs: " + id, d(body(id)).decision === "run");
  for (const bad of [
    "deploy_prod",
    "ENGINEERING_DIGEST",
    "engineering_digest ",
    "__proto__",
    "constructor",
    "toString",
  ]) {
    must("unknown id refused: " + String(bad), d(body(bad)).decision === "unknown_workflow");
  }
  for (const bad of ["", 5, null]) {
    must(
      "non-string/empty id refused: " + String(bad),
      ["unknown_workflow", "bad_params"].includes(d(body(bad as any)).decision),
    );
  }
  must(
    "proto-name never runs",
    d(body("__proto__")).decision !== "run" && d(body("constructor")).decision !== "run",
  );
  const bp = (w: string, params: any) => d(body(w, params)).decision;
  must("days 0 refused", bp("engineering_digest", { days: 0 }) === "bad_params");
  must("days 31 refused", bp("engineering_digest", { days: 31 }) === "bad_params");
  must("days 30 accepted", bp("engineering_digest", { days: 30 }) === "run");
  must("days float refused", bp("engineering_digest", { days: 1.5 }) === "bad_params");
  must("days string refused", bp("engineering_digest", { days: "7" }) === "bad_params");
  must(
    "severity enum",
    bp("engineering_digest", { severity: "low" }) === "bad_params" &&
      bp("engineering_digest", { severity: "high" }) === "run",
  );
  must(
    "scan days up to 90",
    bp("dependency_advisory_scan", { days: 90 }) === "run" &&
      bp("dependency_advisory_scan", { days: 91 }) === "bad_params",
  );
  must("extra key refused", bp("engineering_digest", { days: 3, shell: "x" }) === "bad_params");
  must("keys on no-param workflow refused", bp("canary_run_now", { force: true }) === "bad_params");
  must(
    "params must be object",
    bp("engineering_digest", [] as any) === "bad_params" &&
      bp("engineering_digest", "x" as any) === "bad_params",
  );
  must("missing params default", d(body("engineering_digest", undefined as any)).params.days === 7);
  must("purge scope enum", bp("research_cache_purge", { scope: "everything" }) === "bad_params");
  must(
    "requestId must be uuid",
    d(body("canary_run_now", {}, { requestId: "x" })).decision === "bad_params",
  );
  must("version must be 1", d(body("canary_run_now", {}, { v: 2 })).decision === "bad_params");
  must("body must be object", d(null).decision === "bad_params" && d([]).decision === "bad_params");
  must(
    "idempotency key required",
    d(body("canary_run_now"), { idemKey: "" }).decision === "bad_params" &&
      d(body("canary_run_now"), { idemKey: undefined }).decision === "bad_params",
  );
  must(
    "idempotency key shape",
    d(body("canary_run_now"), { idemKey: "short" }).decision === "bad_params" &&
      d(body("canary_run_now"), { idemKey: "has space in it!" }).decision === "bad_params",
  );
  // التكرار
  const store0 = R.recordResult({
    store: {},
    idemKey: "abcdefgh12345678",
    workflow: "canary_run_now",
    result: { summary: "x", items: [] },
    now: T,
  });
  const again = d(body("canary_run_now"), { store: store0, now: T + 1000 });
  must(
    "repeat returns already_done with stored result",
    again.decision === "already_done" && again.result.summary === "x",
  );
  must(
    "repeat for other workflow refused",
    d(body("owner_notify_test"), { store: store0, now: T + 1000 }).decision === "bad_params",
  );
  must(
    "fresh at 23h59",
    d(body("canary_run_now"), { store: store0, now: T + 24 * 3600000 - 1 }).decision ===
      "already_done",
  );
  must(
    "expired at 24h",
    d(body("canary_run_now"), { store: store0, now: T + 24 * 3600000 }).decision === "run",
  );
  let st: any = {};
  for (let i = 0; i < 520; i += 1)
    st = R.recordResult({
      store: st,
      idemKey: "key-" + String(i).padStart(10, "0"),
      workflow: "canary_run_now",
      result: { summary: "x", items: [] },
      now: T + i,
    });
  must("idempotency store capped at 500", Object.keys(st).length === 500);
  must(
    "oldest evicted first",
    st["key-0000000000"] === undefined && st["key-0000000519"] !== undefined,
  );
  must(
    "corrupt store tolerated",
    d(body("canary_run_now"), { store: "x" }).decision === "run" &&
      d(body("canary_run_now"), { store: { k: 5 } }).decision === "run",
  );
  // الطلبات والتلخيص
  const req = R.buildRequest("engineering_digest", { days: 7, severity: "critical" }, T);
  must(
    "digest request host",
    req.url.startsWith("https://api.github.com/advisories?") &&
      req.url.includes("severity=critical") &&
      req.url.includes("published=%3E%3D2026-10-23"),
  );
  const scan = R.buildRequest("dependency_advisory_scan", { days: 30 }, T);
  must(
    "scan request lists packages",
    decodeURIComponent(scan.url).includes("affects=react,vite,zod"),
  );
  must(
    "no request for local workflows",
    R.buildRequest("research_cache_purge", { scope: "all" }, T) === null &&
      R.buildRequest("canary_run_now", {}, T) === null,
  );
  must(
    "stub base honoured",
    R.buildRequest(
      "engineering_digest",
      { days: 1, severity: "high" },
      T,
      "http://127.0.0.1:8787/stub",
    ).url.startsWith("http://127.0.0.1:8787/stub/api.github.com/advisories?"),
  );
  const sum = R.summariseAdvisories(
    "engineering_digest",
    { days: 7, severity: "critical" },
    { statusCode: 200, data: JSON.stringify(FIXTURES.advisories) },
  );
  must(
    "advisory summary counts",
    Boolean(sum) &&
      sum.summary.includes("2") &&
      sum.items.length === 2 &&
      sum.items.every((s: string) => Array.from(s).length <= 160),
  );
  must(
    "advisory summary states it is not an audit",
    Boolean(sum) && sum.summary.includes("ليست تدقيقًا"),
  );
  must(
    "summary null on 500",
    R.summariseAdvisories(
      "engineering_digest",
      { days: 1, severity: "high" },
      { statusCode: 500, data: "x" },
    ) === null,
  );
  must(
    "summary null on bad json",
    R.summariseAdvisories(
      "engineering_digest",
      { days: 1, severity: "high" },
      { statusCode: 200, data: "{x" },
    ) === null,
  );
  // الشكل الذي كان يخترعه المحرّك (body) ليس ردًّا صالحًا: يعود null لا ملخصًا فارغًا.
  must(
    "n8n shape: a body-only advisories item is null (text lives in data)",
    R.summariseAdvisories(
      "engineering_digest",
      { days: 7, severity: "critical" },
      { statusCode: 200, body: JSON.stringify(FIXTURES.advisories) },
    ) === null &&
      R.summariseAdvisories(
        "engineering_digest",
        { days: 7, severity: "critical" },
        { statusCode: 200, data: JSON.stringify(FIXTURES.advisories) },
      ) !== null,
  );
  must(
    "summary null on error item",
    R.summariseAdvisories("engineering_digest", { days: 1, severity: "high" }, { error: "x" }) ===
      null,
  );
  const firstLine = (summary: string) => {
    const r = R.summariseAdvisories(
      "engineering_digest",
      { days: 1, severity: "high" },
      {
        statusCode: 200,
        data: JSON.stringify([{ ghsa_id: "G", severity: "high", summary, vulnerabilities: [] }]),
      },
    );
    return r ? r.items[0] : null;
  };
  must("summary strips markup", firstLine("<script>x</script>y") === "G | high | x y");
  // الأسطر تصل المالك: أحرف التنسيق الخفية (فئة Cf ومحدّدات الصيغة) تسقط كلها.
  const lineFor = firstLine;
  const hiddenCps = hiddenFormatCodePoints();
  must(
    "no format character or variation selector survives a runner line",
    (() => {
      let bad = 0;
      for (let i = 0; i < hiddenCps.length; i += 100) {
        const chunk = hiddenCps.slice(i, i + 100);
        const piece = chunk.map((cp: number) => "a" + String.fromCodePoint(cp)).join("");
        if (lineFor(piece) !== "G | high | " + "a".repeat(chunk.length)) bad += 1;
      }
      return hiddenCps.length > 150 && bad === 0;
    })(),
  );
  must(
    "hostile angle-bracket summaries stay cheap in a runner line",
    (() => {
      const evil = "<".repeat(20000);
      const started = Date.now();
      for (let i = 0; i < 6; i += 1) lineFor(evil);
      return Date.now() - started < 400;
    })(),
  );
  must(
    "notify summary delivered/failed",
    R.summariseNotify({ ok: true, result: {} }).items[0].includes("ناجح") &&
      R.summariseNotify({ error: "x" }).items[0].includes("فشل") &&
      R.summariseNotify(undefined).items[0].includes("فشل"),
  );
  must(
    "notify summary: delivered needs ok:true or a result, and no error",
    (() => {
      const okLine = (o: any) => R.summariseNotify(o).items[0].includes("ناجح");
      return (
        okLine({ ok: true }) &&
        okLine({ result: {} }) &&
        !okLine({ ok: false }) &&
        !okLine({}) &&
        !okLine({ ok: true, error: "x" }) &&
        !okLine(null)
      );
    })(),
  );
  must(
    "canary summary lines carry label, status and detail; unknown names pass through",
    (() => {
      const s = R.summariseCanary({
        observed: "down",
        checks: [
          { name: "app", status: "down", detail: "db" },
          { name: "zzz", status: "weird", detail: "" },
        ],
      });
      return (
        s.summary === "حالة الفحص الفوري: متوقفة." &&
        s.items[0] === "الصحة العامة: متوقفة (db)" &&
        s.items[1] === "zzz: weird"
      );
    })(),
  );
  must(
    "validateParams: unknown or inherited names are not workflows",
    R.validateParams("nope", {}).ok === false &&
      R.validateParams("__proto__", {}).ok === false &&
      R.validateParams("constructor", {}).ok === false,
  );
  must(
    "advisory summary names its scope and handles the empty list",
    safely(() => {
      const adv = JSON.stringify(FIXTURES.advisories);
      const digest = R.summariseAdvisories(
        "engineering_digest",
        { days: 7, severity: "critical" },
        { statusCode: 200, data: adv },
      );
      const scan = R.summariseAdvisories(
        "dependency_advisory_scan",
        { days: 30 },
        { statusCode: 200, data: adv },
      );
      const none = R.summariseAdvisories(
        "engineering_digest",
        { days: 7, severity: "high" },
        { statusCode: 200, data: "[]" },
      );
      return (
        digest.summary.includes("بدرجة critical") &&
        digest.summary.includes("آخر 7 يومًا") &&
        scan.summary.includes("على الحزم الرئيسية (6 حزم بالاسم)") &&
        scan.summary.includes("آخر 30 يومًا") &&
        none.summary.startsWith("لا تنبيهات منشورة بدرجة high") &&
        none.items.length === 0
      );
    }),
  );
  must(
    "advisory response must be exactly 200 with a list",
    [
      undefined,
      null,
      { statusCode: "200", data: "[]" },
      { statusCode: 204, data: "[]" },
      { statusCode: 301, data: "[]" },
      { statusCode: 200, data: "{}" },
      { statusCode: 200 },
    ].every(
      (r: any) =>
        R.summariseAdvisories("engineering_digest", { days: 1, severity: "high" }, r) === null,
    ),
  );
  must(
    "advisory package names: first three, valid entries only",
    (() => {
      const line = (vulnerabilities: any) => {
        const r = R.summariseAdvisories(
          "engineering_digest",
          { days: 1, severity: "high" },
          {
            statusCode: 200,
            data: JSON.stringify([
              { ghsa_id: "G", severity: "high", summary: "s", vulnerabilities },
            ]),
          },
        );
        return r ? r.items[0] : null;
      };
      return (
        line([
          { package: { name: "a" } },
          { package: { name: "b" } },
          { package: { name: "c" } },
          { package: { name: "d" } },
        ]) === "G | high | a+b+c | s" &&
        line([null, {}, { package: {} }, { package: { name: "x" } }]) === "G | high | x | s" &&
        line("not a list") === "G | high | s" &&
        line([]) === "G | high | s"
      );
    })(),
  );
  must(
    "canary summary",
    R.summariseCanary({
      observed: "ok",
      checks: [{ name: "app", status: "ok", detail: "" }],
    }).summary.includes("سليمة"),
  );
  must("canary summary tolerates garbage", R.summariseCanary(undefined).summary.includes("متوقفة"));
  // التنظيف
  const sd: any = {
    researchCache: { old: { expiresAt: 1 }, live: { expiresAt: T + 1000 }, junk: 5 },
    nonces: { a: 1 },
    idem: { b: 1 },
    budget: { hits: [1] },
    canary: { status: "ok" },
  };
  const p = R.purgeResearchCache(sd, "expired", T);
  must(
    "purge expired removes old and junk only",
    p.removed === 2 && Object.keys(sd.researchCache).join() === "live",
  );
  must(
    "purge leaves other keys untouched",
    sd.nonces.a === 1 &&
      sd.idem.b === 1 &&
      sd.budget.hits.length === 1 &&
      sd.canary.status === "ok",
  );
  must(
    "purge expired drops malformed and expired entries, keeps the live one",
    (() => {
      const probe: any = {
        researchCache: {
          text: { expiresAt: "soon" },
          empty: {},
          edge: { expiresAt: T },
          past: { expiresAt: T - 1 },
          live: { expiresAt: T + 1 },
        },
      };
      const out = R.purgeResearchCache(probe, "expired", T);
      return (
        Object.keys(probe.researchCache).join() === "live" &&
        out.removed === 4 &&
        out.remaining === 1
      );
    })(),
  );
  R.purgeResearchCache(sd, "all", T);
  must(
    "purge all empties cache only",
    Object.keys(sd.researchCache).length === 0 && sd.nonces.a === 1,
  );
  must(
    "purge tolerates garbage",
    (() => {
      try {
        R.purgeResearchCache(undefined, "all", T);
        R.purgeResearchCache({ researchCache: 5 }, "all", T);
        return true;
      } catch (e) {
        return false;
      }
    })(),
  );
  must(
    "dispatch never throws",
    (() => {
      try {
        R.dispatch(undefined);
        R.dispatch({});
        return true;
      } catch (e) {
        return false;
      }
    })(),
  );
  return failed;
};

expectRedOnPlanted("runner-dispatch", runnerSuite, [
  {
    name: "معرّف سادس في الكتالوج",
    mutation: {
      from: '"owner_notify_test",\n];',
      to: '"owner_notify_test",\n  "deploy_prod",\n];',
    },
    red: "catalog is exactly the five ids",
  },
  {
    name: "قبول مفتاح معلمة زائد",
    mutation: {
      from: "if (!Object.prototype.hasOwnProperty.call(spec, key)) return { ok: false };",
      to: "",
    },
    red: "extra key refused",
  },
  {
    name: "مدة المفتاح 24 س ← ثانية",
    mutation: {
      from: "const IDEMPOTENCY_TTL_MS = 24 * 3600 * 1000;",
      to: "const IDEMPOTENCY_TTL_MS = 1000;",
    },
    red: "fresh at 23h59",
  },
  {
    name: "سقف المخزن 500 ← 5000",
    mutation: { from: "const IDEMPOTENCY_CAP = 500;", to: "const IDEMPOTENCY_CAP = 5000;" },
    red: "idempotency store capped at 500",
  },
  {
    name: "التنظيف يمسّ النونس",
    mutation: {
      from: "sd.researchCache = kept;",
      to: "sd.researchCache = kept;\n  sd.nonces = {};",
    },
    red: "purge leaves other keys untouched",
  },
  {
    name: "حدّ الأيام",
    mutation: {
      from: 'days: { type: "int", min: 1, max: 30, fallback: 7 },',
      to: 'days: { type: "int", min: 1, max: 3000, fallback: 7 },',
    },
    red: "days 31 refused",
  },
  {
    name: "اسم نموذجي (proto) يمرّ",
    mutation: {
      from: 'if (typeof body.workflow !== "string" || CATALOG.indexOf(body.workflow) === -1) {',
      to: 'if (typeof body.workflow !== "string") {',
    },
    red: "unknown id refused: deploy_prod",
  },
  {
    name: "مفتاح التكرار لمعرّف آخر",
    mutation: { from: "if (seen.workflow !== body.workflow)", to: "if (false)" },
    red: "repeat for other workflow refused",
  },
  {
    name: "الشيفرة تعود إلى قراءة body بدل data",
    mutation: {
      from: 'list = typeof response.data === "string" ? JSON.parse(response.data) : response.data;',
      to: 'list = typeof response.body === "string" ? JSON.parse(response.body) : response.body;',
    },
    red: "n8n shape: a body-only advisories item is null (text lives in data)",
  },
  {
    name: "قائمة الأحرف الخفية المنتقاة بدل فئة Cf",
    mutation: {
      from: "const INVISIBLE_RE = /[\\p{Cf}\\u{FE00}-\\u{FE0F}\\u{E0100}-\\u{E01EF}]/gu;",
      to: "const INVISIBLE_RE = /[\\u200b-\\u200f]/g;",
    },
    red: "no format character or variation selector survives a runner line",
  },
  {
    name: "عودة الكلفة التربيعية (بلا سقف والنمط القديم)",
    mutation: [
      { from: "const RAW_LINE_CAP = 4000;", to: "const RAW_LINE_CAP = 100000000;" },
      { from: "const TAG_RE = /<[^<>]*>/g;", to: "const TAG_RE = /<[^>]*>/g;" },
    ],
    red: "hostile angle-bracket summaries stay cheap in a runner line",
  },
]);
