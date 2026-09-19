/**
 * حصّة الذكاء والصوت — حارس العقد (أمر المالك ٢٠٢٦/٠٩/١٨، المرحلة هـ).
 *
 * ## ما يحرسه هذا الملفّ ولا يحرسه غيره
 *
 * ثغرةُ الإنفاق ليست غياب حدٍّ — كل نقطةٍ تُنفق مالًا عليها حدّ ٦٠ ثانية
 * يفشل مغلقًا. الثغرة أن **الحدّ بالدقيقة لا يحدّ اليوم**: ثلاثون طلبًا
 * في الدقيقة مسموحةٌ أبدًا، فعنوانٌ واحد صبور يبلغ 43,200 نداء في اليوم
 * بلا كسر حدٍّ واحد. فالمحروس هنا **بقاء البُعد اليوميّ والعامّ**، لا
 * وجود حدٍّ ما.
 *
 * وسقوط أيٍّ منهما لا يُسقط `tsc` ولا `eslint` ولا اختبارًا سلوكيًّا: حذف
 * سطرٍ من نقطةٍ واحدة يترك السبع الأخريات خضراء والفاتورة مفتوحة.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const read = (p: string) => readFileSync(p, "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, "");

const QUOTA = strip(read("src/lib/governance/ai-quota.server.ts"));
const RATE = strip(read("src/lib/governance/rate-limit.server.ts"));

/** كل نقطةٍ تنفق مالًا — وسطحها المتوقَّع. */
const SPENDERS: ReadonlyArray<readonly [string, string]> = [
  ["src/routes/api/public/sadeed-tts.ts", "tts"],
  ["src/routes/api/sadeed/tts.ts", "tts"],
  ["src/routes/api/public/sadeed-transcribe.ts", "stt"],
  ["src/routes/api/public/sadeed-stream.ts", "chat"],
  ["src/routes/api/public/sadeed-ask.ts", "chat"],
  ["src/routes/api/public/sadeed-explain.ts", "chat"],
  ["src/routes/api/chat.ts", "chat"],
];

describe("① كل نقطة تُنفق مالًا محروسة بالحصّة اليومية", () => {
  it.each(SPENDERS)("%s محروسة بسطح %s", (path, surface) => {
    const src = strip(read(path));
    expect(src, `${path} بلا بوابة حصّة`).toContain("enforceAiQuota");
    expect(src).toMatch(new RegExp(`surface:\\s*"${surface}"`));
    // والبوابة تُوقف النداء فعلًا لا تُحسب وتمضي.
    expect(src, `${path} يستدعي البوابة ولا يردّ استجابتها`).toMatch(/if \(quota\) return quota;/);
  });

  it.each(SPENDERS)("%s تفحص مفتاح الإيقاف قبل أي شبكة", (path, surface) => {
    // قِيس على خادمٍ حيّ: حين كان الفحص داخل `enforceAiQuota` وحدها — وهي
    // بعد حدّ المعدل الذي يستعلم القاعدة — أعطى رفعُ المفتاح **502** لا
    // 503، لأن الاستعلام سقط أوّلًا وابتلعه `catch` الخارجي. فاللحظة التي
    // يُحتاج فيها الإيقاف أكثر (قاعدة متعثّرة) هي التي كان يصمت فيها.
    const src = strip(read(path));
    expect(src, `${path} بلا حارس إيقاف متزامن`).toMatch(
      new RegExp(`aiDisabledResponse\\("${surface}"\\)`),
    );
    expect(src).toMatch(/if \(off\) return off;/);

    // **القياس داخل المُعالِج وحده.** أوّل صياغةٍ قاست موضع النصّ في
    // الملفّ كلّه، فأسقطت `sadeed-tts` ظلمًا: دالّتها المساعدة `synthesize`
    // تحمل `await fetch(` وتُعرَّف **فوق** المسار. فالشريحة تبدأ من
    // `POST:` — وحارسٌ يقيس خارج نطاقه يكذب في الاتجاهين.
    const handlerAt = src.indexOf("POST: async");
    expect(handlerAt, `${path} بلا معالج POST`).toBeGreaterThan(-1);
    const handler = src.slice(handlerAt);

    const offAt = handler.indexOf("aiDisabledResponse(");
    const netAt = Math.min(
      ...[
        handler.indexOf("enforceRateLimit("),
        handler.indexOf("enforceAiQuota("),
        handler.indexOf("await fetch("),
      ]
        .filter((i) => i > -1)
        .concat([Number.MAX_SAFE_INTEGER]),
    );
    expect(offAt, `${path} يفحص المفتاح بعد أوّل نداء شبكة`).toBeLessThan(netAt);
  });

  it("ولا نقطة تستدعي مزوّدًا خارج هذه القائمة بلا حصّة", () => {
    // الحارس يتقادم إن أُضيفت نقطةٌ سادسة تنفق مالًا ولم تُدرج. القائمة
    // تُشتقّ من الشيفرة لا تُكتب يدويًّا: كل ملفّ يستدعي مزوّدًا شبكيًّا.
    const found = execSync(
      "grep -rl 'api.elevenlabs.io\\|generativelanguage.googleapis.com\\|api.anthropic.com' src/routes/api --include=*.ts || true",
      { encoding: "utf8" },
    )
      .split("\n")
      .filter((f) => f && !f.includes(".test."));
    const guarded = new Set(SPENDERS.map(([p]) => p));
    // `voice-diagnostics` استثناء معلن: مصادَق ولا يولّد صوتًا — يقرأ
    // رصيد الحساب وبيانات الصوت، فلا يُنفق أحرفًا.
    const allowed = new Set([...guarded, "src/routes/api/voice-diagnostics.ts"]);
    for (const f of found) {
      expect(allowed.has(f), `${f} يستدعي مزوّدًا ولا حصّة عليه`).toBe(true);
    }
  });
});

describe("② البُعدان اللذان لا يوجدان في حدّ الدقيقة", () => {
  it("سقفٌ يوميّ لكل هوية **وسقفٌ عامّ للمشروع** معًا", () => {
    expect(QUOTA).toMatch(/ai-daily-global:/);
    expect(QUOTA).toMatch(/ai-daily-id:/);
    expect(QUOTA).toContain("DAY_SECONDS");
    expect(QUOTA).toMatch(/DAY_SECONDS\s*=\s*86_?400/);
  });

  it("والعامّ يُفحص قبل الهوية — لا استعلام لكل زائر بعد استنفاده", () => {
    expect(QUOTA.indexOf("ai-daily-global:")).toBeLessThan(QUOTA.indexOf("ai-daily-id:"));
  });

  it("والمفتاح يحمل تاريخ اليوم — وإلا انزلقت النافذة ولم تُصفَّر", () => {
    // نافذة 86400 وحدها تصير «٢٤ ساعة من آخر تصفير» لا «اليوم»، فتكذب
    // الرسالة التي تَعِد بعودة الحصّة عند منتصف الليل.
    expect(QUOTA).toContain("dayKey()");
    expect(QUOTA).toMatch(/toISOString\(\)\.slice\(0, 10\)/);
  });
});

describe("③ يفشل مغلقًا — والصمت ليس خيارًا", () => {
  it("تعذّر التحقّق ⇒ منعٌ لا سماح", () => {
    expect(RATE).toMatch(/return \{ allowed: false, unavailable: true \}/);
    expect(QUOTA).toMatch(/if \(globalGate\.unavailable\)/);
    expect(QUOTA).toMatch(/if \(identityGate\.unavailable\)/);
  });

  it("وكل ردّ منعٍ يحمل رسالة عربية — لا JSON تقنيًّا عاريًا", () => {
    const bodies = [...QUOTA.matchAll(/arabicResponse\(\s*\d+,\s*"[\w_]+",\s*([^,]+),/g)].map(
      (m) => m[1],
    );
    expect(bodies.length, "لم تُقرأ ردود المنع").toBeGreaterThanOrEqual(4);
    for (const b of bodies) {
      expect(b, `ردٌّ بلا نصّ عربي: ${b}`).toMatch(/[؀-ۿ]/);
    }
    expect(QUOTA).toContain("charset=utf-8");
  });

  it("و`Retry-After` صادق — ثوانٍ حتى منتصف الليل لا ٦٠ ثابتة", () => {
    expect(QUOTA).toContain("secondsUntilMidnight");
  });
});

describe("④ مفتاح الإيقاف الفوري — بلا نشر", () => {
  it("متغيّر بيئة يُطفئ الصوت والمساعد", () => {
    expect(QUOTA).toContain("SADEED_AI_DISABLED");
    expect(QUOTA).toContain("aiKillSwitchOn");
  });

  it("ويُفحص أوّلًا — قبل أي استعلام قاعدة", () => {
    expect(QUOTA.indexOf("aiKillSwitchOn()")).toBeLessThan(QUOTA.indexOf("enforceRateLimit("));
  });

  it("والسقوف تُضبط من البيئة بلا نشر", () => {
    for (const v of [
      "SADEED_TTS_DAILY_PER_IDENTITY",
      "SADEED_TTS_DAILY_GLOBAL",
      "SADEED_CHAT_DAILY_GLOBAL",
      "SADEED_STT_DAILY_GLOBAL",
    ]) {
      expect(QUOTA, `السقف ${v} غير قابل للضبط`).toContain(v);
    }
  });
});

describe("⑤ المحاسبة ليست بوابة", () => {
  it("كتابة سجلّ الاستهلاك لا تحجب ولا تُسقط النداء", () => {
    // الجدول يأتي بترحيلٍ غير مطبَّق بعد؛ فكتابةٌ تفشل يجب ألّا تُسقط
    // نداء مستخدم. و`void` تمنع انتظارها أصلًا.
    expect(QUOTA).toMatch(/void recordUsage\(/);
    expect(QUOTA).toMatch(/try \{[\s\S]*ai_usage_log[\s\S]*\} catch \{/);
  });

  it("وترحيل الجدول له تراجعٌ مرافق في الدفعة نفسها", () => {
    const up = read("supabase/migrations/20260918100000_ai_usage_log.sql");
    const down = read("supabase/migrations/20260918100001_ai_usage_log_rollback.sql");
    expect(up).toContain("create table if not exists public.ai_usage_log");
    expect(up).toContain("enable row level security");
    expect(down).toContain("drop table if exists public.ai_usage_log");
    // ولا يُكتب السجلّ إلا من الخادم: لا امتياز كتابة لمستخدم.
    expect(up).toMatch(/revoke all on public\.ai_usage_log from anon, authenticated/);
  });
});
