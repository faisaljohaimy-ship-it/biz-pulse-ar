/**
 * عقد المجمِّع — التزامن والمواعيد والهجر والدمج (المادة ٣٠: حالة حمراء
 * مزروعة لكل قاعدة).
 */
import { describe, expect, it } from "vitest";
import {
  AGGREGATE_LIMIT,
  ARM_NAMES,
  LEXICAL_ARM_DEADLINE_MS,
  runArmWithDeadline,
  runArms,
  VECTOR_ARM_DEADLINE_MS,
} from "./aggregate.server";
import type { ArmResult, Hit, RetrievalArm, RetrievalContext } from "./types";

const CTX: RetrievalContext = { orgId: null, audience: "anonymous" };

const hit = (id: string, source: Hit["source"] = "seed"): Hit => ({
  id,
  source,
  title: `عنوان ${id}`,
  excerpt: `مقتطف ${id}`,
  score: 1,
  rank: 1,
  provenance: { citable: source !== "upload-unverified", label: "مطابقة نصّية" },
});

/** ذراع تخدم بعد `delayMs`؛ تسجّل هل أُطلقت إشارة الإلغاء عليها. */
function armAfter(
  name: string,
  delayMs: number,
  hits: Hit[],
  seen: { aborted: boolean } = { aborted: false },
): RetrievalArm {
  return {
    name,
    run: (_q, _c, _d, signal) =>
      new Promise<ArmResult>((resolve) => {
        signal?.addEventListener("abort", () => {
          seen.aborted = true;
        });
        setTimeout(
          () => resolve({ arm: name, served: true, hits, reason: null, latencyMs: delayMs }),
          delayMs,
        );
      }),
  };
}

const throwing: RetrievalArm = {
  name: "throwing",
  run: async () => {
    throw new Error("boom — نصّ قد يحمل الاستعلام");
  },
};

describe("① الموعد لكل ذراع — ذراع 10 ث لا تؤخّر ذراع 50 مللي ثانية فوق موعدها", () => {
  it("تعود في حدود موعد البطيئة لا في 10 ث، والسريعة مخدومة والبطيئة timeout مهجورة", async () => {
    const seen = { aborted: false };
    const t0 = Date.now();
    const out = await runArms(
      [
        { arm: armAfter("slow", 10_000, [hit("s")], seen), deadlineMs: 200 },
        { arm: armAfter("fast", 50, [hit("f")]), deadlineMs: LEXICAL_ARM_DEADLINE_MS },
      ],
      "سؤال",
      CTX,
    );
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(1_500);
    expect(out.servedArms).toEqual(["fast"]);
    expect(out.arms.find((a) => a.arm === "slow")).toMatchObject({
      served: false,
      reason: "timeout",
    });
    expect(out.fused.map((h) => h.id)).toEqual(["f"]);
    // الإشارة أُطلقت: الذراع تُهجر على الشبكة لا تُنتظر.
    expect(seen.aborted).toBe(true);
  });

  /**
   * التزامن نفسه (لا الموعد): ذراعان كلٌّ 300 مللي ثانية بموعدٍ واسع — المتزامن
   * ينهيهما في ≈300 والمتسلسل في ≥600. الحدّ 450 يفرّق بينهما بهامش 150 من
   * الجهتين؛ زرعُ `for … await` بدل `Promise.all` في `runArms` يُحمرّه (قِيس
   * ٢٠٢٦/١٠/٢٩ — الصيغة السابقة 400+10 كانت تمرّ متسلسلةً أيضًا).
   */
  it("ذراعان 300 مللي ثانية بموعدٍ واسع تنتهيان معًا في < 450 لا متسلسلتين في ≥ 600", async () => {
    const t0 = Date.now();
    const out = await runArms(
      [
        { arm: armAfter("a", 300, [hit("a")]), deadlineMs: LEXICAL_ARM_DEADLINE_MS },
        { arm: armAfter("b", 300, [hit("b")]), deadlineMs: LEXICAL_ARM_DEADLINE_MS },
      ],
      "س",
      CTX,
    );
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(290);
    expect(elapsed).toBeLessThan(450);
    expect(out.servedArms.sort()).toEqual(["a", "b"]);
  });

  it("مزروع: التسلسل القديم (await البطيئة ثم السريعة) يجمع الزمنين — وهو ما كان يقع مع embedText", async () => {
    const sequential = async () => {
      const slow = await runArmWithDeadline(
        { arm: armAfter("slow", 300, [hit("s")]), deadlineMs: 10_000 },
        "س",
        CTX,
      );
      const fast = await runArmWithDeadline(
        { arm: armAfter("fast", 300, [hit("f")]), deadlineMs: 10_000 },
        "س",
        CTX,
      );
      return [slow, fast];
    };
    const t0 = Date.now();
    await sequential();
    expect(Date.now() - t0).toBeGreaterThanOrEqual(590);
    // أمّا المجمِّع المتزامن فيُنهي الزوج نفسه في حدود الأطول (300) لا المجموع (600).
    const t1 = Date.now();
    const out = await runArms(
      [
        { arm: armAfter("slow", 300, [hit("s")]), deadlineMs: 10_000 },
        { arm: armAfter("fast", 300, [hit("f")]), deadlineMs: 10_000 },
      ],
      "س",
      CTX,
    );
    expect(Date.now() - t1).toBeLessThan(450);
    expect(out.servedArms.sort()).toEqual(["fast", "slow"]);
  });

  it("موعدٌ غير موجب يُردّ قبل العمل بسبب صريح", async () => {
    const r = await runArmWithDeadline(
      { arm: armAfter("x", 1, [hit("x")]), deadlineMs: 0 },
      "س",
      CTX,
    );
    expect(r).toMatchObject({ served: false, reason: "deadline", hits: [] });
  });
});

describe("② ذراع ترمي لا تُفرغ غيرها", () => {
  it("الرمي يصير threw بلا نصّ الخطأ، والأذرع الأخرى تُدمج كما لو لم تكن", async () => {
    const out = await runArms(
      [
        { arm: throwing, deadlineMs: 500 },
        { arm: armAfter("ok", 5, [hit("a"), hit("b")]), deadlineMs: 500 },
      ],
      "س",
      CTX,
    );
    const t = out.arms.find((a) => a.arm === "throwing")!;
    expect(t).toMatchObject({ served: false, reason: "threw", hits: [] });
    expect(JSON.stringify(t)).not.toContain("boom");
    expect(out.servedArms).toEqual(["ok"]);
    expect(out.fused.map((h) => h.id)).toEqual(["a", "b"]);
  });

  it("مزروع: Promise.all على الأذرع الخام كان يرمي بالكامل — المجمِّع لا يرمي", async () => {
    await expect(
      Promise.all([throwing.run("س", CTX, 500), armAfter("ok", 1, []).run("س", CTX, 500)]),
    ).rejects.toThrow();
    await expect(runArms([{ arm: throwing, deadlineMs: 500 }], "س", CTX)).resolves.toMatchObject({
      servedArms: [],
    });
  });

  it("كل الأذرع فاشلة ⇐ نتيجة فارغة صادقة بأسبابها، لا استثناء", async () => {
    const out = await runArms(
      [
        { arm: throwing, deadlineMs: 100 },
        { arm: armAfter("slow", 5_000, [hit("s")]), deadlineMs: 50 },
      ],
      "س",
      CTX,
    );
    expect(out.fused).toEqual([]);
    expect(out.servedArms).toEqual([]);
    expect(out.arms.map((a) => a.reason)).toEqual(["threw", "timeout"]);
  });
});

describe("③ الدمج يحفظ إسهام كل ذراع والمعرّف المشترك يُدمج نتيجةً واحدة", () => {
  it("المعرّف نفسه من ذراعين ⇐ نتيجة واحدة بإسهامين، وحقولها من الذراع الأولى في الترتيب", async () => {
    const live = { ...hit("SEC-02", "hcis"), excerpt: "نطاق التوجيه الحيّ" };
    const seed = { ...hit("SEC-02", "hcis"), excerpt: "SEC-02 — الأسوار الأمنية" };
    const out = await runArms(
      [
        { arm: armAfter(ARM_NAMES.hcisLive, 1, [live]), deadlineMs: 500 },
        { arm: armAfter(ARM_NAMES.seed, 1, [seed, hit("other", "seed")]), deadlineMs: 500 },
      ],
      "س",
      CTX,
    );
    expect(out.fused[0].id).toBe("SEC-02");
    expect(out.fused[0].excerpt).toBe("نطاق التوجيه الحيّ");
    expect(out.fused[0].contributions.map((c) => c.arm)).toEqual([
      ARM_NAMES.hcisLive,
      ARM_NAMES.seed,
    ]);
    expect(out.fused).toHaveLength(2);
  });

  it("السقف AGGREGATE_LIMIT يُطبَّق بعد الدمج، واستعلامٌ فارغ لا يشغّل ذراعًا", async () => {
    const many = Array.from({ length: 30 }, (_, i) => hit(`d${i}`));
    const out = await runArms([{ arm: armAfter("m", 1, many), deadlineMs: 500 }], "س", CTX);
    expect(out.fused).toHaveLength(AGGREGATE_LIMIT);
    let ran = false;
    const spy: RetrievalArm = {
      name: "spy",
      run: async () => {
        ran = true;
        return { arm: "spy", served: true, hits: [], reason: null, latencyMs: 0 };
      },
    };
    const empty = await runArms([{ arm: spy, deadlineMs: 500 }], "   ", CTX);
    expect(ran).toBe(false);
    expect(empty.arms[0]).toMatchObject({ served: false, reason: "empty_query" });
  });

  it("الثوابت: المعجمية ≤ 1.5 ث، والمتّجهية ≤ 2 ث — أقلّ من سباق مرحلة السياق (2.5 ث)", () => {
    expect(LEXICAL_ARM_DEADLINE_MS).toBe(1_500);
    expect(VECTOR_ARM_DEADLINE_MS).toBe(2_000);
    expect(VECTOR_ARM_DEADLINE_MS).toBeLessThan(2_500);
    // ولا اسم مزوّد في أسماء الأذرع (تصل السجلّ وJSON الاستشهاد).
    for (const n of Object.values(ARM_NAMES)) expect(n).not.toMatch(/gemini|openai|google/i);
  });
});
