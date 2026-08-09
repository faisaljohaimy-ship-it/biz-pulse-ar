# 03 — Card Library · مكتبة البطاقات

**Extends Constitution Ch. 08 (the eight canonical cards) into the full thirteen-card
component set. Ch. 08's shared anatomy + base values are the base spec here — this doc
adds the five derived cards and binds all to component contracts.**

---

## Base spec — inherited verbatim from Constitution Ch. 08

Padding 24/32/16 by register · radius `--nx-radius-16` (nested 12, chips 8) · glass
surface 65% blur 12 · border white 8% · elevation E1→E2 hover · skeleton loading ·
designed empty/error · hover 150ms no-scale.

## The thirteen cards

### Canonical eight (spec of record: Constitution Ch. 08)

| Component              | Arabic            | Constitutional deltas recap                                     |
| ---------------------- | ----------------- | --------------------------------------------------------------- |
| **NxExecutiveCard**    | البطاقة التنفيذية | radius 20, hero-only glow, single-action, gold approval-pending |
| **NxAnalyticsCard**    | بطاقة التحليلات   | analytics top-border 2px @24%, no glow, one chart               |
| **NxRuntimeCard**      | بطاقة التشغيل     | runtime border, state chip, body never turns red                |
| **NxSadeedCard**       | بطاقة SADEED      | agent border+ring, 72% glass, evidence row, gate variant        |
| **NxKnowledgeCard**    | بطاقة المعرفة     | knowledge border, freshness label, drawer preview               |
| **NxShellCard**        | بطاقة الصدفة      | violet border, kind+version chips, dashed draft                 |
| **NxTwinCard**         | بطاقة التوأم      | twin border, viz zone with sector pulse, telemetry trio         |
| **NxNotificationCard** | بطاقة الإشعار     | 16 padding, 12 radius, severity edge-bar, triple redundancy     |

### Derived five

| Component                                              | Purpose                                                                                                                                                                    | Structure & overrides                                                                                                                                                                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NxAlertCard**                                        | An active alert as a workable object (vs the feed's NotificationCard)                                                                                                      | NotificationCard + expanded body: impact line, affected-systems chips, two actions (acknowledge Ghost / act Secondary); critical = one-time 2-pulse ring (Ch. 06)                                                            |
| **NxRiskCard**                                         | One risk with severity + trajectory                                                                                                                                        | Executive base; severity chip (status color + Arabic word + glyph), risk score as KPI Number sm, trend arrow; border tinted status @ 24%; **body fill never status-colored**                                                 |
| **NxApprovalCard**                                     | A pending human decision                                                                                                                                                   | SadeedCard gate variant promoted to standalone: request summary, requester, evidence count, deadline label; footer = solid strip, gold accent, Approve (Executive Action sm) + Decline (Outline); the only card allowed gold |
| **NxKpiCard**                                          | One KPI with context                                                                                                                                                       | Executive base md; KPI Number (doc 05) + delta chip + sparkline slot + unit/time footer; grid-cap 4-across (Ch. 09)                                                                                                          |
| **NxSummaryCard** / **NxStatusCard** / **NxGlassCard** | Summary: N-up fact rows · Status: entity + state chip + last-event · Glass: the bare glass container primitive the others extend (exposed for ambient-strata content only) | Summary: label/value rows 40px; Status: 16 padding, chip mandatory; Glass: base spec with empty slot — using it to invent a fourteenth card is a finding                                                                     |

_(Counted as thirteen: eight canonical + Alert, Risk, Approval, KPI, and the
Summary/Status/Glass trio specified as one family row for brevity — each is its own
component with the listed structure.)_

## Shared card laws (binding)

1. Elevation/glow/shadow per Constitution Ch. 06 — cards never invent depth.
2. One card class per grid section; cards never nest cards (drawer instead).
3. Every data card renders the four truths (Standards §7) in its footer.
4. Animation: entrance = fade+4px rise 200ms stagger 30ms (list mounts only); no
   entrance animation on pagination/filter re-renders (data changes ≠ theater).
5. Responsive: cards are fluid within their grid columns; below 640px all cards are
   full-width; KPI cards pair 2-up down to 360px then stack.
