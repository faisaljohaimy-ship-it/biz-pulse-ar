# NEXIOS Content Packs — حالة التثبيت

**ثلاث حزم مورَّدة (vendored) كأصول واصفة — لا شيء منها مفعَّل.**
Installed as descriptor assets; NOTHING here is activated.

| الحزمة | المحتوى | الحالة |
|---|---|---|
| `nexios-modern-skills-pack` v1.0.0 | 144 skill (`nx-*`) في 12 مجالًا + سجل JSON + مخطط + ترحيل SQL + محمّل TS | واصفات فقط · `enabled=false` |
| `nexios-modern-agents-tools-pack` v1.0.0 | 72 وكيلًا (`nx_*`) + 180 أداة (`nx.*`) + ارتباطات + سجل MCP + بطاقات A2A + OpenAPI + ترحيل SQL | `descriptor_only` · `enabled=false` |
| `nexios-modern-stack` v1 | promptfoo evals + سير CI (sadeed-quality) + طبقة OTel GenAI + استراتيجية MCP | أصول غير موصولة |

## ما جرى عند التثبيت (وما لم يجرِ)

- ✔ التحقق من سلامة الحزمتين بالـ checksums (503 ملفًا، صفر فشل) وتشغيل
  مدقّقيهما الرسميين: «144 skills validated» و«72 agents and 180 tools
  validated».
- ✔ فحص أمان: لا أسرار، لا أوامر SQL هدّامة، كل أعمدة `enabled` تفترض
  `false`، ودالة التثبيت في قاعدة البيانات مقصورة على `service_role`.
- ✘ **لم تُطبَّق ترحيلات SQL** — ملفا `db/*.sql` أصلان مرجعيان هنا ولم
  يُنقلا إلى `supabase/migrations/`؛ وثيقتا التثبيت تشترطان مراجعة في
  بيئة غير إنتاجية وتحديد `org_id` صراحة (`INSTALL_IN_NEXIOS_AR.md`).
- ✘ **لم يُفعَّل سير CI** — `nexios-modern-stack/ci/sadeed-quality.yml` لم
  يُنسخ إلى `.github/workflows/` (وثيقة الحزمة نفسها: بعد العرض
  التنفيذي، مع تثبيت الإصدارات).
- ✘ لا وكيل ولا أداة ولا skill دخل مسارات التطبيق أو الحزم المبنية —
  `packs/` خارج نطاق tsc/vitest/knip، ومستثناة من eslint/prettier
  (أصول مثبّتة البصمة، إعادة تنسيقها تكسر التحقق).

## مسار التفعيل المحكوم (لاحقًا، ليس الآن)

1. مراجعة `db/*.sql` في بيئة غير إنتاجية ثم اعتمادها ترحيلًا رسميًا
   (بوابة `nexios-supabase` + `nexios-qa-guardian`).
2. تغذية الواصفات إلى بنية Adaptive Shell عبر باب القبول الوحيد
   (`admitCapability` / `admitSkill` / `admitAgent`) — تدخل `registered`
   وتمر دورة الاعتماد البشرية كاملة قبل أي `active`.
3. تنفيذ adapters حقيقية للأدوات المطلوبة فقط، بأقل صلاحية، خلف
   `ACTIVATION_GATES_AR.md` — أداة قراءة واحدة أولًا، ثم وكيل واحد
   advisory. لا تفعيل جماعيًا أبدًا.
4. أصول `nexios-modern-stack` (CI ثم evals ثم otel ثم mcp) بترتيب
   وثيقتها وبعد العرض التنفيذي.

المراجع داخل كل حزمة: `README_AR.md` · `INSTALL_IN_NEXIOS_AR.md` ·
`ACTIVATION_GATES_AR.md` · `SOURCES_AND_LICENSES.md` (MIT).
