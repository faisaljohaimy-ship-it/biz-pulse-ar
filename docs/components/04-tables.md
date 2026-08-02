# 04 — Table System · نظام الجداول

**Tables are the Operations register's native habitat (Constitution Ch. 02). They exist
one disclosure level below dashboards — never as tier-1 hero content.**

---

## Base spec (`NxDataTable` — all tables extend it)

| Property                  | Value                                                                           |
| ------------------------- | ------------------------------------------------------------------------------- |
| Container                 | Panel anatomy; glass E1; internal scroll, page never scrolls horizontally       |
| Row height                | 36 / 44 / 56 by density (`operations` default 44)                               |
| Header row                | 48px, Label 12 @ 56%, `--nx-ink` @ 95%, **sticky** by default                   |
| Cell type                 | Body-compact 14; numbers tabular Latin, left-aligned; Arabic text right-aligned |
| Zebra                     | none — row separators 1px white 6% (zebra fights glass)                         |
| Row hover                 | 6% wash; row focus ring inside-row                                              |
| First column (right, RTL) | identity column, sticky on horizontal scroll                                    |
| Provenance footer         | count + آخر تحديث + simulation badge                                            |

**Column rules:** ≤ 8 visible by default; overflow columns behind a column-picker Icon
Button; column widths from content type (id 96–128, text flexible min 160, number 112,
date 128, status 112, actions 96); truncation with tooltip, numbers never truncate.

**Selection rules:** checkbox column appears only when the table has batch actions;
leading (rightmost); header checkbox = tri-state; selecting reveals a Floating action
bar (doc 01) with count; selection survives sort/filter, not navigation; max-selection
guard announces limits.

**Sorting:** single-column; header click cycles ▲ → ▼ → off with glyph + `aria-sort`;
default sort declared per table (never "whatever the API returned").

**Filtering:** filter chips row above header (removable ×, "مسح الكل" ghost); complex
filters live in a drawer, applied filters always visible as chips — hidden active
filters are banned.

**Searching:** NxSearchInput in the panel header, local debounce, highlights matches;
empty result = designed empty state with "امسح البحث" action.

## The seven tables

| Component              | Purpose                                             | Overrides                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NxDataTable**        | The general workhorse                               | base                                                                                                                                                                      |
| **NxExecutiveTable**   | Few rows, decision-grade (top risks, pending items) | Command density 56px rows, Body 16, ≤ 5 columns, ≤ 10 rows, no pagination — beyond 10 belongs in DataTable behind disclosure; verdict column may use KPI Delta            |
| **NxRuntimeTable**     | Modules/services state                              | runtime layer top-border; state chips column mandatory; row action = Runtime Button sm                                                                                    |
| **NxApprovalTable**    | Queues of pending human gates                       | ApprovalCard's footer logic in rows: gold Approve sm + Outline Decline; deadline column with warning tint ≤ 24h; batch approve requires confirm modal listing items       |
| **NxAuditTable**       | Tamper-evident trails                               | append-only affordance (no delete/edit anywhere); hash/seq column mono Latin; verification badge in footer (✓ سلسلة سليمة); export action                                 |
| **NxTimelineTable**    | Time-keyed events in tabular form                   | first data column = time (sticky pattern with identity); relative time + absolute on hover; day separator rows                                                            |
| **NxInteractiveTable** | Rows as navigation (drill-down)                     | whole-row click affordance (chevron trailing-left), row hover elevates 6→8% wash; row click never conflicts with cell actions (actions column excluded from row hit-area) |

## Responsive contract

≥1024: full table. Tablet: horizontal scroll within panel, identity column sticky.
Mobile: transforms to key-value **Status/Summary cards** (doc 03) — the four most
important columns become card rows, the rest behind per-card disclosure; batch selection
unavailable on mobile (by design, not omission).

## A11y

`<table>` semantics always (grid role only for InteractiveTable), caption = panel title,
row/col headers associated, keyboard: arrows move cell focus, Enter activates row
(Interactive), Space toggles selection.
