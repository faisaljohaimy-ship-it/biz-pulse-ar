// @vitest-environment node
/**
 * عقد `vercel.json` — منطقة الدوال وسلامة بقيّة الإعداد (٢٠٢٦/١١/٠٣).
 *
 * ## لماذا يُحرس
 *
 * قاعدة Supabase في `ap-southeast-2`، ودوال Vercel كانت تعمل في `iad1` (المنطقة الافتراضية)،
 * فتدفع كل رحلةٍ إلى القاعدة عبر المحيط — و`/api/chat` للمسجَّل سبع رحلاتٍ متسلسلة قبل أول نداء
 * للنموذج. نقل المنطقة إلى `syd1` (الأقرب إلى القاعدة) أُجري في **إعدادات Vercel** لا في git:
 * فأي نشرٍ من مسارٍ آخر كان سيعود إلى المنطقة الافتراضية بصمت. التثبيت في `vercel.json` يجعل
 * المنطقة جزءًا من الشيفرة المراجَعة. الأثر على الزمن **يُقاس من سطر `[api/chat] timing`**
 * (حقل `region` من `VERCEL_REGION`) بعد النشر — لا يُدّعى هنا.
 *
 * والحارس يقرأ الملف نفسه لا يتحقق من نصّه: JSON صالح، ومنطقةٌ واحدة بالضبط، وبقيّة ما كان
 * قائمًا (ترويسات الأمان وتعطيل نشر main وأوامر البناء) لم يُمسّ.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const RAW = readFileSync("vercel.json", "utf8");
const CONFIG = JSON.parse(RAW) as {
  regions?: unknown;
  framework?: unknown;
  buildCommand?: unknown;
  installCommand?: unknown;
  git?: { deploymentEnabled?: Record<string, unknown> };
  headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
};

describe("vercel.json — منطقة الدوال", () => {
  it("JSON صالح (الاستيراد أعلاه لم يرمِ) وبلا مفاتيح مكرَّرة على المستوى الأعلى", () => {
    expect(typeof CONFIG).toBe("object");
    const topLevelKeys = [...RAW.matchAll(/^ {2}"([^"]+)":/gm)].map((m) => m[1]);
    expect(new Set(topLevelKeys).size, "مفتاحٌ مكرَّر يُسقط الأول بصمت").toBe(topLevelKeys.length);
  });

  it("regions = ['syd1'] بالضبط — منطقةٌ واحدة، الأقرب لقاعدة ap-southeast-2", () => {
    expect(CONFIG.regions).toEqual(["syd1"]);
  });
});

describe("vercel.json — ما كان قائمًا لم يُمسّ", () => {
  it("نشر main معطَّل، والبناء والتثبيت والإطار كما كانت", () => {
    expect(CONFIG.git?.deploymentEnabled).toEqual({ main: false });
    expect(CONFIG.buildCommand).toBe("npm run build");
    expect(CONFIG.installCommand).toBe("npm ci --no-audit --no-fund");
    expect(CONFIG.framework).toBeNull();
  });

  it("ترويسات الأمان السبع على كل المسارات بقيمها", () => {
    const all = CONFIG.headers?.find((h) => h.source === "/(.*)");
    expect(all, "كتلة ترويسات /(.*) غائبة").toBeDefined();
    const byKey = Object.fromEntries(all!.headers.map((h) => [h.key, h.value]));
    expect(Object.keys(byKey).sort()).toEqual(
      [
        "Cross-Origin-Opener-Policy",
        "Cross-Origin-Resource-Policy",
        "Permissions-Policy",
        "Referrer-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
      ].sort(),
    );
    expect(byKey["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Strict-Transport-Security"]).toBe("max-age=31536000; includeSubDomains");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Cross-Origin-Opener-Policy"]).toBe("same-origin-allow-popups");
    expect(byKey["Cross-Origin-Resource-Policy"]).toBe("same-site");
    expect(byKey["Permissions-Policy"]).toContain("microphone=(self)");
  });

  it("كتل التخزين المؤقت للأصول باقية (assets · media · الصور والخطوط)", () => {
    expect(CONFIG.headers?.map((h) => h.source)).toEqual([
      "/(.*)",
      "/assets/(.*)",
      "/media/(.*)",
      "/(.*)\\.(webp|png|svg|ico|woff2)",
    ]);
  });
});
