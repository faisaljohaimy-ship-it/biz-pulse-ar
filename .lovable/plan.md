## الهدف
رفع تغطية NEXUS من 22 وكيلاً إلى 32 وكيلاً (+10) مع 8 سكلز جديدة لسد الفجوات التشغيلية والحَوْكَمية بدون أي محاكاة.

## الفجوات المُكتشَفة (بناءً على الجداول الموجودة)
| الجدول | بدون وكيل مخصص |
|---|---|
| `sec_cctv_alerts` | ✗ |
| `sec_contractors` | ✗ |
| `sec_vehicles` | ✗ |
| `sec_assets` + `sec_sensors` | ✗ |
| `pulse_crises` | ✗ |
| `cost_budgets` + `ai_usage` | ✗ |
| `governance_policies` (استعلام) | ✗ |
| تسليم الورديات | ✗ |
| جودة البيانات | ✗ |
| التدريب التشغيلي عبر RAG | ✗ |

## الوكلاء الـ10 الجدد (يُحقنون في `agent_definitions` عبر `supabase--insert`)

| # | id | الدور | الأدوات |
|---|---|---|---|
| 1 | `cctv_intelligence` | ربط تنبيهات CCTV بالحوادث | `sql.read`, `aria.report.write` |
| 2 | `contractor_compliance` | تدقيق `sec_contractors` (CR/التأمين/الشهادات) | `sql.read`, `aria.report.write` |
| 3 | `vehicle_access_controller` | فحص `sec_vehicles` والقائمة السوداء | `sql.read`, `aria.report.write` |
| 4 | `asset_health_monitor` | كشف شذوذ `sec_sensors`/`sec_assets` | `sql.read`, `aria.report.write` |
| 5 | `crisis_commander` | تنسيق `pulse_crises` P0/P1 | `sql.read`, `aria.report.write`, `m365.teams.post_message` |
| 6 | `shift_handover` | تقرير تسليم وردية | `sql.read`, `aria.report.write` |
| 7 | `policy_advisor` | استعلام `governance_policies` + RAG | `sql.read`, `aria.kb.search` |
| 8 | `training_coach` | تدريب تشغيلي بـ RAG | `aria.kb.search`, `aria.report.write` |
| 9 | `data_quality_steward` | كشف صفوف ناقصة/قديمة | `sql.read`, `aria.report.write` |
| 10 | `cost_governance_agent` | مراقبة `cost_budgets` + `ai_usage` | `sql.read`, `aria.report.write` |

كل وكيل: نموذج `openai/gpt-5`، system prompt عربي يلتزم Charter v10.0 (صفر تلفيق، fallback "البيانات غير متوفرة")، `enabled=true`.

## الـ8 سكلز الجديدة (`.agents/skills/`)
1. `cctv-incident-correlator` — مُصفوفة ربط Camera↔Incident
2. `contractor-vetting-matrix` — قواعد قبول/رفض المقاول
3. `vehicle-blacklist-check` — منطق فحص اللوحة والسائق
4. `asset-anomaly-detection` — نوافذ z-score/IQR لقراءات الحساسات
5. `crisis-decision-matrix` — مصفوفة قرار P0–P4 لأزمات `pulse_crises`
6. `shift-handover-report` — قالب تسليم وردية (Pending / Critical / Hot)
7. `data-quality-audit` — قائمة فحوصات (nulls/staleness/orphans)
8. `cost-anomaly-scan` — كشف انحراف `ai_usage` عن `cost_budgets`

ثم `skills--apply_draft` لكل سكل.

## التحقق (E2E، بدون محاكاة)
- تشغيل وكيل عيّنة `data_quality_steward` عبر `/api/public/hooks/run-agent`.
- التحقق من سلسلة الأدلة: `agent_runs` + `workflow_runs` + `tool_executions` + `audit_logs` + `aria_reports`.
- تقرير ختامي بنسبة الإنجاز.

## ما لن أفعله
- لا تعديل جداول/RLS (يكفي `supabase--insert` على `agent_definitions`).
- لا تغييرات UI.
- لا إعادة كتابة `tool_registry` (الأدوات موجودة).

## النتيجة النهائية
32 وكيلاً نشطاً + 8 سكلز جديدة + سلسلة أدلة حية لوكيل واحد على الأقل = تغطية تشغيلية وحوكمية شاملة.
