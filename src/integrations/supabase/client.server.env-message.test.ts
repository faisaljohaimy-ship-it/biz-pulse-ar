// @vitest-environment node
/**
 * رسالة غياب متغيّرات Supabase على الخادم تُحيل إلى متغيّرات بيئة النشر — لا إلى «Lovable Cloud».
 * العبارة نفسها في `auth-middleware.ts` و`optional-auth-middleware.ts`؛ فلا ثلاثُ صيغٍ لعطلٍ واحد.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("client.server: رسالة الإعداد الناقص", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.restoreAllMocks();
  });

  it("تسمّي المتغيّرات الناقصة وتحيل إلى بيئة النشر ولا تذكر لوفيبل", async () => {
    const { supabaseAdmin } = await import("./client.server");

    let message = "";
    try {
      void supabaseAdmin.from;
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }

    expect(message).toContain("SUPABASE_URL");
    expect(message).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(message).toContain("Environment Variables");
    expect(message).not.toMatch(/lovable/i);
  });
});
