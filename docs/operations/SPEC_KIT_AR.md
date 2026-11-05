# استخدام GitHub Spec Kit في سديد

يستخدم Claude Code وCodex CLI نفس مواصفات الميزة وخطتها ومهامها داخل هذا المستودع. افتح نسخة حديثة من الفرع، ثم ابدأ بوصف المطلوب بالعربية أو استدعِ المهارة مباشرة. في التعديلات الصغيرة يكفي معيار قبول واحد وفحص يثبته.

## الأوامر المستخرجة من الفيديو

| المرحلة        | Claude Code             | Codex CLI               | المخرج                                                       |
| -------------- | ----------------------- | ----------------------- | ------------------------------------------------------------ |
| قواعد المشروع  | `/speckit-constitution` | `$speckit-constitution` | الرجوع إلى دستور سديد المعتمد. يخضع أي تعديل للمادة الثانية. |
| مواصفات الميزة | `/speckit-specify`      | `$speckit-specify`      | تحديد المستخدم والسلوك المطلوب ومعايير القبول في `spec.md`   |
| خطة التنفيذ    | `/speckit-plan`         | `$speckit-plan`         | ربط المتطلبات بالمكونات والقيود والاختبارات في `plan.md`     |
| توزيع المهام   | `/speckit-tasks`        | `$speckit-tasks`        | مهام مرتبة وتبعيات قابلة للمتابعة في `tasks.md`              |
| التنفيذ        | `/speckit-implement`    | `$speckit-implement`    | تطبيق المهام وتحديث حالتها                                   |
| مطابقة التنفيذ | `/speckit-converge`     | `$speckit-converge`     | مقارنة النتيجة بالمواصفة وإضافة مهام للفجوات ثم إعادة التحقق |

مثال لبدء ميزة في Claude Code

```text
/speckit-specify أريد أن يحتفظ نموذج البلاغ بالمسودة عند انقطاع الشبكة وأن يستعيدها المستخدم عند فتحه مجددًا.
```

للمتابعة في Codex، افتح الفرع نفسه واستدعِ `$speckit-plan` مع مسار المواصفة. احفظ وثائق الميزة مع الفرع عند الانتقال بين الجهازين أو الوكيلين. تجنب تضمين سجلات إنتاج أو بيانات شخصية في المواصفات.

## مسارا الأخطاء وتقييم الأفكار

عرض الفيديو المسارين بوظيفتيهما. يوضح الجدول أسماء المهارات في الإصدار المثبّت. استخدم البادئة `/` في Claude Code و`$` في Codex.

| المسار     | المهارات بالترتيب                                                                                                            | النتيجة                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| إصلاح خطأ  | `speckit-bug-assess`، `speckit-bug-fix`، `speckit-bug-test`                                                                  | تقييم البلاغ، إصلاح السبب ثم إعادة الاختبار. يجتمع الدليل تحت `.specify/bugs/<slug>/`.                                  |
| تقييم فكرة | `speckit-assess-intake`، `speckit-assess-research`، `speckit-assess-define`، `speckit-assess-shape`، `speckit-assess-decide` | توثيق المشكلة والأدلة والخيارات ثم قرار بالمضي أو طلب إيضاح أو التوقف. تحفظ الوثائق تحت `.specify/assessments/<slug>/`. |

يتضمن الإصدار أيضًا `speckit-clarify` لتوضيح المتطلبات، و`speckit-checklist` لإعداد قائمة تحقق، و`speckit-analyze` لفحص الاتساق بين المواصفة والخطة والمهام. بذلك تتوفر 17 مهارة لكل وكيل.

## الأدوات التي ظهرت في المقطع

الأداة المحورية هي **GitHub Spec Kit**. برزت أوامر المواصفات بين الثانية 15 و30 تقريبًا، ثم مسارا الأخطاء وتقييم الأفكار. أبرز جدول التكاملات **Claude Code** و**Codex CLI** و**Hermes** بين الثانية 36 و40 تقريبًا. الإعداد المشترك هنا مخصص للأولين. يخزن Hermes مهاراته في حساب مستخدم الجهاز، وتشرح وثائقه كيفية إعداده. [تكامل Hermes الرسمي](https://github.github.com/spec-kit/integrations/hermes.html)

ومن الأسماء المقروءة في خلفية جدول التكاملات Alquimia AI، Amp، Antigravity، Auggie CLI، Cline، CodeBuddy CLI، Command Code، Cursor، DeepSeek Harness، Devin for Terminal، Docker Agent، Factory Droid، Firebender، Forge، Gemini CLI، GitHub Copilot، Goose، Grok Build، IBM Bob، Junie، Kilo Code، وKimi Code. عرض الجدول هذه الأدوات كعملاء متوافقين.

## الإصدار والتشغيل

ملفات المهارات مأخوذة من GitHub Spec Kit **v1.3.1** بترخيص MIT. يكتشف Claude Code مهارات المشروع من `.claude/skills/` ويكتشفها Codex من `.agents/skills/`. تشترك النسختان في `.specify/`. يشير `.specify/memory/constitution.md` إلى دستور سديد المعتمد. [الإصدار الرسمي](https://github.com/github/spec-kit/releases/tag/v1.3.1) · [ترخيص النسخة](../../.specify/LICENSE)

عند الحاجة إلى أوامر إدارة الحزمة في الطرفية، ثبّت الإصدار نفسه في بيئة التطوير ثم اعرض حالة التكامل.

```sh
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.3.1
specify integration status
```
