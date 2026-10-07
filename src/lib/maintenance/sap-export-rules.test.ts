/**
 * قواعد «تصدير SAP PM» — أمثلة مصطنعة بصيغة أعمدة التصدير، لا صفوف منه.
 */
import { describe, expect, it } from "vitest";
import {
  plannerRegion,
  sapEnteredBy,
  sapFacilityName,
  sapKind,
  sapPriority,
  sapStatus,
  sapSystem,
} from "@/lib/maintenance/sap-export-rules";
import { REGIONS } from "@/lib/regions";

describe("نوع الأمر والمنطقة", () => {
  it("HSPM وقائية · HSCM تصحيحية · غيرهما لا يُخمَّن", () => {
    expect(sapKind("HSPM")).toBe("preventive");
    expect(sapKind(" hscm ")).toBe("corrective");
    expect(sapKind("ZZ01")).toBeNull();
  });

  it("مجموعات التخطيط الأربع ⇐ معرّفات regions.ts وحدها", () => {
    const ids = new Set(REGIONS.map((r) => r.id));
    for (const g of ["EOA", "SOA", "COA", "WOA"]) {
      const r = plannerRegion(g);
      expect(r, g).not.toBeNull();
      expect(ids.has(r!), `${g} ⇐ ${r} ليس في regions.ts`).toBe(true);
    }
    expect(plannerRegion("XYZ")).toBeNull();
  });
});

describe("النظام من وصف الموقع الوظيفي", () => {
  it.each([
    ["CCTV Systems", "CCTV"],
    ["Physical Security", "GATE"],
    ["Access Control Systems", "ACS"],
    ["Control Room", "CONTROL"],
    ["Perimeter Instrusion Detection System", "PIDS"],
  ] as const)("%s ⇐ %s", (d, s) => {
    expect(sapSystem(d)).toBe(s);
    expect(sapFacilityName(d)).toBeNull();
  });

  it("اسم منشأة مفردة ⇐ لا نظام، ويُحفظ اسمها موقعًا", () => {
    expect(sapSystem("Reference Customer Service Office")).toBeNull();
    expect(sapFacilityName("  Reference  Customer Service Office ")).toBe(
      "Reference Customer Service Office",
    );
  });
});

describe("الحالة والمرحلة — من حالتي المستخدم والنظام معًا", () => {
  it("المُنجز ١٠٠٪ ولو حمل علامة حذف (أرشفة بعد الإنجاز)", () => {
    expect(sapStatus("Completed", "CLSD DLFL NMAT PRC  SETC")).toEqual({
      status: "completed",
      stage: "closed",
    });
  });

  it("قيد التنفيذ ⇐ «الفني في الموقع» لا أبعد", () => {
    expect(sapStatus("In Progress", "REL  GMPS NMAT PRC  SETC")).toEqual({
      status: "open",
      stage: "on_site",
    });
  });

  it("PLAN مغلقٌ دون إنجاز وعليه علامة حذف ⇐ ملغى (تصحيح الخريطة السابقة)", () => {
    expect(sapStatus("PLAN", "CLSD DLFL NCMP NMAT PRC")).toEqual({
      status: "cancelled",
      stage: "registered",
    });
    expect(sapStatus("PLAN", "CRTD NMAT")).toEqual({ status: "open", stage: "registered" });
  });

  it("حالةٌ مجهولة ⇐ null يُتخطّى ويُبلَّغ", () => {
    expect(sapStatus("Waiting", "REL")).toBeNull();
  });
});

describe("الأولوية والمنشئ", () => {
  it("High*/Medium* ⇐ عالية/متوسطة، والفراغ «لم تُحدَّد» لا «متوسطة»", () => {
    expect(sapPriority("High (8H)")).toBe("high");
    expect(sapPriority("High (2D+8H)")).toBe("high");
    expect(sapPriority("Medium (48H)")).toBe("medium");
    expect(sapPriority(null)).toBeNull();
  });

  it("رقمٌ من ٥–٦ أرقام رقمٌ وظيفي، ورمز IP خطةٌ آلية لا موظف", () => {
    expect(sapEnteredBy(12345)).toEqual({ staff: "12345", planGenerated: false });
    expect(sapEnteredBy("123456")).toEqual({ staff: "123456", planGenerated: false });
    expect(sapEnteredBy("IP1020250101")).toEqual({ staff: null, planGenerated: true });
    expect(sapEnteredBy("1234")).toEqual({ staff: null, planGenerated: false });
  });
});
