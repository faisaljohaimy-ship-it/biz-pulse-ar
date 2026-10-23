import { describe, expect, it } from "vitest";
import {
  PRIMARY_COOLDOWN_DEFAULT_MS,
  PRIMARY_COOLDOWN_MAX_MS,
  PRIMARY_COOLDOWN_MIN_MS,
  coolPrimary,
  createSadeedBackupModel,
  isSadeedBackupEnabled,
  primaryCoolingDown,
  primaryCooldownFor,
  retryAfterMs,
} from "./backup-provider.server";

const NOW = 1_700_000_000_000;

describe("Retry-After من خطأ المزوّد", () => {
  it("ثوانٍ ⇐ مللي ثانية، بأيّ حالة أحرف للترويسة", () => {
    expect(retryAfterMs({ responseHeaders: { "retry-after": "120" } }, NOW)).toBe(120_000);
    expect(retryAfterMs({ responseHeaders: { "Retry-After": "7" } }, NOW)).toBe(7_000);
    expect(retryAfterMs({ responseHeaders: { "retry-after": "0" } }, NOW)).toBe(0);
  });

  it("تاريخ HTTP ⇐ الفرق عن الآن، ولا يكون سالبًا", () => {
    const at = new Date(NOW + 5_000).toUTCString();
    const ms = retryAfterMs({ responseHeaders: { "retry-after": at } }, NOW);
    expect(ms).toBeGreaterThanOrEqual(4_000);
    expect(ms).toBeLessThanOrEqual(5_000);
    const past = new Date(NOW - 60_000).toUTCString();
    expect(retryAfterMs({ responseHeaders: { "retry-after": past } }, NOW)).toBe(0);
  });

  it("بلا ترويسة أو بقيمةٍ مبهمة ⇐ null، ولا يرمي أبدًا", () => {
    expect(retryAfterMs(new Error("429"), NOW)).toBeNull();
    expect(retryAfterMs(null, NOW)).toBeNull();
    expect(retryAfterMs({ responseHeaders: "nope" }, NOW)).toBeNull();
    expect(retryAfterMs({ responseHeaders: { "retry-after": "soon" } }, NOW)).toBeNull();
    expect(retryAfterMs({ responseHeaders: { "retry-after": "" } }, NOW)).toBeNull();
  });
});

describe("مدّة تبريد المفتاح المباشر", () => {
  it("تحترم التلميح محصورًا بين 30 ث و10 د، وبدونه الافتراض عشر دقائق", () => {
    expect(primaryCooldownFor(new Error("429"), NOW)).toBe(PRIMARY_COOLDOWN_DEFAULT_MS);
    expect(primaryCooldownFor({ responseHeaders: { "retry-after": "5" } }, NOW)).toBe(
      PRIMARY_COOLDOWN_MIN_MS,
    );
    expect(primaryCooldownFor({ responseHeaders: { "retry-after": "3600" } }, NOW)).toBe(
      PRIMARY_COOLDOWN_MAX_MS,
    );
    expect(primaryCooldownFor({ responseHeaders: { "retry-after": "120" } }, NOW)).toBe(120_000);
  });

  it("التبريد بالمدّة المحسوبة يُسقط المفتاح المباشر حتى موعده فقط", () => {
    coolPrimary(primaryCooldownFor({ responseHeaders: { "retry-after": "120" } }, NOW), NOW);
    expect(primaryCoolingDown(NOW + 119_000)).toBe(true);
    expect(primaryCoolingDown(NOW + 120_000)).toBe(false);
  });
});

describe("البوّابة الاحتياطية اختياريّة صريحة (أمر المالك ٢٠٢٦/١٠/١٨)", () => {
  const KEY = "lovable-key-not-a-secret-000";

  it("وجود المفتاح وحده لا يبنيها — لا سقوط صامت إلى مزوّد بعدّاد", () => {
    expect(isSadeedBackupEnabled({ LOVABLE_API_KEY: KEY })).toBe(false);
    expect(createSadeedBackupModel({ LOVABLE_API_KEY: KEY })).toBeNull();
  });

  it("الطلب الصريح بلا مفتاح لا يبنيها كذلك", () => {
    expect(isSadeedBackupEnabled({ SADEED_BACKUP_PROVIDER: "lovable" })).toBe(false);
    expect(createSadeedBackupModel({ SADEED_BACKUP_PROVIDER: "lovable" })).toBeNull();
  });

  it("الطلب الصريح بالاسم مع المفتاح ⇐ تُبنى (بلا شبكة)", () => {
    const env = { SADEED_BACKUP_PROVIDER: "lovable", LOVABLE_API_KEY: KEY };
    expect(isSadeedBackupEnabled(env)).toBe(true);
    expect(createSadeedBackupModel(env)).not.toBeNull();
    expect(isSadeedBackupEnabled({ ...env, SADEED_BACKUP_PROVIDER: "openai" })).toBe(false);
  });
});
