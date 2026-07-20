---
name: nexios-supabase
description: طبقة بيانات NEXIOS على Supabase — تُستدعى قبل كتابة أي migration أو سياسة RLS أو استعلام أو دالة خادم تقرأ البيانات. تغطي مخطط HCIS الفعلي، قواعد anon، نمط resilient()/optionalSupabaseAuth، وقاعدة is_simulation.
---

# NEXIOS Supabase — طبقة البيانات

## المشروع
- المشروع النشط الذي صرّح به المالك: `khytdwgyrnztqabhfgbb`.
- تنبيه: `supabase/config.toml` ما زال يحمل `jhutlofapjfjjeajawie` القديم —
  لا تستنتج المشروع من config.toml؛ `VITE_SUPABASE_URL` البيئي هو الفيصل.
- **عميل واحد موحّد** `src/integrations/supabase/client.ts` — لا تنشئ
  عملاء جددًا. على الخادم: `supabaseAdmin` من `client.server.ts` للكتابات
  الإدارية فقط.

## مخطط HCIS الفعلي (migration `20260719200000_hcis_framework_tables_seed_anon.sql`)
- `hcis_directives` — 21 صفًا: `code` (SEC-01…SEC-19, SEC-RC, SAF-GEN)،
  `category`، `name_ar`، `name_en`، `scope_ar`، `issue_note_ar`، `sort_order`.
- `hcis_sectors` — 13 قطاعًا.
- `hcis_approval_stages` — 7 مراحل: `stage_no`، `name_ar`، `name_en`،
  `description_ar`.
- `hcis_compliance_status` — 76 صفًا (19 توجيهًا × 4 مناطق):
  `directive_code`، `region_code`، `status` (الافتراضي `not_assessed`)،
  `priority`، `is_simulation`.
- تصاريح العمل: `permit_types` + `permits` (org العرض
  `00000000-0000-0000-0000-00000000d360`، مراجع `PTW-SIM-*`).

## RLS
- جداول HCIS وPTW العرضية: `select` مفتوح لـ anon + authenticated.
- `aria_knowledge` خلف المصادقة **حصريًا** — لا يُفتح لـ anon أبدًا.
- الكتابات دائمًا خلف `requireSupabaseAuth`؛ القراءات العرضية خلف
  `optionalSupabaseAuth` (لا Unauthorized للزائر أبدًا).

## قواعد الـ migrations
- **idempotent دائمًا**: `create table if not exists`،
  `on conflict … do nothing`، `drop policy if exists` قبل الإنشاء.
- لا تمس بيانات قائمة؛ الإضافة فقط. كل صفوف العرض `is_simulation = true`.

## نمط القراءة المعتمد («بيانات لا تفرغ» — CLAUDE.md)
```ts
// دالة خادم عرضية — لا تعلّق ولا تفرغ ولا ترفض الزائر:
export const getXOverview = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }) => {
    const { resilient, buildXSimulation } = await import(
      "@/lib/exec/showcase-simulation.server"
    );
    return resilient(
      "x-overview",
      () => fetchX(context.supabase),      // القراءة الحية
      (r) => r.rows.length === 0,          // فارغة؟
      () => buildXSimulation(Date.now()),  // المحاكاة المرجعية
    ); // سقف 4 ثوانٍ مدمج — الصفوف الحية تفوز متى وصلت
  });
```
- في العميل: أي `useQuery` قراءة عرض تُسابق 4 ثوانٍ (انظر
  `makeHooks.useList` في `src/lib/enterprise-domains.ts`) ولا تُقفل
  بـ `enabled: !!user` — البوابة الوحيدة `!authLoading`.
