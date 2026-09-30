-- ═══════════════════════════════════════════════════════════════════════════
-- تراجع: المستخدم العادي يسجّل البلاغات وأوامر العمل والتصاريح — مرافق لـ
-- `20260929210000_regular_user_reporting.sql`.
--
-- يُعيد الإنشاء إلى المسؤول وحده (السياسات الأصلية لم تُمسّ فتبقى نافذة).
-- الترتيب معكوس. و**`staff_accounts` لا يُحذف**: فيه أرقامٌ وظيفية سجّلها
-- مستخدمون، وحذفها حذفُ بيانات يبقى خلف موافقة المالك الصريحة — يُسقط الـtrigger
-- ودالّة الإتاحة فقط، فلا يُكتب فيه جديد، ويُترك الجدول بإشعار.
--
-- idempotent: يعمل ولو شُغِّل مرّتين، أو على قاعدةٍ لم يُطبَّق عليها الأصل.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists sec_activity_events_member_insert on public.sec_activity_events;
drop function if exists public.member_creation_event_ok(text, uuid, text);

drop policy if exists sec_permits_select_own on public.sec_permits;
drop policy if exists sec_permits_member_insert on public.sec_permits;

drop policy if exists sec_work_orders_select_own on public.sec_work_orders;
drop policy if exists sec_work_orders_member_insert on public.sec_work_orders;

drop policy if exists sec_incidents_member_insert on public.sec_incidents;

drop function if exists public.staff_number_available(text);
drop trigger if exists on_auth_user_created_staff on auth.users;
drop function if exists public.handle_new_staff_account();

do $$
begin
  if to_regclass('public.staff_accounts') is not null then
    raise notice 'staff_accounts retained (holds user data) — drop only with explicit owner approval';
  end if;
end $$;
