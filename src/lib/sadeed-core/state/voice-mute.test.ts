/**
 * حارس الكتم — طلب المالك «ونقدر نصمته».
 *
 * الاختبار يثبت الشيء الذي يسهل أن ينكسر بصمت: أن الكتم يمنع **منح قناة
 * الصوت نفسها**، لا أن يخفض عنصر صوت واحدًا في مكوّن واحد. لو انتقل الفحص
 * يومًا من `SadeedAudioBus.acquire` إلى مكوّن، لَنطق كل مصدر لا يمرّ بذلك
 * المكوّن من خلف زرّ يقول «مكتوم» — وهذا ما يمسكه هذا الملف.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  SADEED_VOICE_MUTED_STORAGE_KEY,
  isSadeedVoiceMuted,
  setSadeedVoiceMuted,
  subscribeSadeedVoiceMute,
  toggleSadeedVoiceMuted,
} from "./voice-mute";
import { SadeedAudioBus } from "@/lib/sadeed/audio-bus";

/**
 * التعليقات تُنزع قبل أي فحص سلبي — وهو الدرس نفسه المكتوب في حارس الهوية:
 * الملفات هنا **تشرح** ما تمنعه («‏`speechSynthesis` ممنوع»، «لا `position:
 * fixed`»)، فلو فُحص النصّ خامًا لَسقطت الجملة التي تصف القاعدة بالقاعدة
 * نفسها. المقصود ما يصل إلى الترميز، لا ما يرويه تعليق.
 */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const source = (path: string) => stripComments(readFileSync(join(process.cwd(), path), "utf8"));

describe("كتم صوت المساعد", () => {
  beforeEach(() => {
    setSadeedVoiceMuted(false);
    SadeedAudioBus.stopAll();
  });

  it("يبدأ ناطقًا — لا يُكتم أحد من غير طلبه", () => {
    expect(isSadeedVoiceMuted()).toBe(false);
  });

  it("يحفظ الاختيار في التخزين بالمفتاح القائم", () => {
    setSadeedVoiceMuted(true);
    expect(window.localStorage.getItem(SADEED_VOICE_MUTED_STORAGE_KEY)).toBe("1");
    setSadeedVoiceMuted(false);
    expect(window.localStorage.getItem(SADEED_VOICE_MUTED_STORAGE_KEY)).toBe("0");
    // المفتاح عقد حيّ: إعادة تسميته تُيتّم تفضيل مستخدم قائم.
    expect(SADEED_VOICE_MUTED_STORAGE_KEY).toBe("aria-voice-muted");
  });

  it("يبلّغ المشتركين عند كل تبدّل فقط", () => {
    const seen: boolean[] = [];
    const off = subscribeSadeedVoiceMute((m) => seen.push(m));
    setSadeedVoiceMuted(true);
    setSadeedVoiceMuted(true); // نفس القيمة ⇐ لا حدث
    expect(toggleSadeedVoiceMuted()).toBe(false);
    off();
    setSadeedVoiceMuted(true); // بعد إلغاء الاشتراك ⇐ لا حدث
    expect(seen).toEqual([true, false]);
  });

  it("يمنع الناقل من منح القناة لأي مصدر صوت", () => {
    SadeedAudioBus.unlock();
    expect(SadeedAudioBus.acquire("chat-tts", () => {})).toBe(true);
    SadeedAudioBus.release("chat-tts");

    setSadeedVoiceMuted(true);
    for (const src of [
      "chat-tts",
      "agent-tts",
      "conversation-greeting",
      "hero-soundtrack",
    ] as const) {
      expect(SadeedAudioBus.acquire(src, () => {})).toBe(false);
    }
    expect(SadeedAudioBus.currentSource()).toBeNull();
  });

  it("يقطع الجملة الجارية لحظة الكتم — لا ينتظر نهايتها", () => {
    SadeedAudioBus.unlock();
    let stopped = false;
    expect(
      SadeedAudioBus.acquire("chat-tts", () => {
        stopped = true;
      }),
    ).toBe(true);
    setSadeedVoiceMuted(true);
    expect(stopped).toBe(true);
    expect(SadeedAudioBus.currentSource()).toBeNull();
  });

  it("لا يستبدل مزوّدًا ولا يستدعي نطق المتصفح", () => {
    // الكتم يمنع الصوت، ولا يفتح بابًا خلفيًّا لصوت آخر.
    for (const file of [
      "src/lib/sadeed-core/state/voice-mute.ts",
      "src/components/sadeed/SadeedMuteToggle.tsx",
      "src/components/sadeed/SadeedStagePresence.tsx",
    ]) {
      expect(source(file)).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/);
    }
  });
});

describe("زرّ الكتم — عقد الوصول", () => {
  const toggle = source("src/components/sadeed/SadeedMuteToggle.tsx");

  it("زرّ تبديل معلَن الحالة بـ aria-pressed", () => {
    expect(toggle).toContain("aria-pressed={muted}");
  });

  it("هدف لمس ٤٤×٤٤ فأكثر (WCAG 2.2 §2.5.8)", () => {
    expect(toggle).toContain("min-h-11");
    expect(toggle).toContain("min-w-11");
  });

  it("تسميته عربية وتصف الفعل عند الضغط", () => {
    expect(toggle).toContain("إلغاء كتم صوت");
    expect(toggle).toContain("كتم صوت");
    expect(toggle).toContain("aria-label={action}");
  });

  it("الحالة لا تُنقل باللون وحده — الأيقونة تتبدّل", () => {
    expect(toggle).toContain("VolumeX");
    expect(toggle).toContain("Volume2");
  });
});

describe("حضور المساعد في وسط الصفحة", () => {
  const stage = source("src/components/sadeed/SadeedStagePresence.tsx");

  it("كتلة في مجرى الصفحة — لا تحجب المحتوى ولا تمنع التمرير", () => {
    // لا تثبيت على إطار العرض ⇐ لا طبقة تعلو المحتوى ولا تبتلع لمسة التمرير.
    // (`absolute inset-0` داخل حاوية الوجه مسموح: مقيَّد بأبٍ `relative`
    // بحجم ‏128px‏، لا يغطّي شيئًا خارجه.)
    expect(stage).not.toMatch(/\bfixed\b/);
    expect(stage).not.toMatch(/\bz-\[?\d/);
    // ولا ارتفاع بحجم الشاشة يزيح ما بعده خارج المشهد على ‏390px‏.
    expect(stage).not.toMatch(/h-screen|h-dvh|100vh/);
  });

  it("يحمل زرّ الكتم وطلب المخاطبة الصوتية", () => {
    expect(stage).toContain("SadeedMuteToggle");
    expect(stage).toContain("requestVoiceConversation");
  });

  it("الحالة مكتوبة بالكلمات ومعلَنة للقارئ الآلي", () => {
    expect(stage).toContain('aria-live="polite"');
    expect(stage).toContain("يتحدّث الآن");
  });
});
