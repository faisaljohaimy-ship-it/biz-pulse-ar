# حزمة NEXIOS للوكلاء والأدوات الحديثة

حزمة هندسية تضم:

- **72 وكيلًا حديثًا** بتعليمات تشغيل، سكلز، allowlists، ذاكرة، موافقات، KPIs، وفشل آمن.
- **180 أداة** بعقود JSON Schema، مخاطر، صلاحيات، موافقات، rollback، ومتطلبات موصل.
- سجل MCP للأدوات، وAgent Cards متوافقة مفاهيميًا مع A2A، ووثيقة OpenAPI موحّدة.
- ترحيل SQL آمن يضيف السجلات إلى `agent_definitions` و`tool_registry` دون تفعيلها.

## الصدق التشغيلي

كل الأدوات والوكلاء مضبوطة على:

```text
implementationStatus = descriptor_only
enabled = false
```

لا تصبح الأداة حقيقية إلا بعد تنفيذ adapter، وإضافة بيانات اعتماد مصرح بها، واختبار العزل والمخطط والموافقة والتتبّع والـ rollback. لا تتضمن الحزمة أسرارًا أو رموز وصول.

## التحقق

```bash
node scripts/validate-pack.mjs
```

راجع `INSTALL_IN_NEXIOS_AR.md` و`ACTIVATION_GATES_AR.md` قبل أي تفعيل.
