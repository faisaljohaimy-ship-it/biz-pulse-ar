import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { hasPlatformRole } from "@/lib/authz.server";

/**
 * هل المستخدم الحالي مسؤول منصّة؟ — سؤالٌ تطرحه شاشات العرض لتقرّر إظهار
 * أدوات الإدارة.
 *
 * **لماذا لا `requireSupabaseAuth`.** الجواب للزائر معروف سلفًا: «لا».
 * فرمي خطأ مصادقة بدله يحوّل سؤالًا له جواب صحيح إلى عطلٍ يوقف الشاشة
 * كلّها (`/sec/knowledge` و`/executive-reports` تستدعيانه). ولا يُوسَّع
 * بذلك امتياز: `hasPlatformRole(null)` تعيد `false`، والبوابة الفعلية
 * تبقى في الخادم عند كل إجراء إداري لا في هذه الإجابة.
 */
export const getCurrentUserIsAdmin = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }) => ({
    isAdmin: context.userId ? await hasPlatformRole(context.userId, "admin") : false,
  }));
