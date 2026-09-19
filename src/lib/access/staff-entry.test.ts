/**
 * الرقم الوظيفي — حارس العقد (أمر المالك ٢٠٢٦/٠٩/١٩).
 *
 * أثقل ما يُحرَس هنا **ما ليست عليه هذه البوابة**: أنها إسنادٌ لا مصادقة.
 * فبندٌ صريح أدناه يمنع أن تُقرأ يومًا حراسةً، أو أن تحجب الدخول حين
 * يتعثّر سجلّها — وكلاهما تحوّلٌ صامت لا يُسقط بناءً ولا نوعًا.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  ERR_STAFF_DIGITS,
  ERR_STAFF_LENGTH,
  ERR_STAFF_REQUIRED,
  STAFF_NUMBER_KEY,
  isGatedRoute,
  normalizeStaffNumber,
  validateStaffNumber,
} from "./staff-entry";

const read = (p: string) => readFileSync(p, "utf8");

describe("① التطبيع — رقمٌ واحد لا رقمان", () => {
  it("الأرقام العربية-الهندية تُوحَّد إلى اللاتينية", () => {
    // لوحة المفاتيح العربية تكتب ٠١٢٣؛ وبغير التطبيع يُحسب الموظف مرّتين.
    expect(normalizeStaffNumber("١٢٣٤٥")).toBe("12345");
    expect(normalizeStaffNumber("۱۲۳۴۵")).toBe("12345");
    expect(normalizeStaffNumber("12345")).toBe("12345");
  });

  it("والفراغات وعلامات الاتجاه والشُرَط تسقط", () => {
    expect(normalizeStaffNumber("  102 54 ")).toBe("10254");
    expect(normalizeStaffNumber("10-254")).toBe("10254");
    expect(normalizeStaffNumber("‏10254‎")).toBe("10254");
  });
});

describe("② التحقّق — برسائل عربية", () => {
  it("الفارغ مرفوض", () => {
    expect(validateStaffNumber("")).toBe(ERR_STAFF_REQUIRED);
    expect(validateStaffNumber("   ")).toBe(ERR_STAFF_REQUIRED);
  });

  it("وغير الرقمي مرفوض", () => {
    expect(validateStaffNumber("abc12")).toBe(ERR_STAFF_DIGITS);
    expect(validateStaffNumber("102a4")).toBe(ERR_STAFF_DIGITS);
  });

  it("والطول خارج المدى مرفوض", () => {
    expect(validateStaffNumber("12")).toBe(ERR_STAFF_LENGTH);
    expect(validateStaffNumber("1234567890123")).toBe(ERR_STAFF_LENGTH);
  });

  it("والصحيح يمرّ — بالعربية كما باللاتينية", () => {
    expect(validateStaffNumber("10254")).toBeNull();
    expect(validateStaffNumber("١٠٢٥٤")).toBeNull();
    expect(validateStaffNumber("123")).toBeNull();
  });

  it("وكل رسالة عربية — لا نصّ تقنيّ يصل المستخدم", () => {
    for (const m of [ERR_STAFF_REQUIRED, ERR_STAFF_DIGITS, ERR_STAFF_LENGTH]) {
      expect(m).toMatch(/[؀-ۿ]/);
    }
  });
});

describe("③ النطاق — الشاشات التشغيلية دون الرئيسية", () => {
  it("الرئيسية مفتوحة — بوابةٌ عليها تطرد الزائر قبل أن يعرف المنتج", () => {
    expect(isGatedRoute("/")).toBe(false);
  });

  it.each(["/sec", "/sec/maintenance", "/settings", "/assistant", "/files", "/ptw"])(
    "%s يُسأل عنده",
    (p) => {
      expect(isGatedRoute(p)).toBe(true);
    },
  );

  it("والنطاق من مصدر الفهرسة نفسه — لا قائمة ثانية تفترق عنه", () => {
    const src = read("src/lib/access/staff-entry.ts");
    expect(src).toMatch(/export \{ isOperationalRoute as isGatedRoute \}/);
  });
});

describe("④ إسنادٌ لا مصادقة — وهذا ما لا يجوز أن ينقلب", () => {
  const GATE = read("src/components/access/StaffNumberGate.tsx");
  const FN = read("src/lib/access/staff-entry.functions.ts");
  const MIG = read("supabase/migrations/20260919100000_staff_access_log.sql");

  it("اللوحة تقول صراحةً إن الرقم للسجلّ لا للتحقّق", () => {
    // إخفاء ذلك يصنع مستخدمًا يظنّ نفسه محميًّا ومالكًا يظنّ السجلّ إثباتًا.
    expect(GATE).toContain("للسجلّ لا للتحقّق");
    expect(GATE).toMatch(/لا يُقارن بسجلّ الموظفين ولا يمنح صلاحية/);
  });

  it("والسجلّ لا يحجب الدخول — فشل الكتابة يُمضى بعده", () => {
    // بوابةُ إسنادٍ تحجب العمل حين تتعثّر قاعدتها عائقٌ بلا مكسب.
    expect(GATE).toMatch(/await record\(\{[\s\S]{0,120}\}\);\s*\n\s*\} catch \{/);
    expect(GATE).toMatch(/setKnown\(staff\)/);
  });

  it("والكتابة من الخادم وحده — لا امتياز كتابة لزائر", () => {
    expect(FN).toContain("supabaseAdmin");
    expect(MIG).toMatch(/revoke all on public\.staff_access_log from anon, authenticated/);
    expect(MIG, "سياسة إدراج لدور مستخدم تفتح باب التزوير").not.toMatch(/for insert/i);
  });

  it("والقراءة خلف مصادقة — السجلّ نفسه ليس عامًّا", () => {
    expect(FN).toMatch(/listStaffEntries[\s\S]{0,200}requireSupabaseAuth/);
  });

  it("والتحقّق يُعاد على الخادم — تحقّق الواجهة يُلتَفّ عليه", () => {
    expect(FN).toMatch(/validateStaffNumber\(staff_number\) !== null/);
  });

  it("والقيد في القاعدة يطابق قاعدة الواجهة", () => {
    expect(MIG).toMatch(/staff_number ~ '\^\[0-9\]\{3,12\}\$'/);
  });
});

describe("⑤ عقود لا تُكسر", () => {
  it("مفتاح التخزين ثابت — تغييره يُيتّم كل جهازٍ سجّل", () => {
    expect(STAFF_NUMBER_KEY).toBe("sadeed-staff-number");
  });

  it("والترحيل له تراجعٌ مرافق في الدفعة نفسها", () => {
    const down = read("supabase/migrations/20260919100001_staff_access_log_rollback.sql");
    expect(down).toContain("drop table if exists public.staff_access_log");
  });

  it("وصفحة السجلّ تميّز ثلاث حالات لا حالتين", () => {
    // صفر صفوفٍ بلا تمييز يجعل «لم يدخل أحد» و«السجلّ غير مفعَّل» شيئًا
    // واحدًا — وهما نقيضان (قاعدة ج-٥ في برمت المالك).
    const page = read("src/routes/_authenticated/settings.access-log.tsx");
    expect(page).toContain("السجلّ غير مفعَّل بعد");
    expect(page).toContain("لا دخول مسجَّل بعد");
    expect(page).toContain("تعذّر جلب السجلّ");
  });

  it("واللوحة مركَّبة في الجذر بنطاقها", () => {
    const root = read("src/routes/__root.tsx");
    expect(root).toMatch(/isGatedRoute\(pathname\) && \(\s*<StaffNumberGate/);
  });
});
