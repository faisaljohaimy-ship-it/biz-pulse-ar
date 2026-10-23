/**
 * /finn — وكيل المالك للبرمجة والأتمتة. **للمالك وحده.**
 *
 * ## الحارس وما يراه غيره
 *
 * `loader` يسأل الخادم `getFinnAccess` فإن لم يكن المستخدم المالك ⇒
 * `notFound({ routeId: rootRouteId })`: يرى **صفحة 404 الجذرية نفسها** التي يراها
 * لأيّ مسار غير موجود (`__root.tsx`) — لا «غير مصرّح» ولا «الوكيل غير مفعّل». وبلا
 * `routeId` كان الرمي يلتقطه أقرب `notFoundComponent`، وللمسار `RouteNotFound`
 * العربي داخل غلاف التطبيق، فتختلف الصفحتان ويُعرَف أن `/finn` مسارٌ حقيقي
 * (ملاحظة W5 #0؛ الحارس `finn-not-found.test.tsx`). وحالة «لم يُضبط مالك بعد» (`FINN_OWNER_USER_IDS` غير مضبوط
 * أو فاسد) **تظهر notFound أيضًا** عمدًا: النظام وقتها لا يعرف من المالك، فلا أحد
 * يستحقّ رسالةً خاصّة، وأيّ رسالةٍ تُظهر وجود الوكيل لمن ليس له. والمالك المحبوس
 * بسبب إعدادٍ فاسد يجد السبب في سجلّ الخادم (`[finn] owner gate is closed` برمز
 * السبب) لا في الواجهة. وإخفاء الصفحة **ليس الحماية** — الحماية في المسار البرمجي
 * `/api/finn/chat` الذي يردّ 404 لغير المالك قبل أي نموذج.
 *
 * ## لا تحميلَ لغير المالك
 *
 * واجهة المحادثة (وMarkdown) تُستورد كسولًا (`lazy`) بعد نجاح الحارس وحده؛ وموجِّه
 * الوكيل لا يصل العميل أصلًا (خادمٌ فقط).
 */
import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteError } from "@/components/route-boundaries";
import { getFinnAccess } from "@/lib/finn-agent/access.functions";
import { FINN_COPY } from "@/lib/finn-agent/copy";

const FinnChat = lazy(() => import("@/components/finn/FinnChat"));

export const Route = createFileRoute("/_authenticated/finn")({
  loader: async () => {
    const access = await getFinnAccess();
    if (!access.allowed) throw notFound({ routeId: rootRouteId });
    return access.engine;
  },
  errorComponent: RouteError,
  component: FinnPage,
});

function FinnPage() {
  const engine = Route.useLoaderData();
  return (
    <Suspense
      fallback={
        <p dir="rtl" role="status" className="p-6 text-center text-sm text-muted-foreground">
          {FINN_COPY.loadingPage}
        </p>
      }
    >
      <FinnChat engine={engine} />
    </Suspense>
  );
}
