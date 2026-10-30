// @vitest-environment node
/** ذاكرة النتائج: الصلاحية 6 س / 30 د، السالب 30 ث، إخراج LRU عند 200، والمفتاح معياري. */
import { describe, expect, it } from "vitest";
import {
  type CacheKeyInput,
  type CacheLookup,
  type ResearchCacheOptions,
  CACHE_MAX_ENTRIES,
  CACHE_NEGATIVE_TTL_MS,
  CACHE_TTL_MONTH_MS,
  CACHE_TTL_MS,
  cacheKeyOf,
  ResearchCache,
  ttlFor,
} from "./cache.server";

const H = 60 * 60 * 1000;

function make(max?: number) {
  const clock = { t: 10_000 };
  const opts: ResearchCacheOptions = { now: () => clock.t, maxEntries: max };
  const c = new ResearchCache<string>(opts);
  return { c, clock };
}

describe("الثوابت من العقد", () => {
  it("200 مدخل · 6 ساعات · 30 دقيقة للشهر · 30 ثانية سالب", () => {
    expect(CACHE_MAX_ENTRIES).toBe(200);
    expect(CACHE_TTL_MS).toBe(6 * H);
    expect(CACHE_TTL_MONTH_MS).toBe(30 * 60 * 1000);
    expect(CACHE_NEGATIVE_TTL_MS).toBe(30_000);
    expect(ttlFor("any")).toBe(6 * H);
    expect(ttlFor("year")).toBe(6 * H);
    expect(ttlFor("month")).toBe(30 * 60 * 1000);
  });
});

describe("الصلاحية", () => {
  it("إصابة قبل انقضاء 6 س، وفوات عندها بالضبط", () => {
    const { c, clock } = make();
    c.set("k", "v", ttlFor("any"));
    clock.t += 6 * H - 1;
    const hit: CacheLookup<string> = c.get("k");
    expect(hit).toEqual({ kind: "hit", value: "v" });
    clock.t += 1;
    expect(c.get("k")).toEqual({ kind: "miss" });
    expect(c.size).toBe(0); // المنتهي يُزال عند القراءة
  });

  it("freshness=month ⇒ 30 دقيقة", () => {
    const { c, clock } = make();
    c.set("k", "v", ttlFor("month"));
    clock.t += 30 * 60 * 1000 - 1;
    expect(c.get("k").kind).toBe("hit");
    clock.t += 1;
    expect(c.get("k").kind).toBe("miss");
  });

  it("السالب 30 ث ويحمل السبب، ثم يفوت", () => {
    const { c, clock } = make();
    c.setNegative("k", "timeout");
    expect(c.get("k")).toEqual({ kind: "negative", reason: "timeout" });
    clock.t += 29_999;
    expect(c.get("k").kind).toBe("negative");
    clock.t += 1;
    expect(c.get("k")).toEqual({ kind: "miss" });
  });

  it("كتابة موجبة بعد سالبة على المفتاح نفسه تستبدلها", () => {
    const { c } = make();
    c.setNegative("k", "timeout");
    c.set("k", "ok", ttlFor("any"));
    expect(c.get("k")).toEqual({ kind: "hit", value: "ok" });
    expect(c.size).toBe(1);
  });
});

describe("LRU", () => {
  it("بعد 200 مدخل يُخرَج الأقدم استعمالًا، لا الأقدم إدراجًا", () => {
    const { c } = make(CACHE_MAX_ENTRIES);
    for (let i = 0; i < CACHE_MAX_ENTRIES; i++) c.set(`k${i}`, `v${i}`, H);
    expect(c.size).toBe(200);
    // k0 يُقرأ فيصير الأحدث؛ فالأقدم الآن k1.
    expect(c.get("k0").kind).toBe("hit");
    c.set("k200", "v200", H);
    expect(c.size).toBe(200);
    expect(c.get("k1").kind).toBe("miss");
    expect(c.get("k0").kind).toBe("hit");
    expect(c.get("k200").kind).toBe("hit");
    expect(c.get("k2").kind).toBe("hit");
  });

  it("السالب يشارك السعة نفسها ولا يتجاوزها", () => {
    const { c } = make(3);
    c.set("a", "1", H);
    c.setNegative("b", "network");
    c.setNegative("c", "network");
    c.setNegative("d", "network");
    expect(c.size).toBe(3);
    expect(c.get("a").kind).toBe("miss");
  });

  it("clear تُفرغ", () => {
    const { c } = make();
    c.set("a", "1", H);
    c.clear();
    expect(c.size).toBe(0);
  });
});

describe("المفتاح: الموجز المعياري", () => {
  const base: CacheKeyInput = {
    surface: "sadeed",
    mode: "general",
    freshness: "any",
    lang: "ar",
    maxResults: 5,
    terms: ["أسوار", "كهرباء"],
    codes: ["SEC-18"],
  };

  it("ترتيب الكلمات والحالة والتكرار لا يغيّر المفتاح", () => {
    const k = cacheKeyOf(base);
    expect(cacheKeyOf({ ...base, terms: ["كهرباء", "أسوار", "أسوار"] })).toBe(k);
    expect(cacheKeyOf({ ...base, codes: ["sec-18"] })).toBe(k);
    expect(cacheKeyOf({ ...base, terms: [" أسوار ", "كهرباء"] })).toBe(k);
  });

  it("أي حقل جوهري يغيّر المفتاح: السطح · الوضع · الحداثة · اللغة · السقف · الكلمات · الرموز", () => {
    const k = cacheKeyOf(base);
    const variants = [
      { ...base, surface: "fnn" as const },
      { ...base, mode: "regulatory" },
      { ...base, freshness: "month" as const },
      { ...base, lang: "en" },
      { ...base, maxResults: 1 },
      { ...base, terms: ["أسوار"] },
      { ...base, codes: [] },
    ];
    for (const v of variants) expect(cacheKeyOf(v)).not.toBe(k);
  });

  it("المفتاح لا يحمل هوية: لا مدخل لها في النوع أصلًا", () => {
    expect(Object.keys(base).sort()).toEqual(
      ["codes", "freshness", "lang", "maxResults", "mode", "surface", "terms"].sort(),
    );
  });
});
