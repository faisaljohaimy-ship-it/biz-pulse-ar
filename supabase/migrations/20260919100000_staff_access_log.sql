-- ═══════════════════════════════════════════════════════════════════════════
-- سجلّ الدخول بالرقم الوظيفي — أمر المالك ٢٠٢٦/٠٩/١٩
--
-- «لمعرفة من دخل على النظام ومن استخدم النظام بدون تسجيل دخول».
--
-- **وهذا سجلّ إسناد لا مصادقة.** الرقم نصٌّ يكتبه الزائر: لا يُقارن بسجلّ
-- موظفين ولا يمنح صلاحية، ويستطيع أي أحد كتابة أي رقم. فما يثبته السجلّ
-- أن **أحدًا صرّح بهذا الرقم في هذا الوقت** — لا أكثر. والحراسة الحقيقية
-- (مصادقة · أدوار · RLS) دَينٌ معلن في `_audit/ACTION_REQUIRED.md`.
--
-- ## لا امتياز كتابةٍ لأحد — والكتابة من الخادم وحده
--
-- الزائر مجهولٌ بالتعريف، فسياسة `insert` لـ`anon` كانت ستفتح بابًا يُملأ
-- منه السجلّ بآلاف السطور المزوّرة من خارج الواجهة. الكتابة تمرّ من
-- `recordStaffEntry` بمفتاح الخدمة، والجدول بلا امتياز كتابةٍ لدور مستخدم.
--
-- ## والقراءة خلف مصادقة
--
-- سجلُّ من دخل ومتى، وعرضُه لزائرٍ مجهول يقلب أداة الإسناد إلى تسريب.
--
-- التراجع: `20260919100001_staff_access_log_rollback.sql` (نفس الدفعة).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.staff_access_log (
  id           bigserial   primary key,
  staff_number text        not null check (staff_number ~ '^[0-9]{3,12}$'),
  path         text        not null default '/',
  entered_at   timestamptz not null default now()
);

create index if not exists staff_access_entered_idx on public.staff_access_log (entered_at desc);
create index if not exists staff_access_number_idx  on public.staff_access_log (staff_number, entered_at desc);

alter table public.staff_access_log enable row level security;

grant select, insert on public.staff_access_log to service_role;
grant usage, select on sequence public.staff_access_log_id_seq to service_role;
revoke all on public.staff_access_log from anon, authenticated;

-- القراءة لمن يملك `admin` حتى يصل دور `auditor` في موجةٍ لاحقة.
-- ولا سياسة كتابةٍ ولا تحديث ولا حذف لأي دور: يُكتب ولا يُعدَّل.
drop policy if exists staff_access_select_admin on public.staff_access_log;
create policy staff_access_select_admin on public.staff_access_log
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));
