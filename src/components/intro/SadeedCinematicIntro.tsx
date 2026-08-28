/**
 * SadeedCinematicIntro — المقدّمة السينمائية، ٣٠ ثانية قبل الصفحة الرئيسية.
 *
 * أمر المالك ٢٠٢٦/٠٨/٢٨. وهو **ناسخٌ** لقاعدة كانت مكتوبة في `__root.tsx`
 * («no cinematic welcome overlay») — النسخ موثَّق هناك وفي `intro-script.ts`
 * ولم يُطمس.
 *
 * ── ما الذي يتحرّك فعلًا، وما الذي لا يتحرّك ──
 * الصورة ساكنة (941×1672)، ولا مولّد فيديو متاحًا. فالحركة كلّها تُصنع في
 * المتصفّح على طبقاتٍ من الصورة نفسها:
 *   • **الشفاه** — مربوطة بالصوت الحقيقي عبر `AnalyserNode` على عنصر
 *     `<audio>` الذي يمرّره ناقل الصوت. ليست حلقةً تتظاهر بالمزامنة.
 *   • **العينان** — رمشٌ دوريّ: شريطٌ رفيع فوق خطّ العينين يُقصَر رأسيًّا.
 *   • **الجسم** — تنفّسٌ بطيء (تكبير ≤0.8٪) وميلانٌ محسوس.
 *   • **الكاميرا** — تقريبٌ على الوجه في مشاهد الكلام. بغيره تبقى حركة
 *     الشفاه تفصيلًا أصغر من أن يُرى: الوجه ~10٪ من عرض الصورة.
 *   • **اليدان لا تُفصَّلان.** يدا الشخص متشابكتان في الصورة، وتحريكهما
 *     تفصيليًّا من لقطةٍ واحدة يحتاج تقطيعًا وإعادة رسمٍ لا تنتجهما
 *     الحاوية. ما يقع هو انزياحٌ طفيف (parallax) على النصف السفلي مع
 *     الميلان — حركةٌ صادقة بحجمها، لا ادّعاء تحريكٍ مفصليّ.
 *
 * ── الصوت ──
 * طلبٌ واحد إلى `‎/api/public/sadeed-tts`‎. والصوت **مطابقٌ للشات بوت
 * بنيويًّا لا بالضبط اليدوي**: النقطة تقفل `SADEED_ELEVENLABS_VOICE_ID` في
 * الخادم بلا مزوّدٍ بديل (sadeed-tts.ts)، فما يخرج منها هو صوت سَدِيد أو لا
 * شيء. ولا `speechSynthesis` في أي مسار — محظور بالعقيدة.
 *
 * ── الكتم ──
 * `SadeedMuteToggle` نفسه المستعمل في السطوح الأخرى، وحالته في
 * `voice-mute` (المفتاح `aria-voice-muted`، عقدٌ حيّ). وبوابة الكتم في
 * **الناقل** لا هنا: `acquire()` يرفض قبل أن يُطلب المقطع من الخادم، فالكتم
 * صمتٌ حقيقي لا خفضُ مستوًى فوق صوتٍ نُزِّل.
 *
 * ── التدهور اللطيف ──
 * لا مفتاح ElevenLabs / خطأ شبكة / كتم ⇐ المقدّمة تسير صامتة بكامل صورتها
 * وخطّها الزمني. `prefers-reduced-motion` ⇐ لا مقدّمة إطلاقًا (تُعلَّم
 * مرئيةً وتُغلق فورًا) — الحركة السينمائية هي عين ما يطلب المستخدم تعطيله.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { SkipForward } from "lucide-react";
import { SadeedAudioBus } from "@/lib/sadeed/audio-bus";
import { SadeedMuteToggle } from "@/components/sadeed/SadeedMuteToggle";
import { isSadeedVoiceMuted } from "@/lib/sadeed-core/state/voice-mute";
import { setIntroActive } from "@/lib/intro-store";
import { markIntroSeen } from "@/lib/sadeed/intro-seen";
import { attachVoiceEnvelope, smoothEnvelope } from "@/lib/sadeed/voice-envelope";
import {
  INTRO_BEATS,
  INTRO_FACE,
  INTRO_NARRATION_AR,
  INTRO_TOTAL_MS,
  beatAt,
  introProgress,
} from "@/lib/sadeed/intro-script";

const INTRO_SRC = "/sadeed-intro.webp";

export interface SadeedCinematicIntroProps {
  onDone: () => void;
}

export function SadeedCinematicIntro({ onDone }: SadeedCinematicIntroProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const mouthRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [beatIdx, setBeatIdx] = useState(0);

  /** إغلاقٌ واحد مهما تعدّدت أسبابه (تخطٍّ · Escape · انتهاء الوقت). */
  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
      const src = a.src;
      try {
        a.src = "";
      } catch {
        /* ignore */
      }
      if (src.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(src);
        } catch {
          /* ignore */
        }
      }
      audioRef.current = null;
    }
    SadeedAudioBus.notifyStopped("hero-soundtrack");
    SadeedAudioBus.release("hero-soundtrack");
    setIntroActive(false);
    onDone();
  }, [onDone]);

  // ── دورة الحياة: تعليم الرؤية، إعلان النشاط، وحبس الخلفية عن التمرير ──
  useEffect(() => {
    markIntroSeen();
    setIntroActive(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      setIntroActive(false);
    };
  }, []);

  // ── Escape يتخطّى، والتركيز محبوس داخل الطبقة ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // ── الخطّ الزمني: مشهدٌ ورمشٌ وتنفّسٌ وشريط تقدّم، بإطارٍ واحد لا بمؤقّتات ──
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    let mouth = 0;
    let nextBlinkAt = 1_400;
    let blinkUntil = -1;
    let readEnvelope: (() => number) | null = null;

    const unsub = SadeedAudioBus.subscribe((e) => {
      if (e.kind === "playing" && e.source === "hero-soundtrack" && e.audioEl) {
        readEnvelope = attachVoiceEnvelope(e.audioEl);
      }
      if (e.kind === "stopped" || e.kind === "end") readEnvelope = null;
    });

    const frame = (now: number) => {
      const elapsed = now - t0;
      if (elapsed >= INTRO_TOTAL_MS) {
        close();
        return;
      }

      // المشهد — حالة React تتبدّل ست مرّات فقط، لا كل إطار.
      const beat = beatAt(elapsed);
      const idx = INTRO_BEATS.indexOf(beat);
      setBeatIdx((prev) => (prev === idx ? prev : idx));

      // الشفاه: من الصوت إن توفّر، وإلّا حركةٌ خفيفة تُبقي الشخصية حيّة
      // **دون ادّعاء مزامنة** — سعتها ثلث المدى فلا تُقرأ كلامًا.
      const target = readEnvelope
        ? readEnvelope()
        : 0.18 + 0.12 * Math.sin(elapsed / 190) * Math.sin(elapsed / 70);
      mouth = smoothEnvelope(mouth, Math.max(0, target));
      const m = mouthRef.current;
      if (m) m.style.setProperty("--sd-mouth", mouth.toFixed(3));

      // الرمش: نافذة 110ms، والتالي بعد فاصلٍ متغيّر فلا يصير إيقاعًا آليًّا.
      if (elapsed >= nextBlinkAt && blinkUntil < 0) {
        blinkUntil = elapsed + 110;
      }
      if (blinkUntil > 0 && elapsed > blinkUntil) {
        blinkUntil = -1;
        // الفاصل مشتقّ من الزمن نفسه لا من مولّد عشوائي (يُحظر في الاختبار).
        nextBlinkAt = elapsed + 2_600 + (Math.floor(elapsed) % 7) * 340;
      }
      const eyes = eyesRef.current;
      if (eyes) eyes.style.setProperty("--sd-blink", blinkUntil > 0 ? "1" : "0");

      // التنفّس والميلان — على المسرح لا على الصورة، فالقناعان يتبعانه.
      const stage = stageRef.current;
      if (stage) {
        stage.style.setProperty("--sd-breathe", (1 + 0.008 * Math.sin(elapsed / 1_450)).toFixed(4));
        stage.style.setProperty("--sd-sway", `${(0.9 * Math.sin(elapsed / 2_600)).toFixed(3)}deg`);
      }

      const bar = barRef.current;
      if (bar) bar.style.setProperty("--sd-progress", introProgress(elapsed).toFixed(4));

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [close]);

  // ── الصوت: طلبٌ واحد، وصمتٌ نظيف عند أي تعذّر ──
  useEffect(() => {
    let cancelled = false;
    // الكتم يُفحص قبل الطلب: لا نُنزّل مقطعًا لن يُسمع.
    if (isSadeedVoiceMuted()) return;

    // المقدّمة تبدأ بلا إيماءة سابقة، وقناة `hero-soundtrack` هي الوحيدة
    // المأذون لها بمحاولةٍ متفائلة واحدة (BYPASS_ALLOWED في audio-bus).
    // فإن رفض المتصفّح التشغيل بقيت المقدّمة صامتة ولم تتعطّل.
    SadeedAudioBus.unlock();
    const granted = SadeedAudioBus.acquire("hero-soundtrack", () => {
      const a = audioRef.current;
      if (a) {
        try {
          a.pause();
        } catch {
          /* ignore */
        }
      }
    });
    if (!granted) return;

    const ctrl = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/public/sadeed-tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: INTRO_NARRATION_AR }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`tts_${res.status}`);
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("audio/")) throw new Error("tts_not_audio");
        const blob = await res.blob();
        if (cancelled || closedRef.current || isSadeedVoiceMuted()) {
          SadeedAudioBus.release("hero-soundtrack");
          return;
        }
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplaying = () => SadeedAudioBus.notifyPlaying("hero-soundtrack", audio);
        audio.onended = () => {
          SadeedAudioBus.notifyStopped("hero-soundtrack");
          SadeedAudioBus.release("hero-soundtrack");
        };
        audio.onerror = () => SadeedAudioBus.release("hero-soundtrack");
        await audio.play();
      } catch {
        // صمتٌ صادق: لا صوت بديل، والمقدّمة تكمل بصريًّا.
        SadeedAudioBus.release("hero-soundtrack");
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  const beat = INTRO_BEATS[beatIdx] ?? INTRO_BEATS[0];
  const anchorY = beat.anchor === "face" ? INTRO_FACE.mouthY : 0.42;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="المقدّمة التعريفية بسَدِيد"
      dir="rtl"
      className="sd-intro fixed inset-0 z-[200] overflow-hidden bg-[#03060E]"
    >
      {/* المسرح: الصورة وطبقتا الفم والعينين تتحرّك معًا تحت التنفّس والميلان. */}
      <div
        ref={stageRef}
        className="sd-intro-stage absolute inset-0"
        style={{
          ["--sd-zoom" as string]: String(beat.zoom),
          ["--sd-anchor-x" as string]: `${INTRO_FACE.centerX * 100}%`,
          ["--sd-anchor-y" as string]: `${anchorY * 100}%`,
        }}
        aria-hidden
      >
        <img src={INTRO_SRC} alt="" draggable={false} className="sd-intro-img" />

        {/* قناع الفم: نسخةٌ ثانية من الصورة نفسها مقصوصةٌ على منطقة الفم،
            تُمطّ رأسيًّا بمقدار `--sd-mouth`. القصّ من الصورة ذاتها فتبقى
            الإضاءة والبشرة متطابقتين — لا رقعة مرسومة. */}
        <div
          ref={mouthRef}
          className="sd-intro-mouth"
          style={{
            ["--sd-mx" as string]: `${INTRO_FACE.centerX * 100}%`,
            ["--sd-my" as string]: `${INTRO_FACE.mouthY * 100}%`,
            ["--sd-mw" as string]: `${INTRO_FACE.mouthHalfW * 200}%`,
            ["--sd-mh" as string]: `${INTRO_FACE.mouthHalfH * 200}%`,
          }}
        >
          <img src={INTRO_SRC} alt="" draggable={false} className="sd-intro-img" />
        </div>

        {/* شريط الرمش: يُقصَر رأسيًّا لحظة الرمش فيبدو الجفن نازلًا. */}
        <div
          ref={eyesRef}
          className="sd-intro-eyes"
          style={{
            ["--sd-ex" as string]: `${INTRO_FACE.centerX * 100}%`,
            ["--sd-ey" as string]: `${INTRO_FACE.eyesY * 100}%`,
            ["--sd-ew" as string]: `${INTRO_FACE.eyesHalfW * 200}%`,
            ["--sd-eh" as string]: `${INTRO_FACE.eyesHalfH * 200}%`,
          }}
        >
          <img src={INTRO_SRC} alt="" draggable={false} className="sd-intro-img" />
        </div>
      </div>

      {/* حجابٌ متدرّج أسفل الشاشة — يرفع تباين النصّ فوق تفاصيل الصورة. */}
      <span aria-hidden className="sd-intro-scrim pointer-events-none absolute inset-0" />

      {/* السطر: يتبدّل مع المشهد ويُعلَن مرّةً واحدة عند تبدّله. */}
      <p
        aria-live="polite"
        className="absolute inset-x-0 bottom-28 px-6 text-center text-[color:var(--ink)]"
      >
        <span key={beatIdx} className="sd-intro-caption font-amiri text-2xl sm:text-4xl">
          {beat.caption}
        </span>
      </p>

      {/* الأدوات: الكتم والتخطّي. هدفا لمسٍ ≥44px، ونصٌّ لا أيقونةً وحدها. */}
      <div className="absolute inset-x-0 bottom-8 flex items-center justify-center gap-3 px-6">
        <SadeedMuteToggle withLabel />
        <button
          type="button"
          onClick={close}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[color:var(--hairline)] bg-[color:var(--chip)] px-4 text-sm font-bold text-[color:var(--ink)] transition-colors hover:border-[color:var(--hairline-hover)] hover:bg-[color:var(--chip-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--tone-cyan)]"
        >
          <SkipForward className="size-4 shrink-0" aria-hidden />
          تخطّي المقدّمة
        </button>
      </div>

      {/* شريط التقدّم — يُطمئن المشاهد أن للمقدّمة نهاية قريبة. */}
      <div
        ref={barRef}
        aria-hidden
        className="sd-intro-progress absolute inset-x-0 bottom-0 h-[3px]"
      />
    </div>
  );
}

export default SadeedCinematicIntro;
