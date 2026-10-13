/**
 * مسرح التوأم — **القرار قبل الرسم**.
 *
 * هذا المكوّن لا يرسم شيئًا ثلاثيًّا بنفسه ولا يستورد `three`. مهمّته أن
 * يجيب عن سؤال واحد قبل أن يُحمَّل ميغابايتٌ من كود: **هل يصلح هذا الجهاز
 * للمشهد الثلاثي الآن؟** فإن لم يصلح — أو تأخّر تحميله، أو سقط أثناءه —
 * ظهر المشهد المرسوم في مكانه، لا مربّعٌ أسود ولا هيكل تحميل أبدي.
 *
 * ثلاث بوّابات متتالية، كلّها تسقط إلى البديل نفسه:
 *
 * ① **WebGL**: `useWebGLSupported` يجيب `false` على الخادم وفي أول رسمٍ
 *    على العميل، فيتطابق الرسمان ولا ينكسر الترطيب؛ ثم يُصحَّح بعد المسح.
 * ② **الرموز**: بلا قياسٍ للألوان من الصفحة لا يُركَّب المشهد — فلا لون
 *    احتياطي مكتوب يتجمّد على وضعٍ واحد (المادة ٣٣).
 * ③ **السقوط أثناء التشغيل**: حدّ خطأ يلتقط فشل جلب الحزمة الكسولة أو
 *    فشل بناء المُصيِّر، فيعود إلى البديل بدل أن يُسقط الصفحة كلّها.
 *
 * وحدّ `Suspense` بديلُه هو المشهد المرسوم نفسه — فالانتقال من البديل إلى
 * الثلاثي تبديلُ طبقةٍ فوق المحتوى نفسه، لا ظهورٌ بعد فراغ.
 */
import { Component, Suspense, lazy, useRef, type ReactNode } from "react";
import type { RegionId } from "@/lib/regions";
import { useWebGLSupported } from "@/lib/graphics/use-webgl-supported";
import { TwinFallbackScene } from "./TwinFallbackScene";
import { useReducedMotion, usePageVisible, useSceneTokens } from "./twin-scene-env";
import type { TwinReading } from "./twin-scene-model";
import type { TwinScene3D as TwinScene3DT } from "./TwinScene3D";

/**
 * الحزمة الثلاثية كسولة **وميتة على الخادم**: فرع `import.meta.env.SSR`
 * يجعل `import()` كودًا ميتًا في بناء الخادم، فلا يدخل `three` حزمة SSR
 * أصلًا (النمط نفسه المعتمد في `theater.tsx`).
 */
const TwinScene3D = lazy((): Promise<{ default: typeof TwinScene3DT }> =>
  import.meta.env.SSR
    ? Promise.resolve({ default: (() => null) as unknown as typeof TwinScene3DT })
    : import("./TwinScene3D").then((m) => ({ default: m.TwinScene3D })),
);

/** حدّ خطأ صامت: يستبدل المشهد الثلاثي بالمرسوم ولا يُسقط الصفحة. */
class SceneBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export interface TwinStageProps {
  readonly ar: boolean;
  readonly readings: readonly TwinReading[];
  readonly activeRegionId?: RegionId;
  readonly className?: string;
}

export function TwinStage({ ar, readings, activeRegionId, className }: TwinStageProps) {
  const host = useRef<HTMLDivElement>(null);
  const webglOk = useWebGLSupported();
  const tokens = useSceneTokens(host);
  const reduced = useReducedMotion();
  const visible = usePageVisible();

  const fallback = (
    <TwinFallbackScene ar={ar} readings={readings} activeRegionId={activeRegionId} />
  );

  return (
    <div
      ref={host}
      className={className ?? "nx-tw-stage relative aspect-[76/52] w-full"}
      data-twin-mode={webglOk && tokens ? "webgl" : "svg"}
    >
      {webglOk && tokens ? (
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <TwinScene3D
              ar={ar}
              readings={readings}
              activeRegionId={activeRegionId}
              tokens={tokens}
              reduced={reduced}
              // تبويبٌ مخفيّ ⇒ لا إطارات: الحلقة تنتقل إلى «عند الطلب».
              animate={visible && !reduced}
            />
          </Suspense>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}

export default TwinStage;
