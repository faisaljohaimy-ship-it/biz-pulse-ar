import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { readFinnEngineStatus } from "./engine.server";
import { isFinnOwnerUser } from "./owner-gate.server";
import type { FinnAccess } from "./status";

/**
 * هل المستخدم الحالي مالك فِن؟ — يقرّر **ظهور المدخل والصفحة**، لا الأمان.
 *
 * ## ما تعيده
 *
 * `{ allowed: false }` لكل من ليس المالك (زائرًا أو مسجَّلًا أو قائمةُ المالك غير
 * مضبوطة) — **بلا سبب** فلا يُكشف شيء. وللمالك وحده `{ allowed: true, engine }`
 * وفيها حالة المحرّكين منطقيّاتٍ واسم نموذج (لا قيمة مفتاح ولا طوله ولا قائمة
 * المعرّفات). **قائمة المالكين لا تغادر الخادم**: الدالة تقرؤها وتعيد الحكم.
 *
 * ## لماذا `optionalSupabaseAuth` لا `requireSupabaseAuth`
 *
 * جوابُ الزائر معروفٌ سلفًا («لا»)، ورميُ خطأ مصادقةٍ بدله يحوّل سؤالًا له جواب
 * صحيح إلى عطلٍ يوقف الشريط الجانبي كلّه (الاستعلام نفسه يعمل في كل صفحة). وهو
 * قراءةٌ لا تكتب شيئًا ولا تمنح قدرة. **والبوّابة الحقيقية في المسار البرمجي**
 * (`/api/finn/chat` — `resolveFinnOwner`)، لا في هذه الإجابة: إخفاءُ الواجهة
 * ليس حمايةً، ولذلك لا يُحمَّل شيءٌ من موجِّه الوكيل ولا من منطقه هنا.
 *
 * وهي `POST` لا `GET` كي لا يُخزَّن جوابها في وسيطٍ بين المتصفح والخادم.
 */
export const getFinnAccess = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<FinnAccess> => {
    if (!isFinnOwnerUser(context.userId)) return { allowed: false };
    return { allowed: true, engine: readFinnEngineStatus() };
  });
