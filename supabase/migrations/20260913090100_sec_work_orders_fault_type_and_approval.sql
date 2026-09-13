-- ═══════════════════════════════════════════════════════════════════════════
-- نوع العطل + حاجز الاعتماد على أوامر العمل — أمر المالك ٢٠٢٦/٠٩/١٣
--
-- ## ثلاثة فوارق عن نصّ الأمر، والواقع هو الحكم
--
--   ① **الجدول `public.sec_work_orders` لا `public.work_orders`.** لا وجود
--      لجدولٍ بالاسم الثاني في هذا المخطط إطلاقًا.
--   ② **لا عمود `asset_id`.** الأصل يُمثَّل بعمودين: `asset_kind text NOT NULL`
--      و`asset_code text` (يقبل NULL). فالإلزام الذي يجب فكّه — كي يبقى
--      التوافق الخلفي بعد سقوط حقل الأصل من النافذة — هو `asset_kind`.
--   ③ **`approved_by` و`approved_at` موجودان سلفًا** (ترحيل ٢٠٢٦/٠٦/٢٣)، لكن
--      `approved_by` بلا مرجعٍ إلى `auth.users`. يُضاف المرجع هنا إن غاب.
--
-- الملفّ idempotent كاملًا: كل إضافةٍ بـ`if not exists`، وكل قيدٍ في كتلةٍ
-- تبتلع `duplicate_object`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ١) الأعمدة ─────────────────────────────────────────────────────────────
alter table public.sec_work_orders
  add column if not exists fault_type      text,
  add column if not exists assignee_team   text,
  add column if not exists contractor_name text,
  add column if not exists return_reason   text,
  add column if not exists approved_by     uuid,
  add column if not exists approved_at     timestamptz;

-- المرجع إلى `auth.users` لم يكن على العمود القائم — يُضاف إن غاب.
do $$ begin
  alter table public.sec_work_orders
    add constraint sec_work_orders_approved_by_fkey
    foreign key (approved_by) references auth.users(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ── ٢) قيد نوع العطل — نفس مفاتيح `FAULT_TYPES` في الواجهة حرفيًّا ─────────
-- `not valid` عمدًا: الصفوف القائمة كلها `fault_type is null` (العمود وُلد
-- الآن)، والقيد يقبل NULL أصلًا — لكن `not valid` يمنع مسحًا كاملًا للجدول
-- عند التطبيق. والقيد يسري على كل كتابةٍ جديدة من لحظته.
do $$ begin
  alter table public.sec_work_orders add constraint sec_work_orders_fault_type_chk
    check (fault_type is null or fault_type in ('electrical','hvac','plumbing','civil','cctv',
      'access_control','gates_barriers','fire_alarm','lighting','network','other')) not valid;
exception when duplicate_object then null; end $$;

-- ── ٣) توافق خلفي: لا يُحذف عمودٌ، يُفكّ إلزامه فقط ────────────────────────
-- النافذة لم تعد تلتقط الأصل، فأمرُ عملٍ جديد يصل بلا `asset_kind`. ولا
-- يُحذف العمود: صفوف الصيانة القائمة (٢٤٩ أمرًا من تصدير SAP) تحمله، وشاشة
-- `/sec/maintenance` تعرضه عبر `WO_ASSET_KIND_AR`.
do $$ begin
  alter table public.sec_work_orders alter column asset_kind drop not null;
exception when others then null; end $$;

-- ── ٤) حالتا `approved` و`returned` في نطاق `status` ──────────────────────
-- القيد القائم: ('open','assigned','in-progress','on-hold','closed','cancelled').
-- يُسقَط ويُعاد بالقيمتين الجديدتين — القيم الستّ الأصلية تبقى كما هي حرفًا
-- بحرف (‏`in-progress` بشَرطة لا شُرطة سفلية؛ خلافُها يُسقط صفوفًا قائمة).
do $$
declare con_name text;
begin
  select conname into con_name
    from pg_constraint
   where conrelid = 'public.sec_work_orders'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%status%'
     and pg_get_constraintdef(oid) ilike '%open%'
   limit 1;
  if con_name is not null then
    execute format('alter table public.sec_work_orders drop constraint %I', con_name);
  end if;
end $$;

do $$ begin
  alter table public.sec_work_orders add constraint sec_work_orders_status_chk
    check (status in ('open','assigned','in-progress','on-hold','closed','cancelled',
      'approved','returned'));
exception when duplicate_object then null; end $$;

-- ── ٥) فرض الصلاحية في القاعدة — الحاجز الذي لا يُلتَفّ عليه ───────────────
-- الخادم يفرضها أيضًا، لكن من يستدعي PostgREST مباشرةً برمز جلسته لا يمرّ
-- بالخادم أصلًا. والدور يُقرأ من `public.user_roles` عبر `has_role`
-- (‏`security definer` على **جدول أدوار منفصل**) — لا من `profiles` الذي
-- يعدّله صاحبه، وإلا كان تصعيد الصلاحية بتحديث صفٍّ واحد.
create or replace function public.enforce_work_order_approval()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('approved','returned')
     and (tg_op = 'INSERT' or new.status is distinct from old.status)
     and not public.has_role(auth.uid(), 'work_order_approver') then
    raise exception 'not_authorized_to_approve';
  end if;
  return new;
end $$;

drop trigger if exists trg_sec_work_orders_approval on public.sec_work_orders;
create trigger trg_sec_work_orders_approval
  before insert or update on public.sec_work_orders
  for each row execute function public.enforce_work_order_approval();
