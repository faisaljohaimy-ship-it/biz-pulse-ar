-- ═══════════════════════════════════════════════════════════════════════════
-- المستخدم العادي يسجّل البلاغات وأوامر العمل والتصاريح (أمر المالك ٢٠٢٦/٠٩/٢٩)
--
-- نصّ الأمر: «اسمح للمستخدمين العاديين بتسجيل البلاغات بعد تسجيل الدخول بالرقم
-- الوظيفي والإيميل تحت خانة مستخدم جديد … للسماح له بتسجيل البلاغ أو أمر العمل
-- في الصيانة وغيرها». وبالسؤال اختار المالك: **التفعيل فوري للجميع** (لا اعتماد
-- مسؤول، ولا سجلّ موظفين للتحقّق — لا سجلّ في النظام)، والنطاق: البلاغات وأوامر
-- العمل والتصاريح. وهو تغيير صلاحياتٍ جوهري **بموافقة المالك الصريحة**.
--
-- ## ما قِيس على الإنتاج قبل الكتابة (لا من الترحيلات — ليست مصدر الحقيقة)
-- • `handle_new_org_member()` في الإنتاج يضيف كل مستخدم جديد عضوًا `operator`
--   في المؤسسة الوحيدة (الترحيلات تقول `viewer` — مثالٌ آخر على افتراقها).
-- • الإنشاء في `sec_incidents`/`sec_work_orders`/`sec_permits`/
--   `sec_activity_events` محصورٌ بـ`has_role(admin)`، فالمشغّل لا يُنشئ شيئًا.
-- • عزلٌ `RESTRICTIVE` على كلٍّ منها يشترط عضوية المؤسسة (`operator` للكتابة) —
--   **يبقى كما هو** ويُضاف إليه ما هنا بـAND.
-- • `enforce_work_order_approval` **غير مطبَّق** على الإنتاج. فلو فُتح الإدراج
--   بلا قيد لأمكن لأي حساب إدراج أمر عملٍ «معتمد» مباشرةً عبر PostgREST متجاوزًا
--   الخادم. لذا يُحصر إدراج المستخدم العادي في **الحالة الأولى** وبلا اعتماد.
--
-- ## ما يُضاف — إدراجٌ فقط، باسم صاحبه، في الحالة الأولى
-- التعديل والاعتماد والحذف تبقى للمسؤول كما هي. والقراءة: يرى المستخدم ما
-- أنشأه هو من أوامر العمل والتصاريح (البلاغات مقروءة للأعضاء أصلًا).
--
-- ## الرقم الوظيفي
-- جدول `staff_accounts` (رقمٌ فريد لكل حساب) يُملأ من بيانات التسجيل
-- (`raw_user_meta_data->>'staff_number'`) بـtrigger لا يُسقط التسجيل أبدًا:
-- رقمٌ غائب أو مكرَّر أو بغير الصيغة ⇐ لا صفّ، والحساب يُنشأ. الرقم **نسبةٌ
-- لا تحقّق** — لا سجلّ موظفين يُقارن به (قرار المالك). والدور لا يُخزَّن هنا.
--
-- idempotent: `if not exists` · `drop policy if exists` · `create or replace`.
-- التراجع: `20260929210001_regular_user_reporting_rollback.sql`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ١. الرقم الوظيفي للحساب ──────────────────────────────────────────────
create table if not exists public.staff_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  staff_number text not null unique check (staff_number ~ '^[0-9]{5,6}$'),
  created_at timestamptz not null default now()
);
alter table public.staff_accounts enable row level security;

drop policy if exists staff_accounts_select_own_or_admin on public.staff_accounts;
create policy staff_accounts_select_own_or_admin on public.staff_accounts
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));
-- لا سياسة إدراج/تعديل للعميل: الصفّ يكتبه الـtrigger وحده.
-- الصلاحيات صريحة لا موروثة: قراءةٌ للمصادَق (تحصرها السياسة أعلاه)، ولا
-- كتابة لأحد من العميل، ولا شيء للزائر.
grant select on public.staff_accounts to authenticated;
revoke insert, update, delete on public.staff_accounts from anon, authenticated;
revoke all on public.staff_accounts from anon;

create or replace function public.handle_new_staff_account()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  _num text := nullif(trim(new.raw_user_meta_data->>'staff_number'), '');
begin
  if _num is not null and _num ~ '^[0-9]{5,6}$' then
    insert into public.staff_accounts (user_id, staff_number)
    values (new.id, _num)
    on conflict do nothing;
  end if;
  return new;
exception when others then
  -- لا يُسقط التسجيل أبدًا: الرقم نسبةٌ لا شرط.
  raise notice 'handle_new_staff_account skipped: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_staff on auth.users;
create trigger on_auth_user_created_staff
  after insert on auth.users
  for each row execute function public.handle_new_staff_account();

-- هل الرقم متاح؟ — للنموذج قبل الإرسال، فلا يُنشأ حسابٌ بلا رقمه بصمت.
-- يعيد منطقيًّا فقط (لا هويّة صاحب الرقم).
create or replace function public.staff_number_available(_num text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select _num ~ '^[0-9]{5,6}$'
     and not exists (select 1 from public.staff_accounts where staff_number = _num);
$$;
revoke all on function public.staff_number_available(text) from public;
grant execute on function public.staff_number_available(text) to anon, authenticated;

-- ── ٢–٥. سياسات الإدراج — **الحقول المحجوزة فارغةٌ عند الإدراج** ──────────
-- نقضُ حارس الجودة الأول: كانت السياسات تحصر `status` وحده، فقِيس أن مشغّلًا
-- يُدرج بلاغًا «مفتوحًا» عليه `executive_reviewed_by` مسؤولٍ و`response_minutes=1`
-- (تزويرُ مؤشر زمن الاستجابة)، وتصريحًا «قيد الانتظار» موقَّعًا مسبقًا
-- بـ`approved_by`، وأمرَ عملٍ «مفتوحًا» بـ`closed_at`. فكل عمودٍ يكتبه مسارُ
-- مراجعةٍ أو اعتمادٍ أو إغلاقٍ أو تحليلٍ لاحق **فارغٌ بقيمته الافتراضية** هنا،
-- والتواريخ لا تُرجَّع إلى الوراء. (الأعمدة من `information_schema` للإنتاج.)

-- البلاغات
drop policy if exists sec_incidents_member_insert on public.sec_incidents;
create policy sec_incidents_member_insert on public.sec_incidents
  for insert to authenticated
  with check (
    public.is_org_member(org_id, 'operator'::public.org_role)
    and created_by = auth.uid()
    and status = 'open'
    and resolved_at is null
    and response_minutes is null
    and root_cause is null
    and ai_summary is null
    and corrective_actions = '[]'::jsonb
    and attachments = '[]'::jsonb
    and attachments_count = 0
    and escalated = false
    and aria_auto_analyzed = false
    and executive_review is null
    and executive_reviewed_by is null
    and executive_reviewed_at is null
    and reported_at between now() - interval '10 minutes' and now() + interval '2 minutes'
    and created_at between now() - interval '10 minutes' and now() + interval '2 minutes'
  );

-- أوامر العمل: مفتوحٌ بلا اعتمادٍ ولا إغلاق — يسدّ غياب
-- `enforce_work_order_approval` عن الإنتاج لهذا المسار.
drop policy if exists sec_work_orders_member_insert on public.sec_work_orders;
create policy sec_work_orders_member_insert on public.sec_work_orders
  for insert to authenticated
  with check (
    public.is_org_member(org_id, 'operator'::public.org_role)
    and created_by = auth.uid()
    and status = 'open'
    and approved_by is null
    and approved_at is null
    and closed_at is null
    and completion_notes is null
    and attachments = '[]'::jsonb
    and opened_at between now() - interval '10 minutes' and now() + interval '2 minutes'
    and created_at between now() - interval '10 minutes' and now() + interval '2 minutes'
  );

drop policy if exists sec_work_orders_select_own on public.sec_work_orders;
create policy sec_work_orders_select_own on public.sec_work_orders
  for select to authenticated
  using (created_by = auth.uid());

-- التصاريح: «قيد الانتظار» بلا معتمِدٍ ولا توقيع.
drop policy if exists sec_permits_member_insert on public.sec_permits;
create policy sec_permits_member_insert on public.sec_permits
  for insert to authenticated
  with check (
    public.is_org_member(org_id, 'operator'::public.org_role)
    and created_by = auth.uid()
    and status = 'pending'
    and approver is null
    and approved_by is null
    and approved_at is null
    and attachments = '[]'::jsonb
    and created_at between now() - interval '10 minutes' and now() + interval '2 minutes'
  );

drop policy if exists sec_permits_select_own on public.sec_permits;
create policy sec_permits_select_own on public.sec_permits
  for select to authenticated
  using (created_by = auth.uid());

-- حدث الإنشاء في السجلّ — **على كيانٍ أنشأه المُدرِج نفسه، ومرّةً واحدة**.
-- نقضُ حارس الجودة: قِيس أن مشغّلًا يُدرج `incident/registered` على بلاغ غيره
-- بموقعٍ مختلق و`occurred_at` بعد يوم، فيعرضه الدرج للمسؤول «موقعَ المُبلِّغ».
-- والفحص في دالّة SECURITY DEFINER لأن المشغّل لا يقرأ السجلّ (القراءة للمسؤول)
-- فلا يرى حدثًا سابقًا بنفسه، ولا يقرأ أوامر العمل إلا ما أنشأه.
create or replace function public.member_creation_event_ok(
  _entity_type text,
  _entity_id uuid,
  _event text
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    case
      when _entity_type = 'incident' and _event = 'registered' then
        exists (select 1 from public.sec_incidents i where i.id = _entity_id and i.created_by = auth.uid())
      when _entity_type = 'work_order' and _event = 'created' then
        exists (select 1 from public.sec_work_orders w where w.id = _entity_id and w.created_by = auth.uid())
      when _entity_type = 'permit' and _event = 'submitted' then
        exists (select 1 from public.sec_permits p where p.id = _entity_id and p.created_by = auth.uid())
      else false
    end
    and not exists (
      select 1 from public.sec_activity_events e
      where e.entity_id = _entity_id and e.event = _event
    );
$$;
revoke all on function public.member_creation_event_ok(text, uuid, text) from public;
grant execute on function public.member_creation_event_ok(text, uuid, text) to authenticated;

drop policy if exists sec_activity_events_member_insert on public.sec_activity_events;
create policy sec_activity_events_member_insert on public.sec_activity_events
  for insert to authenticated
  with check (
    public.is_org_member(org_id, 'operator'::public.org_role)
    and actor_id = auth.uid()
    and occurred_at between now() - interval '10 minutes' and now() + interval '2 minutes'
    and public.member_creation_event_ok(entity_type, entity_id, event)
  );
