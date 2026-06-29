---
name: kpi-narrative-writer
description: Generate bilingual executive narrative from sec_kpis / pulse_kpis / hajj_kpi_snapshots. Use for daily briefings, weekly reports, and aria_reports synthesis.
---

# KPI Narrative Writer

## Structure (always bilingual AR primary, EN secondary)
1. **Headline** — single sentence, the most material change.
2. **What moved** — top 3 KPIs with delta vs prior period.
3. **Why** — link to underlying incidents/permits/patrols.
4. **So what** — operational implication.
5. **Next** — recommended action with owner.

## Rules
- Never fabricate numbers. Every figure must cite `{table}.{column}@{timestamp}`.
- If data unavailable: write "البيانات غير متوفرة" / "Data unavailable", do NOT estimate.
- Round percentages to 1 decimal, counts to integer.
- Use plain language; avoid jargon unless the recipient is a security professional.

## Output
Markdown report saved into `aria_reports.body_md` with `evidence_refs` array.
