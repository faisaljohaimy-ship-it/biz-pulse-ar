# بوابات تفعيل الوكلاء والأدوات

لا يُفعّل أي سجل قبل نجاح جميع البنود ذات الصلة.

## الأداة

- adapter منفذ ومراجع، وليس mock أو descriptor.
- بيانات الاعتماد في secret manager وبأقل صلاحية.
- اختبار tenant isolation سلبي وإيجابي.
- رفض الحقول غير المعروفة والتحقق من JSON Schema.
- منع SSRF وتطبيق allowlist للمضيفين في أدوات HTTP.
- idempotency واكتشاف التكرار.
- timeout وحدود حجم ومعدل.
- audit trace كامل بلا أسرار.
- موافقة بشرية لكل write/action/admin.
- rollback أو compensation مجرّب.
- اختبار فشل المزوّد والمهلة والاستجابة الجزئية.

## الوكيل

- جميع tool allowlists تشير إلى أدوات منفذة ومفعلة.
- جميع السكلز المختارة مفعلة للمؤسسة.
- مجموعة eval تشمل طبيعي، حدي، عدائي، ونقص الأدلة.
- اختبار prompt injection وgoal hijack وtool misuse وmemory poisoning.
- منع تفويض يوسع الصلاحية أو يتجاوز الموافقة.
- قياس الجودة، grounding، latency، cost، وapproval compliance.
- قناة تصعيد بشرية وkill switch واختبار rollback.

## التفعيل التدريجي

1. read-only داخلي.
2. advisory بلا side effects.
3. write منخفض الأثر مع موافقة.
4. action محدود مع compensation.
5. privileged action بعد مراجعة أمنية مستقلة.

أوقف التفعيل عند أي تسرب بين المؤسسات، تنفيذ بلا موافقة، ادعاء بلا دليل، أو فقدان لسجل التدقيق.
