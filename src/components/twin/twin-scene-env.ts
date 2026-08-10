/**
 * بيئة المشهد — **ما يقرأه المشهد من المتصفّح قبل أن يرسم**.
 *
 * ثلاثة أسئلة لا يملك المشهد الثلاثي جوابها من نفسه:
 *
 * ① **ما ألوان الوضع الحالي؟** WebGL لا يفهم `var(--surface)` ولا
 *    `color-mix()`. والحلّ ليس نسخ القيم إلى الكود — ذاك بالضبط ما تمنعه
 *    المادة ٣٣ — بل **قياسها من الصفحة نفسها**: عنصر مسبار يرث تتالي
 *    الحاوية، تُسند إليه `color: var(--token)`، فيعيد المتصفّح القيمة
 *    النهائية `rgb(...)` بعد حلّ كل `var()` و`color-mix()`. فما يُرسم في
 *    الكانفس هو لون الطبقة الرمزية حرفيًّا، ويتبع قلب الوضع بلا جدول ثانٍ.
 *
 * ② **هل الوضع فاتح؟** يُشتقّ من إضاءة `--surface` المقيسة لا من سياق
 *    ثيم: المشهد يبقى صالحًا داخل أي حاوية تعيد تعريف الرموز محليًّا،
 *    ولا يلزمه مزوّد ليُختبر.
 *
 * ③ **هل تُمنع الحركة؟ وهل الصفحة مرئية؟** الأولى واجب وصولي
 *    (WCAG 2.2.2)، والثانية واجب أداء: كانفس يرسم في تبويب مخفيّ يستهلك
 *    البطارية بلا مشاهد.
 */
import { useCallback, useEffect, useState, type RefObject } from "react";

/** استعلام تخفيف الحركة — نصٌّ واحد لا يُكرَّر، فلا ينحرف أحد نسخيه. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** الرموز التي يحتاجها المشهد. لا لون خارجها. */
const TOKEN_VARS = {
  surface: "--surface",
  ink: "--ink",
  hairline: "--hairline",
  cyan: "--tone-cyan",
  violet: "--tone-violet",
} as const;

export interface SceneTokens {
  /** أرضية المشهد والضباب — لون السطح المقيس. */
  readonly surface: string;
  /** الحبر: يُستعمل للخطوط والحوافّ، لا لمصادر الضوء. */
  readonly ink: string;
  readonly hairline: string;
  readonly cyan: string;
  readonly violet: string;
  /** مشتقّ من إضاءة `surface` — لا من سياق ثيم ولا من صنفٍ على الجذر. */
  readonly light: boolean;
}

/** إضاءة نسبية تقريبية من نصّ `rgb()/rgba()` — تكفي لتمييز وضعٍ من وضع. */
function luminanceOf(color: string): number {
  const parts = color.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return 0;
  const [r, g, b] = parts.slice(0, 3).map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * قياس الرموز من الصفحة. `null` = تعذّر القياس (خادم، أو بيئة لا تحلّ
 * `var()`) — وحينها **لا يُركَّب المشهد الثلاثي أصلًا**، فلا حاجة إلى لونٍ
 * احتياطي مكتوب يتجمّد على وضعٍ واحد.
 */
export function readSceneTokens(host: Element | null): SceneTokens | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const parent = host ?? document.body;
  if (!parent) return null;

  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "absolute";
  probe.style.width = "0";
  probe.style.height = "0";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  parent.appendChild(probe);

  try {
    const measured: Record<string, string> = {};
    for (const [key, name] of Object.entries(TOKEN_VARS)) {
      probe.style.removeProperty("color");
      probe.style.setProperty("color", `var(${name})`);
      const value = window.getComputedStyle(probe).color?.trim();
      // بيئةٌ لا تحلّ `var()` تعيد فراغًا أو الاسم كما هو — كلاهما ليس لونًا.
      if (!value || !value.startsWith("rgb")) return null;
      measured[key] = value;
    }
    return {
      surface: measured.surface,
      ink: measured.ink,
      hairline: measured.hairline,
      cyan: measured.cyan,
      violet: measured.violet,
      light: luminanceOf(measured.surface) > 0.5,
    };
  } finally {
    probe.remove();
  }
}

/**
 * الرموز المقيسة، تُعاد قراءتها عند قلب الوضع.
 *
 * المراقبة على `class` الجذر لأنّها **نقطة التطبيق الوحيدة** للوضع
 * (`src/lib/theme.tsx`)؛ فلا يلزم سياق ثيم، ويبقى المكوّن قابلًا للتركيب
 * والاختبار وحده.
 */
export function useSceneTokens(hostRef: RefObject<HTMLElement | null>): SceneTokens | null {
  const [tokens, setTokens] = useState<SceneTokens | null>(null);

  const measure = useCallback(() => {
    setTokens(readSceneTokens(hostRef.current));
  }, [hostRef]);

  useEffect(() => {
    measure();
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(measure);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => observer.disconnect();
  }, [measure]);

  return tokens;
}

/**
 * تفضيل تخفيف الحركة، حيًّا.
 *
 * يبدأ `false` ليتطابق أول رسمٍ على العميل مع الخادم، ثم يُصحَّح في التأثير
 * قبل أن يبدأ المشهد بالحركة — وهو ترتيب `useWebGLSupported` نفسه.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!query) return;
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

/** هل الصفحة مرئية؟ تبويبٌ مخفيّ ⇒ لا إطارات. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return visible;
}
