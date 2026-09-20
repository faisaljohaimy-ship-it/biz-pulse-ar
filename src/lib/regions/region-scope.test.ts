/**
 * عقد نطاق المنطقة.
 *
 * الخطر هنا صامت: سطحٌ يعرض أرقامًا عالمية تحت عنوان منطقة لا يسقط شيئًا
 * ولا يرمي خطأ — يُقرأ صحيحًا وهو كذب. فالمحروس أن **لكل سطحٍ تصريحًا**،
 * وأن ما لا ينحصر يُفصح عنه.
 */
import { describe, expect, it } from "vitest";
import { REGIONS } from "@/lib/regions";
import {
  REGION_PARAM,
  REGION_STRATEGY,
  crossRegionNotice,
  isDbScoped,
  isRegionId,
  regionColumnOf,
  resolveRegionScope,
  strategyOf,
  type RegionSurface,
} from "./region-scope";

describe("أسبقية النطاق — العنوان ثمّ التفضيل ثمّ الافتراضي", () => {
  it("العنوان يغلب التفضيل المحفوظ", () => {
    expect(resolveRegionScope({ fromUrl: "eastern", fromStorage: "southern" })).toBe("eastern");
  });

  it("والتفضيل يعمل حين لا وسيط في العنوان", () => {
    expect(resolveRegionScope({ fromUrl: null, fromStorage: "southern" })).toBe("southern");
  });

  it("والافتراضي حين لا هذا ولا ذاك", () => {
    expect(resolveRegionScope({})).toBe("central");
  });

  it("**ووسيطٌ مجهول يسقط ولا يُمرَّر** — لا يصير مدخلُ عنوانٍ نطاقَ استعلام", () => {
    for (const bad of ["", "drop table", "CENTRAL", "north", "central; --", "../central"]) {
      expect(resolveRegionScope({ fromUrl: bad, fromStorage: null }), bad).toBe("central");
    }
  });

  it("وتخزينٌ فاسد يسقط كذلك", () => {
    expect(resolveRegionScope({ fromUrl: null, fromStorage: "{}" })).toBe("central");
  });

  it("وكل منطقةٍ في `regions.ts` مقبولة — القائمة مصدرٌ واحد", () => {
    for (const r of REGIONS) {
      expect(isRegionId(r.id)).toBe(true);
      expect(resolveRegionScope({ fromUrl: r.id })).toBe(r.id);
    }
  });

  it("واسم الوسيط عقدٌ حيّ — تغييره يُيتّم كل رابطٍ مُرسَل", () => {
    expect(REGION_PARAM).toBe("region");
  });
});

describe("سجلّ الاستراتيجيات — لا سطح بلا تصريح", () => {
  const surfaces = Object.keys(REGION_STRATEGY) as RegionSurface[];

  it("السجلّ مقروءٌ وغير فارغ — حارسٌ على سجلٍّ فارغ لا يحرس", () => {
    expect(surfaces.length).toBeGreaterThan(5);
  });

  it("ولكل سطحٍ نوعٌ من الأربعة المعروفة", () => {
    for (const s of surfaces) {
      expect(["db-region", "db-region-code", "reference", "cross-region"]).toContain(
        strategyOf(s).kind,
      );
    }
  });

  it("**وما لا ينحصر يحمل سببًا مكتوبًا** — رقمٌ عامّ بلا بيانٍ يُقرأ رقمَ المنطقة", () => {
    for (const s of surfaces) {
      const st = strategyOf(s);
      if (st.kind === "reference" || st.kind === "cross-region") {
        expect(st.why.length, `${s} بلا سبب`).toBeGreaterThan(20);
      }
    }
  });

  it("وما يُرشَّح في القاعدة يسمّي جدوله وعموده", () => {
    for (const s of surfaces) {
      if (!isDbScoped(s)) continue;
      const st = strategyOf(s);
      expect("table" in st && st.table.length > 0).toBe(true);
      expect(regionColumnOf(s)).toMatch(/^region(_code)?$/);
    }
  });

  it("وغير المُرشَّح لا عمود له — فلا يُبنى عليه استعلام", () => {
    expect(regionColumnOf("sec_overview")).toBeNull();
    expect(regionColumnOf("staff_access_log")).toBeNull();
  });
});

describe("الإفصاح عن غير المنحصر", () => {
  it("سجلّ الدخول يُفصح أنه لكل المناطق", () => {
    const n = crossRegionNotice("staff_access_log");
    expect(n).toContain("لكل المناطق");
  });

  it("ولا إفصاح على ما ينحصر فعلًا — إفصاحٌ في غير موضعه يُفقده معناه", () => {
    expect(crossRegionNotice("permits")).toBeNull();
    expect(crossRegionNotice("hcis_findings")).toBeNull();
  });

  it("والمرجعيّ ليس «لكل المناطق» — هو بيانات المنطقة من مجموعةٍ مرجعية", () => {
    // تمييزٌ مقصود: `reference` ينحصر فعلًا لكن مصدره مرجعيّ لا قاعدة.
    expect(crossRegionNotice("sec_overview")).toBeNull();
    expect(strategyOf("sec_overview").kind).toBe("reference");
  });
});
