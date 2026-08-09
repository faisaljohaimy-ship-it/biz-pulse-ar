/**
 * حارس الكتم — طلب المالك «ونقدر نصمته».
 *
 * الاختبار يثبت الشيء الذي يسهل أن ينكسر بصمت: أن الكتم يمنع **منح قناة
 * الصوت نفسها**، لا أن يخفض عنصر صوت واحدًا في مكوّن واحد. لو انتقل الفحص
 * يومًا من `FinnAudioBus.acquire` إلى مكوّن، لَنطق كل مصدر لا يمرّ بذلك
 * المكوّن من خلف زرّ يقول «مكتوم» — وهذا ما يمسكه هذا الملف.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  FINN_VOICE_MUTED_STORAGE_KEY,
  isFinnVoiceMuted,
  setFinnVoiceMuted,
  subscribeFinnVoiceMute,
  toggleFinnVoiceMuted,
} from "./voice-mute";
import { FinnAudioBus } from "@/lib/finn/audio-bus";

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
    setFinnVoiceMuted(false);
    FinnAudioBus.stopAll();
  });

  it("يبدأ ناطقًا — لا يُكتم أحد من غير طلبه", () => {
    expect(isFinnVoiceMuted()).toBe(false);
  });

  it("يحفظ الاختيار في التخزين بالمفتاح القائم", () => {
    setFinnVoiceMuted(true);
    expect(window.localStorage.getItem(FINN_VOICE_MUTED_STORAGE_KEY)).toBe("1");
    setFinnVoiceMuted(false);
    expect(window.localStorage.getItem(FINN_VOICE_MUTED_STORAGE_KEY)).toBe("0");
    // المفتاح عقد حيّ: إعادة تسميته تُيتّم تفضيل مستخدم قائم.
    expect(FINN_VOICE_MUTED_STORAGE_KEY).toBe("aria-voice-muted");
  });

  it("يبلّغ المشتركين عند كل تبدّل فقط", () => {
    const seen: boolean[] = [];
    const off = subscribeFinnVoiceMute((m) => seen.push(m));
    setFinnVoiceMuted(true);
    setFinnVoiceMuted(true); // نفس القيمة ⇐ لا حدث
    expect(toggleFinnVoiceMuted()).toBe(false);
    off();
    setFinnVoiceMuted(true); // بعد إلغاء الاشتراك ⇐ لا حدث
    expect(seen).toEqual([true, false]);
  });

  it("يمنع الناقل من منح القناة لأي مصدر صوت", () => {
    FinnAudioBus.unlock();
    expect(FinnAudioBus.acquire("chat-tts", () => {})).toBe(true);
    FinnAudioBus.release("chat-tts");

    setFinnVoiceMuted(true);
    for (const src of [
      "chat-tts",
      "agent-tts",
      "conversation-greeting",
      "hero-soundtrack",
    ] as const) {
      expect(FinnAudioBus.acquire(src, () => {})).toBe(false);
    }
    expect(FinnAudioBus.currentSource()).toBeNull();
  });

  it("يقطع الجملة الجارية لحظة الكتم — لا ينتظر نهايتها", () => {
    FinnAudioBus.unlock();
    let stopped = false;
    expect(
      FinnAudioBus.acquire("chat-tts", () => {
        stopped = true;
      }),
    ).toBe(true);
    setFinnVoiceMuted(true);
    expect(stopped).toBe(true);
    expect(FinnAudioBus.currentSource()).toBeNull();
  });

  it("لا يستبدل مزوّدًا ولا يستدعي نطق المتصفح", () => {
    // الكتم يمنع الصوت، ولا يفتح بابًا خلفيًّا لصوت آخر.
    for (const file of [
      "src/lib/finn-core/state/voice-mute.ts",
      "src/components/finn/FinnMuteToggle.tsx",
      "src/components/finn/FinnStagePresence.tsx",
    ]) {
      expect(source(file)).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/);
    }
  });
});

describe("زرّ الكتم — عقد الوصول", () => {
  const toggle = source("src/components/finn/FinnMuteToggle.tsx");

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
  const stage = source("src/components/finn/FinnStagePresence.tsx");

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
    expect(stage).toContain("FinnMuteToggle");
    expect(stage).toContain("requestVoiceConversation");
  });

  it("الحالة مكتوبة بالكلمات ومعلَنة للقارئ الآلي", () => {
    expect(stage).toContain('aria-live="polite"');
    expect(stage).toContain("يتحدّث الآن");
  });
});
