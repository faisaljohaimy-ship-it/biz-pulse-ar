/**
 * طبقة الإسناد.
 *
 * المحروس هنا **استحالة الحالة الفاسدة** لا وجود الحقول: ادّعاءٌ مقيس بلا
 * دليل، أو غيابٌ بلا سبب، أو اشتقاقٌ يقطع سلسلة الإسناد. وكلّها تمرّ
 * صامتةً في أي تمثيلٍ أضعف وتُقرأ إسنادًا وهي إنشاء.
 *
 * ويُحرس معها ما هو أثقل: **ألّا تنشقّ هذه الطبقة عن `gate.ts`.** فقد
 * كُتبت أوّل مرّة بنوع `Evidence` ثانٍ في المجلّد نفسه، وذلك ما يمنعه
 * FR-19 نصًّا («do not fork»). فصار الانشقاق يُسقط الاختبار.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { hasEvidence } from "./gate";
import {
  UNMEASURED_TEXT_AR,
  badgeEvidenceOf,
  deriveFrom,
  displayOf,
  isMeasured,
  measured,
  unmeasured,
  valueOr,
  type Evidence,
} from "./evidence";

const dbRow: Evidence = {
  kind: "db.query",
  source: "sec_incidents",
  entity: { kind: "incident", id: "INC-1" },
  observedAt: "2026-09-20T10:00:00.000Z",
};

describe("لا ادّعاء مقيس بلا دليل", () => {
  it("يبني الادّعاء حين يُسنَد", () => {
    const g = measured(7, [dbRow]);
    expect(isMeasured(g)).toBe(true);
    expect(g.value).toBe(7);
    expect(g.evidence).toHaveLength(1);
  });

  it("**ويرمي على قائمة أدلّة فارغة** — ولا يعيد «غير مقيس» بصمت", () => {
    // الصمت هنا يُخفي عطل برمجةٍ في زيّ نقص بيانات.
    expect(() => measured(7, [])).toThrow(/بلا دليل/);
  });

  it("والغياب يحمل سببه إجباريًّا", () => {
    expect(unmeasured("المصدر بلا عمود شدّة").reason).toMatch(/شدّة/);
    expect(() => unmeasured("")).toThrow(/بلا سبب/);
    expect(() => unmeasured("   ")).toThrow(/بلا سبب/);
  });
});

describe("حكمٌ واحد لا حكمان — `measured` لا يقبل ما ترفضه الشارة", () => {
  // لو قبِلت هذه الطبقة دليلًا يرفضه `hasEvidence` لصار الادّعاء «مقيسًا»
  // في الحساب و«بلا دليل» عند الرسم: رقمٌ يظهر وشارتُه تختفي، والقارئ
  // يرى قياسًا بلا مصدرٍ ظاهر.
  const bad: Evidence = { kind: "db.query", source: "sec_incidents", observedAt: "ليس تاريخًا" };

  it("الحارس يرفضه", () => {
    expect(hasEvidence(bad)).toBe(false);
  });

  it("**والطبقة ترفضه رميًا** — بالمصدر مسمًّى في الرسالة", () => {
    expect(() => measured(7, [bad])).toThrow(/sec_incidents/);
  });

  it("ويُرفض ولو صحّ ما معه", () => {
    expect(() => measured(7, [dbRow, bad])).toThrow(/FR-19/);
  });
});

describe("العرض — الغياب لا يصير صفرًا", () => {
  it("المقيس يُنسَّق", () => {
    expect(displayOf(measured(12, [dbRow]), (v) => `${v} بلاغًا`)).toBe("12 بلاغًا");
  });

  it("وغير المقيس يُعرض «لم يُقَس» ولا يمرّ بالمنسّق أصلًا", () => {
    let called = false;
    const out = displayOf(unmeasured("لا مصدر"), () => {
      called = true;
      return "0";
    });
    expect(out).toBe(UNMEASURED_TEXT_AR);
    // لو استُدعي المنسّق على الغياب لأمكن أن يُخرج «0» — فالطريق مقطوع.
    expect(called).toBe(false);
  });

  it("و`valueOr` للحساب الداخليّ لا للعرض", () => {
    expect(valueOr(unmeasured("لا مصدر"), 0)).toBe(0);
    expect(valueOr(measured(5, [dbRow]), 0)).toBe(5);
  });

  it("والجسر إلى الشارة يعطي `null` على الغياب — فلا تُرسم شارةٌ لغير مقيس", () => {
    expect(badgeEvidenceOf(unmeasured("لا مصدر"))).toBeNull();
    expect(badgeEvidenceOf(measured(5, [dbRow]))).toEqual(dbRow);
  });

  it("وما يخرج من الجسر يجتاز حارس الشارة — لا شارةً تُطلب ثم تُرفض", () => {
    expect(hasEvidence(badgeEvidenceOf(measured(5, [dbRow])))).toBe(true);
  });
});

describe("الاشتقاق — لا تنقطع سلسلة الإسناد عند أوّل حساب", () => {
  const a = measured(2, [dbRow]);
  const b = measured(3, [
    { kind: "reference.builtin", source: "regionSim", observedAt: "2026-09-20T10:00:00.000Z" },
  ]);

  it("المشتقّ يرث أدلّة مدخلاته كلّها", () => {
    const sum = deriveFrom([a, b], () => 5, { source: "sum" });
    expect(isMeasured(sum)).toBe(true);
    if (!isMeasured(sum)) return;
    expect(sum.value).toBe(5);
    expect(sum.confidence).toBe("derived");
    // دليلُ الاشتقاق نفسه + دليلا المدخلين.
    expect(sum.evidence.map((e) => e.source)).toEqual(["sum", "sec_incidents", "regionSim"]);
    expect(sum.evidence[0].kind).toBe("derived.computed");
  });

  it("**وغيابٌ واحد في المدخلات يجعل المخرَج غائبًا** — لا متوسّطًا ناقصًا", () => {
    const out = deriveFrom([a, unmeasured("الشدّة غير مقيسة")], () => 99);
    expect(isMeasured(out)).toBe(false);
    if (isMeasured(out)) return;
    // ويحمل سبب الغياب الأصليّ لا سببًا عامًّا.
    expect(out.reason).toBe("الشدّة غير مقيسة");
  });

  it("ولا يُحسب المشتقّ أصلًا حين يغيب مدخل", () => {
    let computed = false;
    deriveFrom([unmeasured("لا مصدر")], () => {
      computed = true;
      return 1;
    });
    expect(computed).toBe(false);
  });
});

describe("لا نظام موازٍ — FR-19: «single source of truth — do not fork»", () => {
  const SRC = readFileSync("src/lib/evidence/evidence.ts", "utf8");

  it("الطبقة لا تعرّف `Evidence` ولا `EvidenceKind` — تستوردهما", () => {
    // كُتبت أوّل مرّة بنوعين خاصَّين بها في المجلّد نفسه؛ وذاك انشقاقٌ
    // لا يُسقطه tsc ولا eslint، ويُكتشف يوم تفترق الشارة عن الرقم.
    expect(SRC).not.toMatch(/^export (type|interface) Evidence(Kind|Ref)?\b/m);
    expect(SRC).toMatch(/from "\.\/gate"/);
  });

  it("والأصناف الثلاثة المضافة في `gate.ts` لا في نسخةٍ ثانية", () => {
    const GATE = readFileSync("src/lib/evidence/gate.ts", "utf8");
    for (const k of ["reference.builtin", "derived.computed", "human.attested"]) {
      expect(GATE, `الصنف ${k} ليس في الاتحاد القانونيّ`).toContain(`"${k}"`);
    }
  });

  it("و`EntityRef` يتكلّم مفردات الأنطولوجيا لا نصًّا حرًّا", () => {
    // كُتب `type: string` أوّلًا، وفي المستودع أنطولوجيا قائمة تسمّي هذه
    // الكيانات نفسها في اتحادٍ مغلق (`person` · `site` · `asset` ·
    // `incident` · `evidence` …). ونصٌّ حرٌّ بجوارها مفرداتٌ ثانية: تتّفقان
    // بالعادة لا بالنوع، فيمرّ `"incidents"` و`"Incident"` بلا صوت.
    const GATE = readFileSync("src/lib/evidence/gate.ts", "utf8");
    expect(GATE).toMatch(/readonly kind: EntityKind;/);
    expect(GATE).toMatch(
      /import type \{ EntityKind \} from "@\/lib\/sadeed\/knowledge-graph\/types"/,
    );
    expect(GATE, "نصٌّ حرٌّ عاد إلى EntityRef").not.toMatch(
      /interface EntityRef \{[\s\S]*?type: string/,
    );
  });
});

describe("نصّ الغياب — أربع نسخ قائمة يجب ألّا تفترق", () => {
  // لم تُوحَّد النسخ الأربع في هذه الدفعة (تغييرٌ يمسّ ثمانية ملفّات
  // مستهلِكة، خارج نطاق إضافة الطبقة). فبدلًا من تركها احتمالًا صامتًا،
  // صار افتراقُها **يسقط الاختبار** — والتوحيد يبقى دَينًا معلنًا.
  const COPIES = [
    "src/lib/sec-exec-kpis.functions.ts",
    "src/lib/reports/report-document.types.ts",
    "src/lib/reports/pdf-rich.ts",
    "src/lib/reports/report-model.ts",
  ];

  it("النسخ الأربع موجودة ومتطابقة", () => {
    const values = COPIES.map((f) => {
      const m = /export const UNMEASURED_AR = "([^"]+)"/.exec(readFileSync(f, "utf8"));
      expect(m, `${f} بلا UNMEASURED_AR`).not.toBeNull();
      return m![1];
    });
    expect(new Set(values).size, `نسخٌ متفرّقة: ${values.join(" | ")}`).toBe(1);
  });

  it("والطبقة تُعيد تصدير إحداها ولا تعرّف خامسة", () => {
    const src = readFileSync("src/lib/evidence/evidence.ts", "utf8");
    expect(src).not.toMatch(/const UNMEASURED_TEXT_AR\s*=\s*"/);
    expect(src).toMatch(/export \{ UNMEASURED_AR as UNMEASURED_TEXT_AR \}/);
    expect(UNMEASURED_TEXT_AR).toBe("لم يُقَس");
  });
});

describe("لا «ثقة ٪» مختلَقة — مسحٌ يفشل مغلقًا", () => {
  // ## تاريخُ هذا الحارس، لأنه يشرح شكله
  //
  // كُتب أوّلًا بقائمة **شمول**: أربعة ملفّات واسمٌ يقول «أي سطح». فمرّ
  // بينما `speak-agent.ts` ينطق النسبة. ثمّ صار مسحًا شاملًا بنمطٍ واحد
  // `/confidence \* 100/` — فمرّ بينما **أحد عشر سطحًا** تكتبها بصياغاتٍ
  // أخرى (`ai_confidence * 100` · `(x ?? 0) * 100` · «بثقة ٩١٪» نصًّا).
  // العلّة انتقلت من قائمة الملفّات إلى الـregex، ولم تُحَلّ.
  //
  // فصار **يفشل مغلقًا**: كلّ تطابقٍ يجب أن يكون في أحد سجلَّين معلَنين،
  // وأيّ تطابقٍ غير مسجَّل يُسقط الاختبار. فالسطح الجديد لا يمرّ بالسكوت.

  const PATTERNS = [
    /confidence[^\n]{0,40}\*\s*100/i,
    /\*\s*100[^\n]{0,40}confidence/i,
    /بثقة\s*[\d٠-٩]+/,
    /ثقة\s*[\d٠-٩]+\s*[٪%]/,
  ];

  /**
   * **كل سطحٍ مبرَّرٌ بمفرده — وبرهانٌ يُفحَص لا نثرٌ يُقرأ.**
   *
   * الصيغة الأولى اشترطت `why.trim().length > 10`: طولَ التبرير لا صدقَه.
   * فمرّت ثلاثُ جملٍ **خاطئة** وبقي الاختبار أخضر — حارسٌ يقيس الشكل
   * الذي أراد الخروج منه. فصار لكلّ سطحٍ `proof`: نمطٌ يجب أن يظهر في
   * الملفّ نفسه، فالادّعاء يُكذَّب آليًّا إن لم يكن مصدره ما يقوله.
   */
  const JUSTIFIED: Record<string, { why: string; proof: RegExp }> = {
    // درجةُ مصنِّفٍ على صفٍّ في `sec_cctv_alerts` — قياسٌ حقيقيّ.
    // والبرهان: الملفّ يذكر الكاميرا أو الجدول.
    "src/components/sec/alerts-panel.tsx": {
      why: "sec_cctv_alerts.confidence — درجة كاشف",
      proof: /camera_code|sec_cctv_alerts/,
    },
    "src/lib/sec-exec-kpis.functions.ts": {
      why: "sec_cctv_alerts.confidence — درجة كاشف (وتجهيزات `sim-` موسومة معها)",
      proof: /camera_code|sec_cctv_alerts/,
    },
    "src/lib/sadeed-context.server.ts": {
      why: "sec_cctv_alerts.confidence — درجة كاشف",
      proof: /camera_code|sec_cctv_alerts/,
    },
    "src/routes/_authenticated/sec.index.tsx": {
      why: "sec_cctv_alerts.confidence — درجة كاشف",
      proof: /camera_code|sec_cctv_alerts/,
    },
    "src/routes/_authenticated/sec.timeline.tsx": {
      why: "sec_cctv_alerts.confidence — درجة كاشف",
      proof: /camera_code|sec_cctv_alerts/,
    },
  };

  /**
   * دَينٌ **معلَن** لا استثناء — لكلٍّ سببه ومصدره.
   *
   * **وثلاثةٌ منها كانت في `JUSTIFIED` بوصفٍ غير صادق** وأُعيدت إلى هنا:
   * قلتُ إنّ ثقة الوكلاء «نسبةُ نجاح تشغيلات» وهو صحيحٌ في الشيفرة
   * ووحدَه لا يكفي — فـ`getBridgeState` مغلَّفة بـ`resilient()` تسقط إلى
   * `buildBridgeSimulation()` التي تُعيد `ai_confidence: 0.93` وثقاتِ
   * وكلاءَ مكتوبة. والقاعدة بلا تشغيلات منذ يوليو، فـ**المخدوم فعلًا هو
   * المحاكاة**، و`/theater` بلا شارةِ محاكاةٍ إطلاقًا. فالمعروض رقمٌ
   * مكتوبٌ بلا إفصاح، وتسميتُه «قياسًا» تبريرٌ لا يصدق على ما يُرى.
   */
  const DECLARED_DEBT: Record<string, string> = {
    "src/components/digital-humans/AgentRoster.tsx": "spec.baselineConfidence — خطُّ أساسٍ مكتوب",
    "src/components/cockpit/overlays.tsx": "snapshot.sadeed.confidence — مصدرٌ غير مقيس",
    "src/components/cockpit/sadeed-panel.tsx": "sadeed.confidence — مصدرٌ غير مقيس",
    "src/components/situation-room/AgentConversation.tsx": "ثقةُ دور ومُخرَجٍ من نموذج",
    "src/lib/executive-presentation.functions.ts":
      "finn_decisions.confidence — رقمٌ مخزَّن بلا إسناد",
    "src/routes/_authenticated/investor.tsx": "finn_decisions.confidence — نفسه",
    "src/routes/_authenticated/analyst.tsx": "«بثقة ٩١٪» نصُّ سيناريو عرضٍ مكتوب",
    "src/lib/demo/timeline.ts": "«بثقة 0.92» نصُّ خطِّ زمنٍ تجريبيّ مكتوب",
    // الثلاثة المُعادة من `JUSTIFIED` — المخدوم محاكاةٌ بلا شارة.
    "src/components/bridge/AgentNode.tsx": "completed/total في الشيفرة — والمخدوم محاكاة بلا شارة",
    "src/components/theater/ExplainPanel.tsx": "نفس المصدر — والمخدوم محاكاة بلا شارة",
    "src/routes/_authenticated/theater.tsx": "ai_confidence — والمخدوم 0.93 مكتوبة بلا شارة",
  };

  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) return walk(full);
      return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
    });
  }

  /** أسطرُ شيفرةٍ فقط: التوثيق يقتبس المحظور ليشرحه. */
  function matches(file: string): boolean {
    return readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => {
        const t = l.trim();
        return !t.startsWith("//") && !t.startsWith("*");
      })
      .some((l) => PATTERNS.some((p) => p.test(l)));
  }

  const ALL = walk("src").filter(matches);
  const REGISTERED = new Set([...Object.keys(JUSTIFIED), ...Object.keys(DECLARED_DEBT)]);

  it("**لا سطحَ غير مسجَّل** — الحارس يفشل مغلقًا", () => {
    const rogue = ALL.filter((f) => !REGISTERED.has(f));
    expect(rogue, `أسطحٌ غير مسجَّلة: ${rogue.join(", ")}`).toEqual([]);
  });

  it("ولا نسبةَ ثقةٍ تُنطق — في أي ملفّ نطق", () => {
    // المنطوق أشدّ أثرًا: لا شارة معه ولا مصدر. وهذا ما فات الحارس أوّلًا.
    const spoken = ALL.filter((f) => /speak|voice|tts|narrat/i.test(f));
    expect(spoken, `نطقٌ لنسبة ثقة: ${spoken.join(", ")}`).toEqual([]);
  });

  it("والأسطح المُصلَحة لا تعود", () => {
    for (const f of [
      "src/components/sec/sec-ops-insights.tsx",
      "src/components/situation-room/DecisionEngine.tsx",
      "src/components/bridge/BriefingStage.tsx",
      "src/lib/exec/briefing.functions.ts",
      "src/lib/digital-humans/speak-agent.ts",
    ]) {
      expect(matches(f), `${f} عاد يعرض نسبة ثقة`).toBe(false);
    }
  });

  it("**وتبريرُ كل «قياسٍ حقيقيّ» يُفحَص في الملفّ** — لا يُصدَّق نثرُه", () => {
    // الصيغة الأولى قاست طول النصّ فمرّت ثلاثُ جملٍ خاطئة. البرهان الآن
    // نمطٌ يجب أن يظهر في الملفّ: الادّعاء يُكذَّب آليًّا إن كذب.
    for (const [f, { why, proof }] of Object.entries(JUSTIFIED)) {
      expect(why.trim().length, `${f} بلا سبب`).toBeGreaterThan(10);
      expect(proof.test(readFileSync(f, "utf8")), `${f}: التبرير «${why}» لا يُثبته الملفّ`).toBe(
        true,
      );
    }
    for (const [f, why] of Object.entries(DECLARED_DEBT)) {
      expect(why.trim().length, `${f} بلا سبب`).toBeGreaterThan(10);
    }
  });

  it("والسجلّان لا يتعفّنان — كل مسجَّلٍ ما زال مطابقًا", () => {
    // قائمةٌ تبقى بعد معالجة ما فيها كذبٌ صامت في الاتجاه الآخر.
    for (const f of [...Object.keys(JUSTIFIED), ...Object.keys(DECLARED_DEBT)]) {
      expect(matches(f), `${f} لم يعد يطابق — احذفه من السجلّ`).toBe(true);
    }
  });

  it("وتسمية الدرجة مصدرٌ واحد لا نسخة لكل سطح", () => {
    for (const f of [
      "src/components/sec/sec-ops-insights.tsx",
      "src/components/situation-room/DecisionEngine.tsx",
      "src/components/bridge/BriefingStage.tsx",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src, `${f} يعرّف نسخةً محلّية`).not.toMatch(/const CONFIDENCE_LABEL/);
      expect(src).toMatch(/from "@\/lib\/evidence\/confidence-labels"/);
    }
  });
});

describe("ولا قيمةَ ثقةٍ مكتوبة خارج ما بُرِّر صراحةً", () => {
  // الفحص الأوّل يمسك **العرض** (`* 100`)؛ وهذا يمسك **المصدر**:
  // `confidence: 0.85` مكتوبةً في الشيفرة. والاثنان لا يتداخلان: قيمةٌ
  // مكتوبة قد تُعرض في ملفٍّ آخر، فلا يراها فحصُ العرض في موضع كتابتها.

  const LITERAL = /confidence["']?\s*[:=]\s*0?\.[0-9]+/i;

  /**
   * قوالبُ موجِّهات — **ليست قيمًا بل أمثلةُ مخطّط**.
   *
   * `"confidence": 0.0` داخل نصّ JSON يُعطى للنموذج ليملأه. لا تُعرض
   * ولا تُقرأ قياسًا؛ وحذفُها يكسر عقد الردّ.
   */
  const PROMPT_SCHEMA: Record<string, string> = {
    "src/lib/sadeed/executive-brain/reasoning.server.ts": "مثال مخطّط في نصّ موجِّه",
    "src/lib/sadeed/thinking-loop.server.ts": "مثال مخطّط في نصّ موجِّه",
  };

  /**
   * محاكاةٌ مرجعية **معلَنة** — عقيدة «بيانات لا تفرغ».
   *
   * موسومة `is_simulation` وتُعرض بشارتها حيث تلزم، فهي إفصاحٌ لا ادّعاء.
   * والفرق عن الاختلاق أنّ القارئ يُخبَر أنّها محاكاة.
   */
  const DECLARED_SIMULATION: Record<string, string> = {
    "src/lib/exec/showcase-simulation.server.ts": "markSimulation — بيانات عرض موسومة",
    "src/lib/sec-exec-kpis.functions.ts": "تجهيزات `sim-` موسومة",
    "src/lib/simulation/exec-scenario.server.ts": "سيناريو محاكاة معلَن",
    "src/routes/_authenticated/mission-control.tsx": "تجهيزات شاشة عرض",
  };

  /** دَينٌ معلَن: قيمٌ مكتوبة تُعرض كأنها قياس. */
  const LITERAL_DEBT: Record<string, string> = {
    "src/lib/digital-humans/registry.ts": "baselineConfidence — خطُّ أساسٍ لكل شخصية",
    "src/components/cockpit/repository.ts": "بذرة لوحة القمرة",
    "src/lib/exec/conversation.functions.ts": "احتياطيّ حتميّ بثقة مكتوبة",
    "src/lib/sadeed/insight-engine.server.ts": "ثقةُ استنتاجٍ مكتوبة",
    "src/lib/sadeed/adaptive-preferences.ts": "عتبة تفضيلات",
    "src/lib/sadeed/learning/pattern-miner.server.ts": "عتبة تنقيب أنماط",
  };

  const REGISTERED_LITERAL = new Set([
    ...Object.keys(PROMPT_SCHEMA),
    ...Object.keys(DECLARED_SIMULATION),
    ...Object.keys(LITERAL_DEBT),
  ]);

  function walkAll(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) return walkAll(full);
      return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
    });
  }

  function hasLiteral(f: string): boolean {
    return readFileSync(f, "utf8")
      .split("\n")
      .filter((l) => {
        const t = l.trim();
        return !t.startsWith("//") && !t.startsWith("*");
      })
      .some((l) => LITERAL.test(l));
  }

  const WITH_LITERAL = walkAll("src").filter(hasLiteral);

  it("**كل قيمةٍ مكتوبة مسجَّلة** — والجديدة تُسقط الاختبار", () => {
    const rogue = WITH_LITERAL.filter((f) => !REGISTERED_LITERAL.has(f));
    expect(rogue, `قيمُ ثقةٍ مكتوبة غير مبرَّرة: ${rogue.join(", ")}`).toEqual([]);
  });

  it("ولكلٍّ سببٌ منصوص", () => {
    for (const [f, why] of [
      ...Object.entries(PROMPT_SCHEMA),
      ...Object.entries(DECLARED_SIMULATION),
      ...Object.entries(LITERAL_DEBT),
    ]) {
      expect(why.trim().length, `${f} بلا سبب`).toBeGreaterThan(10);
    }
  });

  it("والسجلّ لا يتعفّن", () => {
    for (const f of REGISTERED_LITERAL) {
      expect(hasLiteral(f), `${f} لم يعد يحوي قيمةً مكتوبة — احذفه`).toBe(true);
    }
  });

  it("**ولا قيمةَ مكتوبة في مسار الموجز أو المخاطر** — وهما ما أُصلح", () => {
    for (const f of [
      "src/lib/exec/briefing.functions.ts",
      "src/lib/exec/briefing-confidence.ts",
      "src/lib/exec/predictive.functions.ts",
      "src/lib/exec/risk-grounding.ts",
      "src/lib/exec/decisions.functions.ts",
      "src/lib/exec/bridge.functions.ts",
      "src/components/theater/ExplainPanel.tsx",
    ]) {
      expect(hasLiteral(f), `${f} عاد يحمل قيمةَ ثقةٍ مكتوبة`).toBe(false);
    }
  });
});

describe("الاختلاقُ الذي لا يضرب في مئة", () => {
  // العلّة البنيوية في المسحَين السابقَين: كلاهما يفحص **شكل** `* 100`
  // أو `confidence: 0.X`. والاختلاق الحيّ الذي أفلت كان يكتب الرقم
  // **مئويًّا من البداية** (`confidence: 82`) أو يولّده من عدّ
  // (`20 + evidenceCount*12`) — فلا يضرب في شيء ولا يبدأ بفاصلة.
  //
  // فهذا فحصٌ ثالث على المواضع المقيسة بعينها، لا مسحٌ شكليّ رابع.

  it("**لا ثقةٍ مئويةٍ مكتوبة** في مسار التوقّعات", () => {
    const src = readFileSync("src/lib/intelligence.functions.ts", "utf8");
    expect(src, "عادت قيمةٌ مئوية مكتوبة").not.toMatch(/confidence:\s*\d{2},/);
    expect(src, "عادت دالّةُ عدّ صفوف").not.toMatch(/confidence:\s*Math\.min\(9\d,/);
    expect(src).toMatch(/confidence: Confidence/);
  });

  it("ولا نسبةٍ مولَّدةٍ من عدّ في بطاقة سَدِيد التنفيذية", () => {
    // `percent = 20 + evidenceCount*12 + availableCtx*5 - missingCtx*3`
    // كان يُعرض «الثقة N%». وترويسة محرّكه تقول `NEVER fabricates`.
    const card = readFileSync("src/components/sadeed-core/ExecutiveCard.tsx", "utf8");
    expect(card, "عادت النسبة المولَّدة من عدّ").not.toMatch(/confidence\.percent/);
    expect(card).toMatch(/evidence_strength/);
  });

  it("ولا أرضيةَ ثقةٍ مفترَضة في الجسر", () => {
    // `Math.max(0.4, …)` قاعٌ يجعل وكيلًا نجح صفرًا يُقرأ ٤٠٪.
    const bridge = readFileSync("src/lib/exec/bridge.functions.ts", "utf8");
    expect(bridge, "عادت أرضية القاع").not.toMatch(/Math\.max\(0\.4, completed/);
  });

  it("وكلُّ سطحٍ يعرض الغياب يقوله **بلغة قارئه**", () => {
    // `UNMEASURED_TEXT_AR` عربيٌّ وحده، وعرضُه على واجهةٍ إنجليزية خرقُ
    // ثنائية اللغة.
    //
    // **وكان هنا قائمةُ ثلاثة ملفّاتٍ مكتوبة**، فأصلحَتها هذه الدفعة
    // وأنشأت رابعها (`live-dashboard.tsx`) والحارسُ لا يراه — قائمةٌ
    // جامدة تشهد لما فيها لا لما تقوله. فصار **مسحًا لكلّ `src/**`**:
    // أيُّ سطحٍ يستورد النصّ العربيّ وحده يسقط، مهما كان جديدًا.
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = `${dir}/${e.name}`;
        if (e.isDirectory()) return walk(full);
        return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
      });
    // **الشيفرةُ لا النثر.** التوثيق هنا يقتبس الاسمَ ليشرح الخرق،
    // وحارسٌ يقرأ الملفّ خامًا يسقط على الشرح كما يسقط على العلّة.
    const strip = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    const offenders = walk("src")
      .filter((f) => /UNMEASURED_TEXT_AR/.test(strip(readFileSync(f, "utf8"))))
      // مصدرُ الثابت ومُعيدُ تصديره ليسا سطحَ عرض.
      .filter((f) => !/evidence\/evidence\.ts$|report-document\.types\.ts$/.test(f));
    expect(offenders, `أسطحٌ تعرض العربيّ وحده: ${offenders.join(" · ")}`).toEqual([]);
  });

  it("ولا ضربَ في مئة على مقياسٍ أصلًا ٠..١٠٠", () => {
    // `overall_score` موصوفٌ «0-100 or -1» وكان يُضرب في مئة ⇒ ١٠٠٠٠٪،
    // و‑١٠٠٪ عند المجهول. عطلُ `ai_confidence` نفسه ملفًّا واحدًا بعيدًا.
    const se = readFileSync("src/routes/_authenticated/self-evolution.tsx", "utf8");
    expect(se, "عاد ضربُ مقياسٍ مئويّ في مئة").not.toMatch(/overall_score \* 100/);
    expect(se).toMatch(/overall_score < 0/);
  });
});

describe("الصنفُ لا الموضع — إقحامُ ثقةٍ بجوار علامة نسبة", () => {
  // **العلّة التي تكرّرت ثلاث مرّات:** كلُّ حارسٍ سابق يمسك موضعًا أو
  // شكلًا، فينجو الصنف. وآخرها أنّ تحويل `Prediction.confidence` إلى
  // اتحادِ سلاسل ترك مستهلكًا ثالثًا يكتب `ثقة ${p.confidence}٪` —
  // فعُرض **«ثقة estimated٪»** على `/executive`، وهو مسارٌ حيّ.
  //
  // و`tsc` عاجزٌ بنيويًّا: إقحام اتحادِ سلاسلَ في قالبٍ نصّيّ صحيحٌ
  // نوعيًّا. فالصمت هنا ليس سلامة، والحارس يجب أن يمسك **الشكل الدلاليّ**:
  // قيمةُ ثقةٍ مُقحَمة وعلامةُ نسبةٍ تليها مباشرةً — أينما كانت.

  const INTERPOLATED_PCT = [
    /\$\{[^}]*\bconfidence\b[^}]*\}\s*[%٪]/i, // `${x.confidence}%`
    /\{[^}]*\.confidence\s*\}\s*[%٪]/i, // JSX: {p.confidence}%
  ];

  function walkSrc(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) return walkSrc(full);
      return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
    });
  }

  /**
   * ما يُقحم **رقمًا** لا مصطلحًا.
   *
   * الفرق جوهريّ: `${pct}%` حيث `pct` عددٌ يُنتج «٧٢٪» — قد يكون دَينًا
   * مُعلَنًا لكنّه نصٌّ مفهوم. أمّا `${p.confidence}٪` حيث النوع اتحادُ
   * سلاسل فيُنتج **«estimated٪»** — لا معنى له بأي لغة. والحارس هنا
   * لصنف الثاني؛ والأوّل محكومٌ بسجلّ الدَّين أعلاه.
   */
  const NUMERIC_INTERPOLATION = new Set([
    "src/components/sec/alerts-panel.tsx",
    "src/lib/sec-exec-kpis.functions.ts",
    "src/lib/sadeed-context.server.ts",
    "src/routes/_authenticated/sec.index.tsx",
    "src/routes/_authenticated/sec.timeline.tsx",
    "src/components/cockpit/overlays.tsx",
    "src/components/digital-humans/AgentRoster.tsx",
    "src/components/theater/ExplainPanel.tsx",
    "src/routes/_authenticated/cockpit.tsx",
  ]);

  it("**لا ملفَّ يُقحم مصطلحَ ثقةٍ بجوار علامة نسبة**", () => {
    const offenders = walkSrc("src")
      .filter((f) => {
        const src = readFileSync(f, "utf8");
        const lines = src.split("\n").filter((l) => {
          const t = l.trim();
          return !t.startsWith("//") && !t.startsWith("*");
        });
        return lines.some((l) => INTERPOLATED_PCT.some((p) => p.test(l)));
      })
      .filter((f) => !NUMERIC_INTERPOLATION.has(f));
    expect(offenders, `إقحامُ ثقةٍ بعلامة نسبة: ${offenders.join(", ")}`).toEqual([]);
  });

  it("وكلُّ مستهلكٍ لـ`Prediction` يعرض المصطلح لا يُقحمه في نسبة", () => {
    // النوع تغيّر من `number` إلى اتحادِ سلاسل، و`tsc` لا يرى الفرق داخل
    // قالبٍ نصّيّ. فيُحصى المستهلكون بالبحث لا بالذاكرة — كان ثلاثةً
    // وظننتُهم اثنين، فعُرض «estimated٪» على `/executive`.
    const consumers = walkSrc("src").filter((f) =>
      /usePredictions|predictions\?\./.test(readFileSync(f, "utf8")),
    );
    expect(consumers.length, "لا مستهلك — تغيّر اسم الخطّاف؟").toBeGreaterThanOrEqual(3);
    for (const f of consumers) {
      const src = readFileSync(f, "utf8");
      if (!/\.confidence/.test(src)) continue;
      expect(src, `${f} يعرض الثقة بلا CONFIDENCE_LABEL`).toMatch(/CONFIDENCE_LABEL/);
    }
  });
});
