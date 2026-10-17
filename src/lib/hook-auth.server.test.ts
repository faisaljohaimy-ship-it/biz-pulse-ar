/**
 * المقارنة ثابتة الزمن وسرّ خطّافات cron — كان سجلّ الضوابط يسمّيهما «متحقَّقين»
 * بلا اختبار (نقض الحارس على 29f56e364، البند ١٩). هنا السلوك المقيس: الطول
 * المختلف يُرفض قبل أي مقارنة، والتطابق الجزئي يُرفض، والصحيح يمرّ؛ والخطّاف
 * يرفض السرّ غير المضبوط (503) والخاطئ (401) ويقبل الصحيح من الترويسات الثلاث.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { timingSafeStringEqual, verifyCronHookSecret } from "./hook-auth.server";

const SECRET = "a-sufficiently-long-cron-secret-value";

afterEach(() => vi.unstubAllEnvs());

describe("timingSafeStringEqual", () => {
  it("يساوي عند التطابق التامّ فقط، ويرفض الطول المختلف والتطابق الجزئي والفارغ", () => {
    expect(timingSafeStringEqual(SECRET, SECRET)).toBe(true);
    expect(timingSafeStringEqual(SECRET, SECRET.slice(0, -1))).toBe(false);
    expect(timingSafeStringEqual(SECRET, `${SECRET.slice(0, -1)}X`)).toBe(false);
    expect(timingSafeStringEqual("", "")).toBe(true);
    expect(timingSafeStringEqual("", "x")).toBe(false);
  });

  it("يفحص كل الأحرف لا يتوقّف عند أوّل اختلاف (الطفرة: `!==` أو `startsWith` تحمرّ هنا)", () => {
    // سلسلتان بطول واحد تختلفان في الحرف الأخير فقط ⇐ false؛ وفي الأوّل فقط ⇐ false.
    const a = "0123456789abcdef";
    expect(timingSafeStringEqual(a, "0123456789abcdeX")).toBe(false);
    expect(timingSafeStringEqual(a, "X123456789abcdef")).toBe(false);
    // والدالّة لا ترمي على رموز خارج ASCII.
    expect(timingSafeStringEqual("سَدِيد", "سَدِيد")).toBe(true);
    expect(timingSafeStringEqual("سَدِيد", "سَدِيدْ")).toBe(false);
  });
});

describe("verifyCronHookSecret", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://local/api/public/hooks/x", { method: "POST", headers });

  it("سرٌّ غير مضبوط أو أقصر من 16 حرفًا ⇐ 503 cron_hook_secret_not_configured", async () => {
    vi.stubEnv("CRON_HOOK_SECRET", "");
    const r1 = verifyCronHookSecret(req({ "x-cron-secret": "anything" }));
    expect(r1?.status).toBe(503);
    expect(((await r1!.json()) as { error: string }).error).toBe("cron_hook_secret_not_configured");
    vi.stubEnv("CRON_HOOK_SECRET", "short");
    expect(verifyCronHookSecret(req({ "x-cron-secret": "short" }))?.status).toBe(503);
  });

  it("سرٌّ خاطئ أو غائب ⇐ 401 unauthorized", async () => {
    vi.stubEnv("CRON_HOOK_SECRET", SECRET);
    const wrong = verifyCronHookSecret(req({ "x-cron-secret": `${SECRET}x` }));
    expect(wrong?.status).toBe(401);
    expect(((await wrong!.json()) as { error: string }).error).toBe("unauthorized");
    expect(verifyCronHookSecret(req({}))?.status).toBe(401);
    expect(verifyCronHookSecret(req({ authorization: "Bearer nope" }))?.status).toBe(401);
  });

  it("السرّ الصحيح يمرّ (null) من x-cron-secret أو x-hook-secret أو Bearer", () => {
    vi.stubEnv("CRON_HOOK_SECRET", SECRET);
    expect(verifyCronHookSecret(req({ "x-cron-secret": SECRET }))).toBeNull();
    expect(verifyCronHookSecret(req({ "x-hook-secret": SECRET }))).toBeNull();
    expect(verifyCronHookSecret(req({ authorization: `Bearer ${SECRET}` }))).toBeNull();
  });
});
