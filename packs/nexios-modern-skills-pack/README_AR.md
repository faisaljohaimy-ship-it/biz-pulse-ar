# حزمة NEXIOS للسكلز الحديثة

حزمة هندسية أصلية تضم **144 Skill** موزعة على **12 مجالًا**. صُممت لتُضاف دون الكتابة فوق السكلز الحالية؛ فجميع المعرّفات تبدأ بـ `nx-`.

## ماذا تحوي؟

- `skills/`: مجلد مستقل لكل Skill مع ملف `SKILL.md` صالح وبسيط.
- `registry/skills.registry.json`: سجل موحّد قابل للقراءة البرمجية.
- `db/20260724_nexios_modern_skills.sql`: جدول Registry وتهيئة RLS واستيراد آمن غير مفعّل.
- `src/nexios-skill-loader.ts`: محمّل واختيار لغوي خفيف مناسب لبنية NEXIOS.
- `schemas/`: عقود JSON Schema 2020-12.
- `scripts/validate-pack.mjs`: تحقق بلا اعتماديات خارجية.
- `CATALOG_AR.md`: جدول كامل بجميع السكلز.

## مبدأ الأمان

ملفات `SKILL.md` وحدها لا تُشغّل أدوات ولا تمنح صلاحيات. التفعيل الحقيقي يتطلب ربط الـ Registry بالـ runtime، واختبار RLS، وتحديد الأدوات المسموحة، وتسجيل الموافقات والتتبّع.

## تحقق سريع

```bash
node scripts/validate-pack.mjs
```

النتيجة المتوقعة: `144 skills validated`.

راجع `INSTALL_IN_NEXIOS_AR.md` قبل الدمج.
