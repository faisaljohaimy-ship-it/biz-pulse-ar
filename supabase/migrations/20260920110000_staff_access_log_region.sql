-- ═══════════════════════════════════════════════════════════════════════════
-- المنطقة المختارة عند الدخول — أمر المالك ٢٠٢٦/٠٩/٢٠
--
-- صارت لوحة الدخول تسأل المنطقة تحت الرقم الوظيفي، ولا تفتح إلا بهما معًا.
-- فيُحفظ الاختيار مع الصفّ: «من دخل ومتى **ومن أي منطقة**».
--
-- ## ولا قيمة افتراضية للصفوف السابقة
--
-- الصفوف المكتوبة قبل وجود الحقل **لم تُعرف منطقتها**. وملؤها بـ'central'
-- يجعل كل دخولٍ قديم يبدو إسنادًا للوسطى — إسنادٌ لم يقع، ويُقرأ في
-- المراجعة إثباتًا (المادة ٢٧). فتبقى `NULL` وتُعرض «—».
--
-- ولا `NOT NULL` لنفس السبب: الصفوف القديمة تنقضه، وإجبارُها يقتضي اختلاقًا.
--
-- idempotent. التراجع: `20260920110001_staff_access_log_region_rollback.sql`.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.staff_access_log add column if not exists region text;

do $$ begin
  alter table public.staff_access_log add constraint staff_access_log_region_chk
    check (region is null or region in ('central','western','eastern','southern'));
exception when duplicate_object then null; end $$;

-- ── وشدّ قيد الرقم إلى ٥–٦ ليطابق الواجهة ────────────────────────────────
-- كان القيد `^[0-9]{3,12}$` والواجهة صارت ٥–٦. وطرفا العقد إن افترقا قبل
-- القاعدةُ ما ترفضه الشاشة لمن ينادي الدالّة مباشرةً — وهو عين صنف العطل
-- الذي أُغلق في `sec_work_orders` (حرفٌ واحد بين الكود والقيد).
--
-- والجدول أُنشئ اليوم وهو فارغ، فالشدّ لا يُسقط صفًّا. ولو وُجد صفٌّ مخالف
-- لَفشل الترحيل بصوتٍ عالٍ — وهو الصواب: قيدٌ يُضاف `not valid` يمرّ
-- ويترك المخالف قائمًا.
do $$ begin
  alter table public.staff_access_log drop constraint if exists staff_access_log_staff_number_check;
  alter table public.staff_access_log add constraint staff_access_log_staff_number_check
    check (staff_number ~ '^[0-9]{5,6}$');
exception when duplicate_object then null; end $$;

-- الفهرس على ما سيُرشَّح عليه السجلّ: «دخول المنطقة الشرقية في هذه الدورة».
create index if not exists staff_access_region_idx
  on public.staff_access_log (region, entered_at desc);
