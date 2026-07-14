# NEXIOS AI OS

منصة ذكاء تنفيذي ثنائية اللغة، تتضمن مركز قيادة تفاعليًا، آريا، طبقة
صلاحيات متعددة المستأجرين، وتكاملات مؤسسية قابلة للتهيئة.

## المتطلبات

- Node.js 22 أو 24
- npm 10 أو أحدث
- مشروع Supabase عند تشغيل الوظائف الحية

## التشغيل المحلي

```bash
cp .env.example .env.local
npm ci
npm run dev
```

املأ فقط القيم المطلوبة في `.env.local`. لا تُودع مفاتيح الإنتاج أو
`SUPABASE_SERVICE_ROLE_KEY` في المستودع.

## بوابة الإصدار

```bash
npm run check
npm audit --omit=dev
```

تجمع `npm run check` بين ESLint، فحص TypeScript، اختبارات Vitest، وبناء
الإنتاج. اختبارات E2E التي تعتمد على Supabase تُشغّل عبر `npm run test:e2e`
بعد توفير بيانات بيئة الاختبار.

## النشر

Cloudflare Workers هو هدف الإنتاج الأساسي. راجع [DEPLOYMENT.md](DEPLOYMENT.md)
لأسماء الأسرار، تطبيق ترحيلات Supabase، خطوات الإطلاق، والتراجع. يوجد
`vercel.json` كمسار يدوي اختياري فقط.

## التوثيق

- [ARCHITECTURE.md](ARCHITECTURE.md) — بنية النظام
- [SECURITY.md](SECURITY.md) — الضوابط الأمنية والإبلاغ
- [TESTING.md](TESTING.md) — بوابات الجودة والاختبارات الحية
- [KNOWN_EXTERNAL_DEPENDENCIES.md](KNOWN_EXTERNAL_DEPENDENCIES.md) — الخدمات الخارجية وحالات fallback
- [RELEASE_NOTES.md](RELEASE_NOTES.md) — ملاحظات الإصدار

البيانات الظاهرة داخل صورة مركز القيادة نموذجية للعرض؛ الأزرار الشفافة
الموضوعة فوقها حقيقية وقابلة للتنقل، وتُظهر الواجهة المنطقة النشطة صراحة.
