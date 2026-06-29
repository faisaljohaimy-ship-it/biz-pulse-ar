---
name: shift-handover-report
description: Generate end-of-shift handover with Pending / Critical / Hot sections from sec_incidents, sec_patrols, sec_permits, sec_work_orders.
---

# Shift Handover Report

## Time Window
Default: last 8 hours (configurable to 12 for extended shifts).

## Sections
### 1. قيد التنفيذ (Pending)
- Open incidents not yet assigned
- Active permits expiring this shift
- Patrols in-progress past expected end

### 2. حرج (Critical)
- severity=critical incidents (open or contained)
- work_orders priority=critical not completed
- Visitor escort overdue

### 3. نقاط ساخنة (Hot Items)
- Sites with > 3 incidents in window
- Repeated false alarms (same camera_id ≥ 2)
- Contractor with expired safety cert on site

## Output Format
Bilingual AR/EN, IDs as real DB values, timestamps in Asia/Riyadh.

## Constraints
- Use only DB rows; never synthesize incident counts.
- Empty section → write "لا يوجد" instead of omitting.
