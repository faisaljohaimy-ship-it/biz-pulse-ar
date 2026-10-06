/**
 * قواعد «سجل الصيانة التصحيحية» — النسبة من المرحلة، والمرحلة من الدليل،
 * والتأخير من التاريخين، والعناوين محجوبة. الأمثلة **مصطنعة** بصياغة
 * ملاحظات الفنيين لا منسوخة منها — لا موقع ولا رقم SAP ولا ملاحظة حقيقية في
 * المستودع (نقض حارس الجودة ٢٠٢٦/١٠/٠٦).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  STAGES,
  STAGE_PCT,
  classifyHoldReason,
  delayDays,
  maskNetworkIds,
  nextStage,
  normalizeSapWo,
  progressOf,
  stageFromEvidence,
  toIsoDate,
  toMaintOrder,
  type CmRow,
} from "@/lib/maintenance/cm-log-rules";

describe("نسبة الإنجاز من المرحلة وحدها", () => {
  it("الأوزان تصاعدية صارمة وتنتهي بـ١٠٠", () => {
    const pcts = STAGES.map((s) => STAGE_PCT[s]);
    for (let i = 1; i < pcts.length; i++) expect(pcts[i]).toBeGreaterThan(pcts[i - 1]);
    expect(pcts.at(-1)).toBe(100);
  });

  it("الملغى بلا نسبة (لا صفر)، والمُنجز ١٠٠ أيًّا كانت مرحلته", () => {
    expect(progressOf("diagnosed", "cancelled")).toBeNull();
    expect(progressOf("registered", "completed")).toBe(100);
    expect(progressOf("awaiting_parts", "on_hold")).toBe(60);
  });

  it("المرحلة التالية، ولا شيء بعد الإغلاق", () => {
    expect(nextStage("registered")).toBe("assigned");
    expect(nextStage("closed")).toBeNull();
  });
});

describe("سبب الإيقاف — العائق الخارجي يسبق الفني", () => {
  it.each([
    ["sensor X1 must be replaced, no approval yet for the parts", "approval"],
    ["barrier B2 down: no power supply 220v at panel, controller board also damaged", "power"],
    ["camera C7 offline because the area is under construction", "site_not_ready"],
    ["camera C3 back online; PTZ P9 still needs a manlift to reach", "access"],
    ["local checks fine, ISP link down at the gatehouse", "it_support"],
    ["camera C5 dead, need to dig a new cable route to the rack", "civil_cabling"],
    ["camera C9 housing damaged, need to replace", "spare_parts"],
    ["PTZ P4 ongoing troubleshooting", "troubleshooting"],
  ])("%s ⇐ %s", (note, reason) => {
    expect(classifyHoldReason(note)).toBe(reason);
  });

  it("بلا ملاحظة أو بملاحظة لا دليل فيها ⇐ لا سبب (لا تخمين)", () => {
    expect(classifyHoldReason(null)).toBeNull();
    expect(classifyHoldReason("-")).toBeNull();
    expect(classifyHoldReason("reader R1 not working")).toBeNull();
  });
});

describe("المرحلة من الدليل — لا أعلى من دليلها", () => {
  it.each([
    ["completed", "anything", "closed"],
    ["open", null, "registered"],
    ["on_hold", "speaker S1 reconfigured, now working properly", "testing"],
    ["on_hold", "camera C9 housing damaged, need to replace", "awaiting_parts"],
    ["on_hold", "bollard D1 needs replacement, waiting for approval", "awaiting_parts"],
    ["open", "PTZ P4 ongoing troubleshooting", "on_site"],
    ["open", "reader R1 not working", "diagnosed"],
  ] as const)("%s + «%s» ⇐ %s", (status, note, stage) => {
    expect(stageFromEvidence(status, note)).toBe(stage);
  });
});

describe("التنظيف", () => {
  it("عناوين IP وMAC تُحجب", () => {
    const out = maskNetworkIds("cam C1; IP: 203.0.113.7 mac 02:00:5E:10:20:30 ok");
    expect(out).not.toMatch(/203\.0\.113|02:00:5E/);
    expect(out).toContain("[عنوان IP محجوب]");
    expect(out).toContain("[عنوان MAC محجوب]");
  });

  it("رقم SAP أرقام فقط، و«NEED SAP» معلَّق", () => {
    expect(normalizeSapWo(12345678901)).toBe("12345678901");
    expect(normalizeSapWo("NEED SAP")).toBeNull();
  });

  it("التأخير من التاريخين: لا سالب، وبلا تاريخ لا رقم (لا ‎-45838)", () => {
    expect(delayDays("2025-06-30", "2025-07-05")).toBe(5);
    expect(delayDays("2025-06-30", "2025-06-28")).toBe(0);
    expect(delayDays("2025-06-30", null)).toBeNull();
  });

  it("تاريخ Excel التسلسلي والكائن والنص", () => {
    expect(toIsoDate(45658)).toBe("2025-01-01");
    expect(toIsoDate(45838)).toBe("2025-06-30");
    expect(toIsoDate(new Date("2025-04-01T00:00:00Z"))).toBe("2025-04-01");
    expect(toIsoDate("not a date")).toBeNull();
  });
});

describe("صفّ ⇐ أمر عمل", () => {
  const base: CmRow = {
    no: 448,
    city: " JEDDAH ",
    site: "  Reference   Site 1  ",
    system: "CCTV",
    component: "Outdoor Fixed Camera",
    status: "HOLD BY SE",
    requested: new Date("2025-06-30T00:00:00Z"),
    due: new Date("2025-06-30T00:00:00Z"),
    completed: null,
    sapWo: "NEED SAP",
    po: "new cm",
    boqItem: "2.1.1",
    qty: 1,
    serviceCost: 1250,
    maintenanceCost: 1250,
    sparesCost: 0,
    penalty: 0,
    notes: "camera C9 housing damaged, need to replace. IP 198.51.100.4",
  };

  it("المكرَّر في رقم الطلب يُميَّز لا يُسقط، والصفّ بلا حالة يُتخطّى", () => {
    const seen = new Map<string, number>();
    const a = toMaintOrder(base, 10, seen);
    const b = toMaintOrder(base, 11, seen);
    expect(a?.ref).toBe("CM-0448");
    expect(b?.ref).toBe("CM-0448-2");
    expect(toMaintOrder({ ...base, status: null }, 12, seen)).toBeNull();
  });

  it("الموقوف: مرحلة ونسبة وسبب، وتأخير غير مخزَّن (يُحسب حيًّا)، والعنوان محجوب", () => {
    const o = toMaintOrder(base, 10, new Map())!;
    expect(o.city).toBe("JEDDAH");
    expect(o.site).toBe("Reference Site 1");
    expect(o.status).toBe("on_hold");
    expect(o.stage).toBe("awaiting_parts");
    expect(o.progress_pct).toBe(60);
    expect(o.hold_reason).toBe("spare_parts");
    expect(o.delay_days).toBeNull();
    expect(o.sap_wo).toBeNull();
    expect(o.notes).not.toContain("198.51.100.4");
  });
});

describe("سكربت الاستيراد — البيانات الحقيقية خارج المستودع", () => {
  const SRC = readFileSync("scripts/import-cm-log.mjs", "utf8");
  it("يرفض مجلّد إخراج داخل المستودع، ويستورد القواعد نفسها", () => {
    expect(SRC).toContain("is inside the repository — real data stays out of git");
    expect(SRC).toContain('from "../src/lib/maintenance/cm-log-rules.ts"');
    expect(SRC).toContain("on conflict (org_id, source, source_row) do update");
  });
});
