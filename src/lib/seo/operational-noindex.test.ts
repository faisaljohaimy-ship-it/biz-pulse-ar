/**
 * منع فهرسة المسارات التشغيلية — حارس العقد (أمر المالك ٢٠٢٦/٠٩/١٨).
 *
 * `robots.txt` يمنع الزحف ولا يمنع الإدراج: صفحةٌ وصلها الزاحف من رابطٍ
 * خارجيّ تُدرج بعنوانها بلا زحف. فالوسم في الترويسة هو الضابط، وهذا
 * الحارس يُبقي الاثنين متوافقين.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isOperationalRoute, OPERATIONAL_PREFIXES } from "./operational-noindex";

describe("① المسارات التشغيلية تُمنع، والجذر يبقى", () => {
  it("الجذر مفهرس — سطحٌ تسويقيّ مقصود", () => {
    expect(isOperationalRoute("/")).toBe(false);
    expect(isOperationalRoute("")).toBe(false);
  });

  it.each([
    "/sec",
    "/sec/maintenance",
    "/sec/contractors",
    "/settings",
    "/settings/microsoft",
    "/assistant",
    "/assistant/abc123",
    "/login",
    "/auth",
    "/admin",
    "/agents",
    "/urgent-ops",
    "/executive-reports",
    "/boardroom",
    "/files",
    "/governance",
    "/ptw",
    "/hajj",
    "/sadeed-analytics",
    "/nx-ops",
  ])("%s ممنوع من الفهرسة", (path) => {
    expect(isOperationalRoute(path)).toBe(true);
  });

  it("والمائلة الختامية لا تفتح ثغرة — `/sec/` و`/sec` مكانٌ واحد", () => {
    expect(isOperationalRoute("/sec/")).toBe(true);
    expect(isOperationalRoute("/settings/")).toBe(true);
  });

  it("ولا يُمنع ما ليس تشغيليًّا", () => {
    for (const p of ["/blueprint", "/contact", "/aup", "/book", "/customers"]) {
      expect(isOperationalRoute(p), `${p} مُنع بلا سبب`).toBe(false);
    }
  });
});

describe("② الوسم مركَّب والملفّ متوافق معه", () => {
  it("الجذر يحقن `noindex, nofollow` على المسار التشغيلي", () => {
    const root = readFileSync("src/routes/__root.tsx", "utf8");
    expect(root).toContain("isOperationalRoute(pathname)");
    expect(root).toMatch(/name="robots" content="noindex, nofollow"/);
  });

  it("و`robots.txt` يمنع البادئات نفسها — لا ملفٌّ يسمح ووسمٌ يمنع", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    // البادئات التي لها مسارٌ حقيقيّ في المنتج تُمنع في الملفّ أيضًا.
    for (const prefix of ["/sec", "/settings", "/assistant", "/login", "/admin", "/files"]) {
      expect(robots, `${prefix} مسموحٌ في robots.txt وممنوعٌ بالوسم`).toContain(
        `Disallow: ${prefix}`,
      );
    }
    expect(robots, "الجذر يجب أن يبقى مسموحًا").toContain("Allow: /");
  });

  it("والقائمة ليست فارغة — حارسٌ على قائمة فارغة لا يحرس شيئًا", () => {
    expect(OPERATIONAL_PREFIXES.length).toBeGreaterThanOrEqual(15);
  });
});

describe("③ الإطارات — شاشة قيادة لا تُضمَّن", () => {
  it("`X-Frame-Options: DENY` و`frame-ancestors 'none'` معًا", () => {
    const start = readFileSync("src/start.ts", "utf8");
    expect(start).toMatch(/"X-Frame-Options":\s*"DENY"/);
    expect(start).toContain("frame-ancestors 'none'");
    expect(start, "عاد SAMEORIGIN").not.toMatch(/"X-Frame-Options":\s*"SAMEORIGIN"/);
  });
});
