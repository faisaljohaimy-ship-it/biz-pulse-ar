-- ═══════════════════════════════════════════════════════════════════════════
-- تراجع: أوامر عمل الصيانة التصحيحية — مرافق لـ`20261006120000_maint_orders.sql`.
--
-- يُسقط الدوالّ والعرض وسياسات القراءة ويحجب الجدولين عن المصادَق — فتعود
-- الواجهة إلى محاكاتها. و**الجدولان لا يُحذفان**: فيهما الـ١٧٩٥ أمرًا المستوردة
-- وما سجّله الفنيون بعدها؛ حذفهما حذف بيانات يبقى خلف موافقة المالك الصريحة.
--
-- idempotent: يعمل ولو شُغِّل مرّتين، أو على قاعدةٍ لم يُطبَّق عليها الأصل.
-- ═══════════════════════════════════════════════════════════════════════════

drop function if exists public.maint_analytics();
drop function if exists public.maint_kpis();
drop function if exists public.maint_staff_directory();
drop function if exists public.maint_set_status(uuid, text, text, text);
drop function if exists public.maint_advance_stage(uuid, text, text);
drop function if exists public.maint_assign(uuid, uuid);
drop function if exists public.maint_create_order(text, text, text, text, text, text, date);
drop view if exists public.maint_orders_v;
drop function if exists public.maint_is_manager(uuid);
drop function if exists public.maint_stage_rank(text);
drop function if exists public.maint_stage_pct(text, text);

do $$
begin
  if to_regclass('public.maint_orders') is not null then
    execute 'drop policy if exists maint_orders_select_member on public.maint_orders';
    execute 'revoke all on public.maint_orders from anon, authenticated';
    raise notice 'maint_orders retained (holds imported data) — drop only with explicit owner approval';
  end if;
  if to_regclass('public.maint_order_events') is not null then
    execute 'drop policy if exists maint_order_events_select_member on public.maint_order_events';
    execute 'revoke all on public.maint_order_events from anon, authenticated';
  end if;
end $$;
