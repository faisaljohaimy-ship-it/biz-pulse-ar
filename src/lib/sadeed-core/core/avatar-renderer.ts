/**
 * AvatarRenderer — the single sink of truth for the avatar visual pipeline.
 *
 * Composes channel outputs from all sub-engines into an AvatarFrame every
 * tick. React components subscribe via `avatarRenderer.subscribe(fn)` and
 * receive frames without owning any animation math themselves. There is
 * exactly ONE renderer in the app.
 *
 * ## Cadence — درس ٢٠٢٦/١٠/١٤ (P0: سفاري iOS «حدثت مشكلة بشكل متكرر»)
 *
 * قِيس على محاكاة iPhone 14 Pro: هذه الحلقة تطلب إطارًا كل ‎~16ms‎ إلى الأبد
 * (‎59.8‎ طلب/ث)، ومستهلكوها كلّهم تشخيصيّون (`realtimeAnimation` ←
 * `executivePresence` ← حلقة القياس، و`avatarPerformanceEngine`) — لا مكوّن
 * مرئيّ واحد يرسم منها. فالحلقة تعمل بثلاثة شروط لا بواحد:
 *
 *   ١. **مشترك واحد على الأقل.** بلا مشترك لا إطار يُحسب ولا طلب يُعلَّق؛
 *      وأوّل اشتراك يوقظها.
 *   ٢. **صفحة ظاهرة.** `document.hidden` ⇐ لا إطار ولا مؤقّت، وتعود عند
 *      `visibilitychange`.
 *   ٣. **الإيقاع بحسب الجهاز.** تحت `(pointer: coarse)` أو
 *      `prefers-reduced-motion` نبضةٌ كل ‎≥50ms‎ (‎≤20‎ إطارًا/ث) ولا طلب معلّق
 *      بينها، فيسكن مؤقّت العرض. وسطح المكتب بلا تقليل الحركة: إطارٌ لكل
 *      إطار عرض — كما كان حرفًا.
 */
import { attentionEngine } from "./attention-engine";
import { avatarStateManager, type AvatarState, type Emotion } from "./avatar-state-manager";
import { bodyEngine, type BodyChannel } from "./body-engine";
import { eyeEngine, type EyeChannel } from "./eye-engine";
import { faceEngine, type FaceChannel } from "./face-engine";
import { gestureEngine, type GestureId } from "./gesture-engine";
import { headEngine, type HeadChannel } from "./head-engine";
import { idleEngine } from "./idle-engine";
import { lipSyncEngine } from "./lip-sync-engine";
import { transitionEngine } from "./transition-engine";
import { isSafeMode } from "@/lib/sadeed/self-healing/crash-loop";

export interface AvatarFrame {
  state: AvatarState;
  emotion: Emotion;
  eyes: EyeChannel;
  head: HeadChannel;
  face: FaceChannel;
  body: BodyChannel;
  gesture: GestureId;
  lip: number; // 0..1
  breath: number; // 0..1
  sway: number; // -1..1
  gazeX: number; // -1..1 eased
  gazeY: number; // -1..1 eased
  ts: number;
}

type Subscriber = (frame: AvatarFrame) => void;

/** أقصر فاصل بين نبضتين في الإيقاع المخفَّض: ‎50ms‎ ⇐ ‎≤20‎ إطارًا/ث. */
export const REDUCED_FRAME_INTERVAL_MS = 50;

/**
 * الاستعلامان اللذان يخفّضان الإيقاع — `(pointer: coarse)` بنصّ كتلة الاستقرار
 * في آخر `styles.css` نفسه، فما تعدّه الأنماط جهاز لمس تعدّه الحلقة كذلك.
 */
export const REDUCED_CADENCE_QUERIES = [
  "(pointer: coarse)",
  "(prefers-reduced-motion: reduce)",
] as const;

/**
 * - `stopped`: لم تبدأ، أو أُوقفت، أو رفضها الوضع الآمن.
 * - `paused`: بدأت، لكن لا مشترك أو الصفحة مخفيّة — لا طلب إطار ولا مؤقّت.
 * - `full`: نبضة لكل إطار عرض (سطح المكتب).
 * - `reduced`: ‎≤20‎ نبضة/ث (لمس أو تقليل حركة).
 */
export type RendererCadence = "stopped" | "paused" | "full" | "reduced";

class AvatarRenderer {
  private frame: AvatarFrame = this.seed();
  private subs = new Set<Subscriber>();
  private raf: number | null = null;
  /** مؤقّت الإيقاع المخفَّض — بين نبضتين لا طلب إطار معلّق، بل هذا وحده. */
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private reduced = false;
  private unwatch: (() => void) | null = null;

  private seed(): AvatarFrame {
    return {
      state: "closed",
      emotion: "neutral",
      eyes: eyeEngine.channelFor("closed"),
      head: headEngine.channelFor("closed"),
      face: faceEngine.channelFor("neutral"),
      body: bodyEngine.channelFor("closed"),
      gesture: "none",
      lip: 0,
      breath: 0.5,
      sway: 0,
      gazeX: 0,
      gazeY: 0,
      ts: 0,
    };
  }

  start(): void {
    if (this.running || typeof window === "undefined") return;
    // Article XIII: under `html.safe-mode` the crash-loop breaker asked for a
    // static shell. This loop runs every frame forever (measured ~60 forced
    // layouts/s with Lottie on iPhone emulation), so it must not start —
    // subscribers keep the seed frame.
    if (isSafeMode()) return;
    this.running = true;
    this.unwatch = this.watchEnvironment();
    this.wake();
  }

  stop(): void {
    this.running = false;
    this.unwatch?.();
    this.unwatch = null;
    this.sleep();
  }

  /** الإيقاع النافذ الآن — للاختبارات وأدوات التشخيص، لا يغيّر شيئًا. */
  cadence(): RendererCadence {
    if (!this.running) return "stopped";
    if (!this.wantsFrames()) return "paused";
    return this.reduced ? "reduced" : "full";
  }

  getFrame(): AvatarFrame {
    return this.frame;
  }

  subscribe(fn: Subscriber): () => void {
    this.subs.add(fn);
    fn(this.frame);
    // أوّل مشترك هو ما يجعل الإطار جديرًا بالحساب.
    this.wake();
    return () => {
      this.subs.delete(fn);
      if (!this.wantsFrames()) this.sleep();
    };
  }

  /** الشروط الثلاثة في رأس الملف: بدأت، ولها مشترك، والصفحة ظاهرة. */
  private wantsFrames(): boolean {
    if (!this.running || this.subs.size === 0) return false;
    return !(typeof document !== "undefined" && document.hidden);
  }

  /** يسلّح النبضة التالية — ما لم تكن واحدةٌ معلّقة أو لا أحد يحتاجها. */
  private wake(): void {
    if (this.raf !== null || this.timer !== null || !this.wantsFrames()) return;
    this.raf = window.requestAnimationFrame(this.loop);
  }

  /** ينزع كلّ معلّق: طلب الإطار ومؤقّت الإيقاع المخفَّض معًا. */
  private sleep(): void {
    if (this.raf !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.raf);
    }
    this.raf = null;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private readonly loop = (t: number): void => {
    this.raf = null;
    if (!this.running) return;
    // Safe-mode can also be entered mid-session (permanent healer, memory
    // pressure). The class is never removed within a page life, so stop
    // for good. `classList.contains` reads no layout.
    if (isSafeMode()) {
      this.stop();
      return;
    }
    // أُخفيت الصفحة أو غادر آخر مشترك منذ التسليح: لا نبضة ولا تالية لها.
    if (!this.wantsFrames()) return;
    this.tick(t);
    if (this.reduced) {
      // ‎≤20‎ إطارًا/ث: الفاصل يمضي بلا طلب إطار معلّق، ثم تُحاذى النبضة
      // إلى إطار العرض التالي — فالفارق بين نبضتين ‎≥50ms‎ دائمًا.
      this.timer = setTimeout(() => {
        this.timer = null;
        this.wake();
      }, REDUCED_FRAME_INTERVAL_MS);
    } else {
      this.raf = window.requestAnimationFrame(this.loop);
    }
  };

  /**
   * يقرأ الإيقاع ويراقب تبدّله حيًّا: الإخفاء والإظهار، وتبديل تفضيل الحركة
   * أو جهاز الإدخال أثناء الجلسة. كلّ تبدّلٍ يُعيد التسليح من الصفر.
   */
  private watchEnvironment(): () => void {
    const queries =
      typeof window.matchMedia === "function"
        ? REDUCED_CADENCE_QUERIES.map((q) => window.matchMedia(q))
        : [];
    const sync = () => {
      this.reduced = queries.some((q) => q.matches);
      this.sleep();
      this.wake();
    };
    this.reduced = queries.some((q) => q.matches);
    document.addEventListener("visibilitychange", sync);
    for (const q of queries) q.addEventListener?.("change", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      for (const q of queries) q.removeEventListener?.("change", sync);
    };
  }

  private tick(nowMs: number): void {
    const state = avatarStateManager.getState();
    const emotion = avatarStateManager.getEmotion();
    const eyesTarget = eyeEngine.channelFor(state);
    const headTarget = headEngine.channelFor(state);
    const faceTarget = faceEngine.channelFor(emotion);
    const bodyTarget = bodyEngine.channelFor(state);
    const gesture = gestureEngine.select(state, emotion);
    const idle = idleEngine.tick(nowMs);
    const attention = attentionEngine.current();

    // Attention override for gaze
    let targetGazeX = eyesTarget.gazeTargetX;
    let targetGazeY = eyesTarget.gazeTargetY;
    if (attention.kind === "ui") {
      targetGazeX = attention.x;
      targetGazeY = attention.y;
    } else if (attention.kind === "away") {
      targetGazeX = 0.35;
      targetGazeY = -0.1;
    }

    const dt = this.frame.ts === 0 ? 16 : Math.max(1, nowMs - this.frame.ts);
    const gazeX = transitionEngine.clampBipolar(
      transitionEngine.ease(this.frame.gazeX, targetGazeX, dt),
    );
    const gazeY = transitionEngine.clampBipolar(
      transitionEngine.ease(this.frame.gazeY, targetGazeY, dt),
    );
    const lip = transitionEngine.clamp01(
      transitionEngine.ease(this.frame.lip, lipSyncEngine.read(), dt, 80),
    );
    const breath = transitionEngine.clamp01(
      transitionEngine.ease(
        this.frame.breath,
        idle.breath * bodyTarget.breathingDepth + 0.2,
        dt,
        400,
      ),
    );

    const next: AvatarFrame = {
      state,
      emotion,
      eyes: eyesTarget,
      head: headTarget,
      face: faceTarget,
      body: bodyTarget,
      gesture,
      lip,
      breath,
      sway: idle.sway * (bodyTarget.swayAmplitude || 0),
      gazeX,
      gazeY,
      ts: nowMs,
    };
    this.frame = next;
    this.subs.forEach((s) => {
      try {
        s(next);
      } catch {
        /* isolate */
      }
    });
  }
}

export const avatarRenderer = new AvatarRenderer();
