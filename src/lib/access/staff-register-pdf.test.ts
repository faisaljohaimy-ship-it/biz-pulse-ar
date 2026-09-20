import { describe, expect, it } from "vitest";
import {
  buildStaffRegisterDoc,
  distinctStaffCount,
  formatEntryStamp,
  staffRegisterFileName,
} from "./staff-register-pdf";
import { buildPeriod } from "./staff-period";
import type { StaffEntry } from "./staff-entry";
import type { CalloutBlock, ProseBlock } from "@/lib/reports/pdf-rich";

const period = buildPeriod(2026, 2);
const rows: StaffEntry[] = [
  { staff_number: "10254", entered_at: "2026-09-20T11:35:00.000Z", path: "/sec/maintenance" },
  { staff_number: "10254", entered_at: "2026-09-19T05:02:00.000Z", path: "/ptw" },
  { staff_number: "77001", entered_at: "2026-08-01T21:00:00.000Z", path: "/" },
];

describe("صيغة الطابع الزمني", () => {
  it("تُكتب `YYYY-MM-DD HH:mm` بأرقام لاتينية وبتوقيت الرياض", () => {
    // 11:35 UTC = 14:35 بالرياض.
    expect(formatEntryStamp("2026-09-20T11:35:00.000Z")).toBe("2026-09-20 14:35");
  });

  it("والصيغة تُرتَّب نصيًّا كما تُرتَّب زمنيًّا", () => {
    const a = formatEntryStamp("2026-09-19T05:02:00.000Z");
    const b = formatEntryStamp("2026-09-20T11:35:00.000Z");
    expect(a < b).toBe(true);
  });

  it("وتاريخٌ فاسد يُكتب «—» لا `Invalid Date`", () => {
    expect(formatEntryStamp("ليس تاريخًا")).toBe("—");
  });

  it("والعبور إلى اليوم التالي بتوقيت الرياض يُحسب صحيحًا", () => {
    // 21:00 UTC = منتصف ليل اليوم التالي بالرياض.
    expect(formatEntryStamp("2026-08-01T21:00:00.000Z")).toBe("2026-08-02 00:00");
  });
});

describe("عدّ الأرقام المتمايزة", () => {
  it("يعدّ الرقم مرّةً مهما تكرّر دخوله", () => {
    expect(distinctStaffCount(rows)).toBe(2);
  });

  it("وصفرٌ على قائمة فارغة", () => {
    expect(distinctStaffCount([])).toBe(0);
  });
});

describe("وثيقة السجلّ", () => {
  it("لا تحمل شارة محاكاة أبدًا — سجلّ دخولٍ لا يُحاكى", () => {
    expect(buildStaffRegisterDoc({ rows, period }).isSimulation).toBe(false);
    expect(buildStaffRegisterDoc({ rows: [], period }).isSimulation).toBe(false);
  });

  it("وتحمل عنوان الدورة فلا يختلط نصفان", () => {
    const doc = buildStaffRegisterDoc({ rows, period });
    expect(doc.subtitle).toBe("النصف الثاني 2026 (يوليو — ديسمبر)");
    expect(staffRegisterFileName(period)).toBe("staff-access-2026-H2.pdf");
  });

  it("وتُبقي ترتيب الصفوف كما ورد — الملفّ يطابق الشاشة", () => {
    const doc = buildStaffRegisterDoc({ rows, period });
    const table = doc.sections[1].blocks[0] as { rows: Array<Record<string, unknown>> };
    expect(table.rows.map((r) => r.staff_number)).toEqual(["10254", "10254", "77001"]);
  });

  it("وتكتب التحفّظ على معنى السجلّ في الملفّ نفسه", () => {
    // الورقة تُتداول بعد أن تُغلق الشاشة، فالتحفّظ يسافر معها.
    const doc = buildStaffRegisterDoc({ rows, period });
    const callouts = doc.sections[0].blocks.filter((b): b is CalloutBlock => b.kind === "callout");
    expect(callouts.length).toBeGreaterThan(0);
    expect(callouts[0].text).toMatch(/لا يُقارن بسجلّ الموظفين/);
  });

  it("وتُعلن النقص حين تبلغ القراءة سقفها", () => {
    const doc = buildStaffRegisterDoc({ rows, period, truncated: true });
    const texts = doc.sections[0].blocks
      .filter((b): b is CalloutBlock => b.kind === "callout")
      .map((b) => b.title);
    expect(texts).toContain("قائمة ناقصة");
  });

  it("والدورة الفارغة تقول «لا دخول» لا تُترك بلا نصّ", () => {
    const doc = buildStaffRegisterDoc({ rows: [], period });
    const prose = doc.sections[0].blocks.find((b): b is ProseBlock => b.kind === "prose");
    expect(prose?.text).toBe("لا دخول مسجَّل في هذه الدورة.");
  });
});
