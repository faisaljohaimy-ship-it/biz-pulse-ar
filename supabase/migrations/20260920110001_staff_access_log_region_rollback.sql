-- ═══════════════════════════════════════════════════════════════════════════
-- تراجع: عمود المنطقة على `staff_access_log` — مرافق لـ`20260920110000`.
--
-- ⚠ إسقاط العمود **يفقد الاختيار المسجَّل** لكل صفٍّ كُتب بعد التطبيق، ولا
-- يُستعاد: المنطقة أُخذت من المستخدم لحظة الدخول ولا مصدر آخر لها. فلا
-- يُشغَّل إلا لعطلٍ مثبت، وبعد تصدير السجلّ إن كان له قيمة مراجعة.
--
-- ولا صفّ يُحذف — العمود وحده.
-- idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

drop index if exists public.staff_access_region_idx;

do $$ begin
  alter table public.staff_access_log drop constraint staff_access_log_region_chk;
exception when undefined_object then null; end $$;

alter table public.staff_access_log drop column if exists region;
