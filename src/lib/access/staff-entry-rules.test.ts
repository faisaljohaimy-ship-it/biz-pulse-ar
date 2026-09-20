/**
 * قواعد الدخول — **الرقم والمنطقة معًا** (أمر المالك ٢٠٢٦/٠٩/٢٠).
 *
 * الخطر هنا أن يُفتح الباب بأقلّ مما اشتُرط: رقمٌ بأربعة أو بسبعة، أو رقمٌ
 * صحيح بلا منطقة. وكلّها تمرّ صامتةً وتُسجَّل «دخولًا صحيحًا».
 */
import { describe, expect, it } from "vitest";
import {
  ERR_REGION_REQUIRED,
  ERR_STAFF_DIGITS,
  ERR_STAFF_LENGTH,
  ERR_STAFF_REQUIRED,
  STAFF_NUMBER_MAX,
  STAFF_NUMBER_MIN,
  normalizeStaffNumber,
  validateEntry,
  validateStaffNumber,
} from "./staff-entry";

describe("طول الرقم — خمسة أو ستة لا غير", () => {
  it("الحدّان هما ٥ و٦", () => {
    expect(STAFF_NUMBER_MIN).toBe(5);
    expect(STAFF_NUMBER_MAX).toBe(6);
  });

  it("يقبل خمسة وستّة", () => {
    expect(validateStaffNumber("10254")).toBeNull();
    expect(validateStaffNumber("102540")).toBeNull();
  });

  it("**ويردّ ما دونهما وما فوقهما** — وهذا ما كان مفتوحًا قبل اليوم", () => {
    for (const bad of ["1", "12", "123", "1234", "1234567", "123456789012"]) {
      expect(validateStaffNumber(bad), bad).toBe(ERR_STAFF_LENGTH);
    }
  });

  it("والفراغ يُردّ برسالة «مطلوب» لا «طول»", () => {
    expect(validateStaffNumber("")).toBe(ERR_STAFF_REQUIRED);
    expect(validateStaffNumber("   ")).toBe(ERR_STAFF_REQUIRED);
  });
});

describe("أرقام إنجليزية — والنتيجة المحفوظة لاتينية دائمًا", () => {
  it("يردّ الحروف والرموز", () => {
    for (const bad of ["abcde", "10a54", "102-54", "١٠٢٥٤x"]) {
      expect(validateStaffNumber(bad), bad).toBe(ERR_STAFF_DIGITS);
    }
  });

  it("والمكتوب بلوحةٍ عربية يُطبَّع إلى الإنجليزية فيُقبل ويُحفظ لاتينيًّا", () => {
    // القرار: لا يُطرد صاحب اللوحة العربية؛ المضمون أن **المحفوظ** إنجليزي.
    // وبغير التطبيع يُحسب «١٠٢٥٤» و«10254» موظفَين اثنين في السجلّ نفسه.
    expect(normalizeStaffNumber("١٠٢٥٤")).toBe("10254");
    expect(validateStaffNumber("١٠٢٥٤")).toBeNull();
    expect(normalizeStaffNumber("۱۰۲۵۴")).toBe("10254");
  });

  it("والتطبيع لا يُنقذ طولًا خاطئًا", () => {
    expect(validateStaffNumber("١٢٣")).toBe(ERR_STAFF_LENGTH);
  });
});

describe("المنطقة شرطٌ للدخول لا زينة", () => {
  it("رقمٌ صحيح بلا منطقة **لا يفتح الباب**", () => {
    expect(validateEntry({ staffNumber: "10254", region: null })).toBe(ERR_REGION_REQUIRED);
    expect(validateEntry({ staffNumber: "10254", region: undefined })).toBe(ERR_REGION_REQUIRED);
    expect(validateEntry({ staffNumber: "10254", region: "" })).toBe(ERR_REGION_REQUIRED);
  });

  it("ومنطقةٌ مجهولة تُردّ — لا يُمرَّر نصٌّ خام", () => {
    for (const bad of ["north", "CENTRAL", "central; drop", "../western"]) {
      expect(validateEntry({ staffNumber: "10254", region: bad }), bad).toBe(ERR_REGION_REQUIRED);
    }
  });

  it("والمناطق الأربع تفتح الباب مع رقمٍ صحيح", () => {
    for (const r of ["central", "western", "eastern", "southern"]) {
      expect(validateEntry({ staffNumber: "102540", region: r }), r).toBeNull();
    }
  });

  it("**وخطأ الرقم يسبق خطأ المنطقة** — يُصحَّح حقلٌ واحد في المرّة", () => {
    expect(validateEntry({ staffNumber: "12", region: null })).toBe(ERR_STAFF_LENGTH);
  });
});
