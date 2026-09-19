-- ═══════════════════════════════════════════════════════════════════════════
-- سجلّ استهلاك الذكاء والصوت — أمر المالك ٢٠٢٦/٠٩/١٨ (المرحلة هـ، البند ٥)
--
-- **الحجب لا يحتاج هذا الجدول.** السقفان اليوميّ والعام مبنيّان على
-- `public.check_rate_limit` المطبَّقة منذ ٢٠٢٦/٠٦/٢٨ — تقبل أي نافذة،
-- فالسقف اليوميّ نافذةُ 86400 والعامّ مفتاحُ دلوٍ مشترك. فالحماية تعمل
-- من لحظة الدفع، وهذا الجدول **رؤيةٌ لا بوابة**: من أنفق، ومتى، وكم.
--
-- ولذلك تُكتب السطور بأفضل جهد في `ai-quota.server.ts` داخل `try` يبتلع
-- الخطأ: لا يسقط نداءُ مستخدمٍ لأن سطر محاسبةٍ لم يُكتب، ويبدأ التسجيل
-- من نفسه لحظة تطبيق هذا الترحيل بلا نشرٍ ثانٍ.
--
-- **الهوية ليست بيانًا شخصيًّا محفوظًا:** ما يُكتب إمّا معرّف مستخدم
-- Supabase وإمّا `ip:<عنوان>`. والعنوان يُبقى ٩٠ يومًا ثم يُحذف بمهمّة
-- التنظيف أدناه — سجلّ تكلفةٍ لا سجلّ تتبّع.
--
-- التراجع: `20260918100001_ai_usage_log_rollback.sql` (نفس الدفعة).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ai_usage_log (
  id          bigserial primary key,
  surface     text        not null check (surface in ('tts', 'stt', 'chat')),
  identity    text        not null,
  units       integer     not null default 1 check (units >= 0),
  occurred_at timestamptz not null default now()
);

create index if not exists ai_usage_surface_idx on public.ai_usage_log (surface, occurred_at desc);
create index if not exists ai_usage_identity_idx on public.ai_usage_log (identity, occurred_at desc);

alter table public.ai_usage_log enable row level security;

-- الكتابة لـ`service_role` وحده — الخادم يكتب، ولا أحد غيره.
grant select, insert on public.ai_usage_log to service_role;
grant usage, select on sequence public.ai_usage_log_id_seq to service_role;
revoke all on public.ai_usage_log from anon, authenticated;

-- القراءة لمن يملك `admin` وحده حتى يصل دور `auditor` في موجةٍ لاحقة.
-- لا سياسة كتابة لأي دور: السجلّ يُكتب من الخادم ولا يُعدَّل ولا يُحذف.
drop policy if exists ai_usage_select_admin on public.ai_usage_log;
create policy ai_usage_select_admin on public.ai_usage_log
  for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'));
