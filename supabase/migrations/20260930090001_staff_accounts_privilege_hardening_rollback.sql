-- ═══════════════════════════════════════════════════════════════════════════
-- تراجع: تشديد امتيازات `staff_accounts` — مرافق لـ
-- `20260930090000_staff_accounts_privilege_hardening.sql`.
--
-- يُعيد الامتيازات إلى ما قِيس على الإنتاج قبل التشديد حرفًا (منح Supabase
-- الافتراضي). **إعادة TRUNCATE للمصادَق تُعيد ثغرةً مقيسة** — لا يُشغَّل إلا
-- لسببٍ مثبت، ويُبلَّغ المالك.
--
-- idempotent: `grant` متكرّر بلا أثر. MAINTAIN موجود على Postgres 17 وحده.
-- **الترتيب:** يُشغَّل قبل `20260929210001` لا بعده — ذاك يُسقط الدالّتين فيفشل
-- `grant execute` هنا.
-- ═══════════════════════════════════════════════════════════════════════════

grant select, truncate, references, trigger on public.staff_accounts to authenticated;

do $$
begin
  if current_setting('server_version_num')::int >= 170000 then
    execute 'grant maintain on public.staff_accounts to authenticated';
  end if;
end $$;

grant execute on function public.member_creation_event_ok(text, uuid, text) to anon;
grant execute on function public.handle_new_staff_account() to public, anon, authenticated;
