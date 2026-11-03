---
name: nexios-supabase
description: طبقة بيانات سَدِيد على Supabase — تُستدعى قبل كتابة أي migration أو سياسة RLS أو استعلام أو دالة خادم تقرأ البيانات. تغطي مخطط HCIS الفعلي، قواعد anon، نمط resilient()/optionalSupabaseAuth، وقاعدة is_simulation.
---

# سَدِيد Supabase — طبقة البيانات

## المشروع

- **مشروع الإنتاج الفعلي: `cnaevysaoimzusnvpazr`** — Supabase مستقل تحت
  حساب المالك (`ACTIVE_HEALTHY` بحسب `list_projects` ٢٠٢٦/١١/٠٣). يحمله
  اليوم `supabase/config.toml` و`BUILTIN_PROJECT_REF` ومانيفست MCP وحرفيات
  `vite.config.ts`، ويحرس اتفاقها `src/lib/mcp/project-ref.test.ts`.
- **`jhutlofapjfjjeajawie` مجمَّد منذ ٢٠٢٦/١٠/٢٢ ولا يُستهدف أبدًا.** هو
  نسخة Lovable Cloud القديمة؛ كل كتابة عليها ترفض بـ`25006`. فأي
  `apply_migration` أو `deploy_edge_function` أو `--project-ref` موجَّه إليه
  يفشل مغلقًا، أو — أسوأ — يشهد بصحة RLS على لقطة أقدم من الإنتاج. ملفات
  `supabase/migrations/**` تحمل اسمه في تاريخها ولا تُعدَّل.
- اتفاق الملفات على معرّفٍ **ليس برهانًا** أنه الصحيح (غُيِّر المعرّف مرّات
  من الذاكرة فصارت الملفات متّسقة وخاطئة): الحاكم هو الإنتاج الحيّ
  (`/.well-known/oauth-protected-resource` المنشور، و`list_projects` بحساب
  المالك) — راجع المادة ٤ في الدستور. و`config.toml` يوجّه أدوات CLI لا
  التطبيق؛ `VITE_SUPABASE_URL` البيئي هو ما يستعمله التطبيق وقت التشغيل.
- **أي تغيير على قاعدة الإنتاج (ترحيل أو DDL أو كتابة بيانات) خلف إذن المالك
  الصريح** — ولو لم يكن مدمِّرًا (CLAUDE.md، ٢٠٢٦/١٠/١٣). القراءة الخالصة
  للفحص ليست تغييرًا.
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
    const { resilient, buildXSimulation } = await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "x-overview",
      () => fetchX(context.supabase), // القراءة الحية
      (r) => r.rows.length === 0, // فارغة؟
      () => buildXSimulation(Date.now()), // المحاكاة المرجعية
    ); // سقف 4 ثوانٍ مدمج — الصفوف الحية تفوز متى وصلت
  });
```

- في العميل: أي `useQuery` قراءة عرض تُسابق 4 ثوانٍ (انظر
  `makeHooks.useList` في `src/lib/enterprise-domains.ts`) ولا تُقفل
  بـ `enabled: !!user` — البوابة الوحيدة `!authLoading`.
