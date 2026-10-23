// @vitest-environment node
/**
 * بوّابة مالك فِن — الدوال النقيّة والقرار الخادمي.
 *
 * المادة ٣٠: كل رفضٍ هنا يُقابله إثباتٌ أن **صياغةً متساهلة** (التي تُدخل) كانت
 * ستُحمرّ عليه — في آخر الملف «طفرات» مكتوبة صريحةً تُشغَّل على الاختبارات نفسها.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sim = vi.hoisted(() => ({
  verifyCalls: 0,
  verifyResult: null as null | { userId: string } | "denied" | "throws",
  /** يُستدعى داخل التحقّق المحاكى — تتقدّم به الساعة المحقونة (زمن شبكة المصادقة). */
  onVerify: null as null | (() => void),
}));

vi.mock("@/lib/hook-auth.server", () => ({
  verifySupabaseUser: async () => {
    sim.verifyCalls++;
    sim.onVerify?.();
    if (sim.verifyResult === "throws") throw new Error("auth down");
    if (sim.verifyResult === "denied" || sim.verifyResult === null) {
      return new Response("{}", { status: 401 });
    }
    return sim.verifyResult;
  },
}));

import {
  bearerToken,
  isFinnOwner,
  parseFinnOwnerIds,
  peekJwtSubject,
  type FinnOwnerList,
} from "./owner-gate";
import {
  FINN_DENY_FLOOR_MS,
  finnNotFoundResponse,
  isFinnOwnerUser,
  resetFinnOwnerWarningsForTests,
  resolveFinnOwner,
  setFinnDenyClockForTests,
  type FinnDenyClock,
} from "./owner-gate.server";

const OWNER = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const OTHER = "9d8c7b6a-5e4f-4a3b-9c2d-1e0f9a8b7c6d";

function jwtFor(sub: unknown): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub })}.sig`;
}

function req(token?: string): Request {
  return new Request("http://local/api/finn/chat", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

const list = (raw: string | undefined | null) => parseFinnOwnerIds(raw);

// ساعةٌ افتراضية: النوم يقدّم الزمن فقط — لا انتظار حقيقي في أي اختبار هنا.
let virtualNow = 0;
const slept: number[] = [];
const virtualClock: FinnDenyClock = {
  now: () => virtualNow,
  sleep: async (ms) => {
    slept.push(ms);
    virtualNow += ms;
  },
};
beforeEach(() => {
  virtualNow = 0;
  slept.length = 0;
  sim.onVerify = null;
  setFinnDenyClockForTests(virtualClock);
});
afterEach(() => setFinnDenyClockForTests(null));

describe("① parseFinnOwnerIds — تفشل مغلقة", () => {
  it("غير معرَّف ⇒ unset ولا أحد", () => {
    const l = list(undefined);
    expect(l.status).toBe("unset");
    expect(l.ids.size).toBe(0);
    expect(list(null).status).toBe("unset");
  });

  it.each(["", "   ", "\n\t", ",", " , ,, "])("فارغ «%j» ⇒ empty ولا أحد", (raw) => {
    const l = list(raw);
    expect(l.status).toBe("empty");
    expect(l.ids.size).toBe(0);
  });

  it.each([
    "not-a-uuid",
    "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6", // قصير حرفًا
    "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6bb", // طويل حرفًا
    "3f2b8c1e9a4d4e6f8b7a1c2d3e4f5a6b", // بلا شرطات
    "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6g", // حرف غير سداسي عشري
    "00000000-0000-0000-0000-000000000000", // الصفري
    "3f2b8c1e-9a4d-0e6f-8b7a-1c2d3e4f5a6b", // نسخة 0
    "3f2b8c1e-9a4d-4e6f-0b7a-1c2d3e4f5a6b", // متغيّر خاطئ
    `"${OWNER}"`, // مقتبس
    `${OWNER} ${OTHER}`, // مفصول بمسافة لا فاصلة
    `${OWNER};${OTHER}`, // فاصلة منقوطة
  ])("UUID فاسد «%s» ⇒ invalid ولا أحد", (raw) => {
    const l = list(raw);
    expect(l.status).toBe("invalid");
    expect(l.ids.size).toBe(0);
  });

  it("عنصرٌ فاسد واحد يُغلق القائمة كلّها ولو كان الباقي صالحًا", () => {
    const l = list(`${OWNER}, garbage`);
    expect(l.status).toBe("invalid");
    expect(isFinnOwner(OWNER, l)).toBe(false);
  });

  it("فواصل ومسافات وأسطر حول العناصر تُقصّ، والفاصلة الختامية تُتجاهل", () => {
    const l = list(`  ${OWNER} ,\n ${OTHER},  `);
    expect(l.status).toBe("ok");
    expect([...l.ids].sort()).toEqual([OTHER, OWNER].sort());
  });

  it("الأحرف الكبيرة في البيئة لا تهمّ", () => {
    const l = list(OWNER.toUpperCase());
    expect(l.status).toBe("ok");
    expect(isFinnOwner(OWNER, l)).toBe(true);
    expect(isFinnOwner(OWNER.toUpperCase(), l)).toBe(true);
  });

  it("المكرّر يُدمج", () => {
    expect(list(`${OWNER},${OWNER.toUpperCase()}`).ids.size).toBe(1);
  });
});

describe("② isFinnOwner — مقارنة تامّة", () => {
  const ok = list(OWNER);

  it("المالك يدخل، وغيره لا", () => {
    expect(isFinnOwner(OWNER, ok)).toBe(true);
    expect(isFinnOwner(OTHER, ok)).toBe(false);
  });

  it.each([
    ["حرفٌ واحد مختلف", OWNER.slice(0, -1) + "c"],
    ["بادئة", OWNER.slice(0, 20)],
    ["لاحقة", OWNER.slice(4)],
    ["أطول بحرف", OWNER + "0"],
    ["مسافة قبله", ` ${OWNER}`],
    ["مسافة بعده", `${OWNER} `],
    ["سطر جديد", `${OWNER}\n`],
    ["فارغ", ""],
  ])("معرّفٌ قريب لا يطابق: %s", (_name, candidate) => {
    expect(isFinnOwner(candidate, ok)).toBe(false);
  });

  it.each([null, undefined, 0, 1, {}, [], [OWNER], true])("غير النصّ ليس مالكًا: %j", (v) => {
    expect(isFinnOwner(v, ok)).toBe(false);
  });

  it("قائمة غير سليمة لا تُدخل أحدًا حتى المعرّف المذكور فيها", () => {
    for (const bad of [list(undefined), list(""), list(`${OWNER},x`)]) {
      expect(isFinnOwner(OWNER, bad)).toBe(false);
    }
  });
});

describe("③ أدوات الرمز", () => {
  it("bearerToken", () => {
    expect(bearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(bearerToken("bearer   abc")).toBe("abc");
    expect(bearerToken("Basic abc")).toBeNull();
    expect(bearerToken("Bearer a b")).toBeNull();
    expect(bearerToken("")).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });

  it("peekJwtSubject يقرأ sub ولا يثق به، ويعيد null للمعطوب", () => {
    expect(peekJwtSubject(jwtFor(OWNER))).toBe(OWNER);
    expect(peekJwtSubject("a.b")).toBeNull();
    expect(peekJwtSubject("a.!!!.c")).toBeNull();
    expect(peekJwtSubject(jwtFor(42))).toBeNull();
    expect(peekJwtSubject(jwtFor(""))).toBeNull();
    expect(peekJwtSubject(`x.${Buffer.from("[]").toString("base64url")}.y`)).toBeNull();
  });
});

describe("④ resolveFinnOwner — القرار الخادمي", () => {
  beforeEach(() => {
    sim.verifyCalls = 0;
    sim.verifyResult = { userId: OWNER };
    resetFinnOwnerWarningsForTests();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  const env = (ids?: string) => ({ FINN_OWNER_USER_IDS: ids });

  it("المالك بجلسة صالحة ⇒ ok مع المعرّف المتحقَّق", async () => {
    const d = await resolveFinnOwner(req(jwtFor(OWNER)), env(OWNER));
    expect(d).toEqual({ ok: true, userId: OWNER });
    expect(sim.verifyCalls).toBe(1);
  });

  it.each([
    ["قائمة غير معرَّفة", env(undefined), jwtFor(OWNER)],
    ["قائمة فارغة", env(""), jwtFor(OWNER)],
    ["قائمة فاسدة", env(`${OWNER},bad`), jwtFor(OWNER)],
  ])("%s ⇒ لا أحد يدخل، وبلا نداء مصادقة", async (_n, e, token) => {
    expect(await resolveFinnOwner(req(token), e)).toEqual({ ok: false });
    expect(sim.verifyCalls).toBe(0);
  });

  it("زائر بلا رمز ⇒ رفضٌ بلا نداء مصادقة", async () => {
    expect(await resolveFinnOwner(req(), env(OWNER))).toEqual({ ok: false });
    expect(sim.verifyCalls).toBe(0);
  });

  it("مسجَّل غير مالك ⇒ رفضٌ **بلا نداء مصادقة** (لا تُنفق مصادقة على من لا يملك)", async () => {
    expect(await resolveFinnOwner(req(jwtFor(OTHER)), env(OWNER))).toEqual({ ok: false });
    expect(sim.verifyCalls).toBe(0);
  });

  it("رمزٌ معطوب أو بلا sub ⇒ رفضٌ بلا نداء", async () => {
    for (const t of ["garbage", jwtFor(undefined), jwtFor(7)]) {
      expect(await resolveFinnOwner(req(t), env(OWNER))).toEqual({ ok: false });
    }
    expect(sim.verifyCalls).toBe(0);
  });

  it("رمزٌ يدّعي المالك ولا تتحقّق منه المصادقة (مزوَّر/منتهٍ) ⇒ رفض", async () => {
    sim.verifyResult = "denied";
    expect(await resolveFinnOwner(req(jwtFor(OWNER)), env(OWNER))).toEqual({ ok: false });
    expect(sim.verifyCalls).toBe(1);
  });

  it("المدّعى مالكٌ لكن المتحقَّق منه غيره ⇒ رفض (الحكم على المعرّف المتحقَّق لا المدّعى)", async () => {
    sim.verifyResult = { userId: OTHER };
    expect(await resolveFinnOwner(req(jwtFor(OWNER)), env(OWNER))).toEqual({ ok: false });
  });

  it("عطل المصادقة (يرمي) ⇒ رفضٌ مغلق لا 500", async () => {
    sim.verifyResult = "throws";
    expect(await resolveFinnOwner(req(jwtFor(OWNER)), env(OWNER))).toEqual({ ok: false });
  });

  it("مالكان في القائمة: كلٌّ يدخل", async () => {
    sim.verifyResult = { userId: OTHER };
    const d = await resolveFinnOwner(req(jwtFor(OTHER)), env(`${OWNER}, ${OTHER}`));
    expect(d).toEqual({ ok: true, userId: OTHER });
  });

  it("التحذير بإغلاق البوّابة مرّةً لكل سبب، وبلا قيم", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warn.mockClear();
    await resolveFinnOwner(req(jwtFor(OWNER)), env(undefined));
    await resolveFinnOwner(req(jwtFor(OWNER)), env(undefined));
    await resolveFinnOwner(req(jwtFor(OWNER)), env(`${OWNER},bad`));
    expect(warn).toHaveBeenCalledTimes(2);
    const dumped = JSON.stringify(warn.mock.calls);
    expect(dumped).toContain("unset");
    expect(dumped).toContain("invalid");
    expect(dumped).not.toContain(OWNER);
  });

  it("isFinnOwnerUser (دالة الواجهة) تعيد منطقيًّا فقط", () => {
    expect(isFinnOwnerUser(OWNER, env(OWNER))).toBe(true);
    expect(isFinnOwnerUser(OTHER, env(OWNER))).toBe(false);
    expect(isFinnOwnerUser(null, env(OWNER))).toBe(false);
    expect(isFinnOwnerUser(undefined, env(OWNER))).toBe(false);
    expect(isFinnOwnerUser(OWNER, env(undefined))).toBe(false);
  });

  it("الـ404 واحد: الجسم والترويسات لا تتغيّر بتغيّر السبب", async () => {
    const a = finnNotFoundResponse();
    const b = finnNotFoundResponse();
    expect(a.status).toBe(404);
    expect(await a.text()).toBe(await b.text());
    expect([...a.headers]).toEqual([...b.headers]);
    expect(a.headers.get("cache-control")).toBe("no-store");
  });
});

/**
 * ⑤ إثبات الأداة (المادة ٣٠). صياغاتٌ **متساهلة** مكتوبة صريحةً — كلٌّ منها كانت
 * ستُدخل من لا يجب — وتُشغَّل عليها العبارات نفسها: يجب أن يحمرّ كلٌّ منها.
 */
describe("⑥ زمن الرفض ثابت (W5 #1) — لا مِجَسّ توقيتيّ لعضوية القائمة", () => {
  const OWNER_TOKEN = () => jwtFor(OWNER);
  const e = (ids?: string) => ({ FINN_OWNER_USER_IDS: ids });
  const AUTH_RTT_MS = 120;

  beforeEach(() => {
    resetFinnOwnerWarningsForTests();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    sim.verifyCalls = 0;
    sim.verifyResult = "denied";
    sim.onVerify = () => {
      virtualNow += AUTH_RTT_MS;
    };
  });

  it("الأرضية قيمةٌ ثابتة معقولة (>0 وأدنى من ثانية)", () => {
    expect(FINN_DENY_FLOOR_MS).toBeGreaterThan(0);
    expect(FINN_DENY_FLOOR_MS).toBeLessThan(1_000);
  });

  it("كل مسارات الرفض تستغرق الزمن نفسه — قبل التحقّق وبعده", async () => {
    const paths: Array<[string, () => Promise<unknown>]> = [
      ["بلا رمز", () => resolveFinnOwner(req(), e(OWNER))],
      ["قائمة غير معرَّفة", () => resolveFinnOwner(req(OWNER_TOKEN()), e(undefined))],
      ["sub ليس في القائمة (يُرفض بلا شبكة)", () => resolveFinnOwner(req(jwtFor(OTHER)), e(OWNER))],
      ["رمزٌ معطوب", () => resolveFinnOwner(req("garbage"), e(OWNER))],
      [
        "sub مالك بتوقيعٍ مزوَّر (يمرّ بنداء المصادقة ثم يُرفض)",
        () => resolveFinnOwner(req(OWNER_TOKEN()), e(OWNER)),
      ],
    ];
    for (const [name, run] of paths) {
      virtualNow = 0;
      slept.length = 0;
      expect(await run(), name).toEqual({ ok: false });
      expect(virtualNow, `${name}: زمن الرفض الكلّي`).toBe(FINN_DENY_FLOOR_MS);
    }
  });

  it("الرفض قبل التحقّق ينام الأرضية كاملةً، وبعده يُتمّ الفرق وحده", async () => {
    await resolveFinnOwner(req(jwtFor(OTHER)), e(OWNER));
    expect(slept).toEqual([FINN_DENY_FLOOR_MS]);
    slept.length = 0;
    virtualNow = 0;
    await resolveFinnOwner(req(OWNER_TOKEN()), e(OWNER));
    expect(slept).toEqual([FINN_DENY_FLOOR_MS - AUTH_RTT_MS]);
  });

  it("عطل المصادقة (يرمي) يُرفض بالزمن نفسه", async () => {
    sim.verifyResult = "throws";
    await resolveFinnOwner(req(OWNER_TOKEN()), e(OWNER));
    expect(virtualNow).toBe(FINN_DENY_FLOOR_MS);
  });

  it("المالك الحقيقي لا يُؤخَّر — لا نوم على مسار القبول", async () => {
    sim.verifyResult = { userId: OWNER };
    expect(await resolveFinnOwner(req(OWNER_TOKEN()), e(OWNER))).toEqual({
      ok: true,
      userId: OWNER,
    });
    expect(slept).toEqual([]);
  });

  it("تحقّقٌ أبطأ من الأرضية لا يُنام بعده (الأرضية تُتمّ ولا تُضيف)", async () => {
    sim.onVerify = () => {
      virtualNow += FINN_DENY_FLOOR_MS + 100;
    };
    await resolveFinnOwner(req(OWNER_TOKEN()), e(OWNER));
    expect(slept).toEqual([]);
  });

  it("الفلترة المسبقة باقية: sub غير مالك لا يستدعي المصادقة أبدًا", async () => {
    await resolveFinnOwner(req(jwtFor(OTHER)), e(OWNER));
    expect(sim.verifyCalls).toBe(0);
  });
});

describe("⑤ الطفرات: كل صياغة متساهلة تُدان بالاختبارات نفسها", () => {
  const strictSetOf = (raw: string) => new Set(raw.split(",").map((s) => s.trim().toLowerCase()));

  // طفرة ١: تُسقط الفاسد وتُبقي الصالح (بدل إغلاق القائمة).
  const lenientParse = (raw: string): FinnOwnerList => {
    const ids = new Set(
      raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s),
        ),
    );
    return { status: ids.size ? "ok" : "invalid", ids };
  };
  // طفرة ٢: مقارنة بالاحتواء/البادئة.
  const prefixOwner = (id: string, l: FinnOwnerList) =>
    l.status === "ok" && [...l.ids].some((x) => x.startsWith(id.toLowerCase()) || id.includes(x));
  // طفرة ٣: تقصّ المعرّف المقارَن.
  const trimmingOwner = (id: string, l: FinnOwnerList) =>
    l.status === "ok" && l.ids.has(id.trim().toLowerCase());
  // طفرة ٤: لا تتحقّق من حالة القائمة.
  const ignoreStatus = (id: string, l: FinnOwnerList) => l.ids.has(id.toLowerCase());

  it("الطفرة ١ (تنقية صامتة) تُدخل المالك من قائمة فيها فاسد — والاختبار يرفضه", () => {
    const mixed = `${OWNER}, garbage`;
    expect(isFinnOwner(OWNER, lenientParse(mixed))).toBe(true); // الطفرة تُدخل
    expect(isFinnOwner(OWNER, parseFinnOwnerIds(mixed))).toBe(false); // الحقيقي لا
  });

  it("الطفرة ٢ (بادئة/احتواء) تُدخل معرّفًا قريبًا — والحقيقي لا", () => {
    const l = parseFinnOwnerIds(OWNER);
    expect(prefixOwner(OWNER.slice(0, 20), l)).toBe(true);
    expect(isFinnOwner(OWNER.slice(0, 20), l)).toBe(false);
  });

  it("الطفرة ٣ (قصّ المقارَن) تُدخل «uuid ␠» — والحقيقي لا", () => {
    const l = parseFinnOwnerIds(OWNER);
    expect(trimmingOwner(` ${OWNER} `, l)).toBe(true);
    expect(isFinnOwner(` ${OWNER} `, l)).toBe(false);
  });

  it("الطفرة ٤ (تجاهل حالة القائمة) لا تُغلق على القائمة الفارغة/الفاسدة", () => {
    const fake: FinnOwnerList = { status: "invalid", ids: strictSetOf(OWNER) };
    expect(ignoreStatus(OWNER, fake)).toBe(true);
    expect(isFinnOwner(OWNER, fake)).toBe(false);
  });
});
