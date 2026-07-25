# تركيب الوكلاء والأدوات في NEXIOS

## المتطلبات

- طبّق حزمة السكلز أولًا حتى يتوفر `skill_registry`.
- استخدم بيئة غير إنتاجية وقاعدة بيانات احتياطية.
- حدّد `org_id` الصحيح صراحة؛ لا تعتمد على مؤسسة افتراضية.

## 1. طبّق الترحيل

راجع ثم طبّق:

```text
db/20260724_nexios_modern_agents_tools.sql
```

ينشئ جداول الربط ودالة تثبيت محكومة. لا يفعّل أي وكيل أو أداة.

## 2. ثبّت السجلات لمؤسسة محددة

من SQL Editor بصلاحية موثوقة:

```sql
select public.install_nexios_modern_agents_tools(
  '00000000-0000-0000-0000-000000000001'::uuid
);
```

استبدل UUID بمعرّف المؤسسة الصحيح بعد التحقق منه. دالة التثبيت متاحة لـ `service_role` فقط.

## 3. نفّذ الموصلات

لكل أداة ترغب بها:

1. نفّذ adapter حقيقيًا للمزوّد المحدد.
2. استخدم أقل صلاحية ممكنة.
3. طبّق input/output schema validation.
4. اربط RLS وorg_id ولا تسمح بأي fallback يعبر المؤسسات.
5. اربط approval ledger لكل write/action/admin.
6. طبّق idempotency وtimeout وretry الآمن وcompensation/rollback.
7. أرسل trace وmetrics وlogs دون أسرار.
8. اختبر provider sandbox ثم staging.

## 4. فعّل تدريجيًا

فعّل أداة واحدة للقراءة أولًا، ثم وكيلًا واحدًا في وضع advisory. لا تستخدم bulk enable. راجع `ACTIVATION_GATES_AR.md`.

## 5. تكامل البروتوكولات

- `mcp/tools.registry.json`: وصف أدوات قابل للتحويل إلى MCP server.
- `a2a/agent-cards/`: بطاقات نشر تستخدم نطاق `.invalid` الآمن حتى تستبدل بعنوان الخدمة الفعلي.
- `openapi/nexios-modern-tools.openapi.json`: عقد استدعاء موحّد؛ لا يمثل موصلات مكتملة.
- `workflows/safe-tool-invocation.arazzo.yaml`: تسلسل آمن للموافقة والتنفيذ والتحقق.
