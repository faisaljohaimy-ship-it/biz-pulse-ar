-- ═══════════════════════════════════════════════════════════════════════════
-- تشديد امتيازات `staff_accounts` ودوالّ «المستخدم العادي» — ما قِيس بعد تطبيق
-- `20260929210000` على الإنتاج (٢٠٢٦/٠٩/٣٠).
--
-- ## ما قِيس على الإنتاج (لا في الحزمة المحلية)
-- • `relacl` على `staff_accounts` بعد التطبيق: `authenticated=rDxtm` — أي أن
--   `revoke insert, update, delete` أبقى من منح Supabase الافتراضي TRUNCATE (D)
--   وREFERENCES (x) وTRIGGER (t) وMAINTAIN (m). وقِيس سلوكًا تحت
--   `role authenticated` بجلسة مشغّل حقيقي: **`truncate public.staff_accounts`
--   مسموح** — وRLS لا يسري على TRUNCATE. (PostgREST لا يصدر TRUNCATE، فالسطح
--   هو اتصال SQL مباشر؛ ومع ذلك امتيازٌ لا حاجة له على جدول هويّة.)
-- • `proacl` على `member_creation_event_ok`: `anon=X` — `revoke … from public` لا
--   يُسقط منح Supabase الصريح للزائر. الدالّة تعيد `false` للزائر (لا `auth.uid()`)
--   فلا تسريب، لكن العقد كان «للمصادَق وحده».
-- • `handle_new_staff_account` قابلةٌ للتنفيذ من الجميع — دالّة trigger لا تُستدعى
--   مباشرةً، وتُحصر مع ذلك.
--
-- الحزمة المحلية لم ترَ هذا لأنها لا تحاكي منح Supabase الافتراضي — قاعدة
-- «الحكم على أمان القاعدة الحيّة يُقاس عليها» تطبيقًا.
--
-- idempotent: `revoke`/`grant` متكرّران بلا أثر. `revoke all` بدل تعداد
-- الامتيازات فيعمل على Postgres 15 (بلا MAINTAIN) و17 سواء.
-- التراجع: `20260930090001_staff_accounts_privilege_hardening_rollback.sql`.
-- ═══════════════════════════════════════════════════════════════════════════

revoke all on public.staff_accounts from anon, authenticated;
grant select on public.staff_accounts to authenticated;

revoke all on function public.member_creation_event_ok(text, uuid, text) from public, anon;
grant execute on function public.member_creation_event_ok(text, uuid, text) to authenticated;

revoke all on function public.handle_new_staff_account() from public, anon, authenticated;
