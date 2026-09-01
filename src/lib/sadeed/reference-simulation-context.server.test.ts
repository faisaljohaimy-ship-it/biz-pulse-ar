import { describe, expect, it } from "vitest";
import { buildReferenceSimulationContext } from "./reference-simulation-context.server";

describe("SADEED reference simulation context", () => {
  /**
   * **نُسخ شرطُ الوسم الشامل ٢٠٢٦/٠٨/٣١، ولم يُضعَّف.**
   *
   * كان هذا البند يُلزم الكتلة بحمل `REFERENCE_SIMULATION_ONLY`، وكان
   * صادقًا يوم كانت الكتلة محاكاةً خالصة. ثم أمر المالك بأن يرى سَدِيد
   * بيانات المشاريع — وهي **إنتاجية** بإقراره (٢٠٢٦/٠٨/٣٠) — فصار الشرط
   * القديم يُلزم بكذبةٍ في الاتجاه المعاكس: أن يصف سَدِيد بياناتٍ حقيقية
   * بأنها محاكاة، فيُهدر مصداقيتها أمام من يقرأها.
   *
   * فحلّ محلّه شرطٌ **أقوى** لا أضعف: الوسم لكل قسمٍ على حدة، وكل قسمٍ
   * محاكاةٍ ما زال يجب أن يحمل `[SIM:*]` صراحةً. تفصيل الوسم ومنعُ الخلط
   * في `projects-maintenance-context.contract.test.ts`.
   */
  it("يعلن اختلاط الأصل ويسِم أقسام المحاكاة صراحةً", () => {
    const snapshot = buildReferenceSimulationContext(Date.parse("2026-08-01T12:00:00Z"));
    expect(snapshot.dataAvailable).toBe(true);
    expect(snapshot.contextBlock).toContain("DATA_MODE: MIXED");
    expect(snapshot.contextBlock).toContain("محاكاةٌ مرجعية");
    // ولا يُعلَن أن الكتلة كلَّها محاكاة بعد أن دخلها قسمٌ إنتاجي.
    expect(snapshot.contextBlock).not.toContain("REFERENCE_SIMULATION_ONLY");
    // ومصدرا المحاكاة الأصليان ما زالا موسومَين.
    expect(snapshot.contextBlock).toContain("[SIM:SEC_OVERVIEW]");
    expect(snapshot.contextBlock).toContain("[SIM:COMMAND_CENTER]");
  });

  it("ويغطّي مناطق الأمن الصناعي الأربع", () => {
    const snapshot = buildReferenceSimulationContext(Date.parse("2026-08-01T12:00:00Z"));
    for (const region of ["الوسطى", "الغربية", "الشرقية", "الجنوبية"]) {
      expect(snapshot.contextBlock).toContain(region);
    }
    expect(snapshot.contextBlock).toContain("متوسط الامتثال عبر المناطق: 95%");
  });

  it("ولا يسرّب حقول هوية شخصية", () => {
    const snapshot = buildReferenceSimulationContext(Date.parse("2026-08-01T12:00:00Z"));
    expect(snapshot.contextBlock).not.toContain("full_name");
  });
});
