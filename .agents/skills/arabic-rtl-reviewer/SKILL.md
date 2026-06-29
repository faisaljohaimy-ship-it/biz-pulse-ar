---
name: arabic-rtl-reviewer
description: Review Arabic UI strings, RTL layout, and security terminology accuracy. Use before shipping any user-facing screen or report.
---

# Arabic RTL Reviewer

## RTL Layout Checks
- `dir="rtl"` on root or component tree where Arabic dominates.
- Logical CSS properties: `padding-inline-start` over `padding-left`; `margin-inline-end` over `margin-right`.
- Icons that imply direction (arrows, chevrons) mirrored in RTL.
- Numbers and Latin technical terms remain LTR within RTL paragraphs (use `<bdi>` or `unicode-bidi: isolate`).
- Tables: first column visually on the right.

## Terminology (NEXUS security domain)
| EN | AR (preferred) | Notes |
|---|---|---|
| Incident | حادث | not "حادثة" (event) |
| Permit-to-Work | تصريح عمل | full form first use |
| Patrol | دورية | |
| Asset | أصل | plural: أصول |
| Visitor | زائر | |
| Contractor | مقاول | |
| Site | موقع | not "موقع إلكتروني" |
| Shift Handover | تسليم وردية | |
| Hot Work | عمل ساخن | hyphen in EN, no hyphen in AR |
| Confined Space | حيز محصور | |

## Tone
- Formal Modern Standard Arabic (فصحى معاصرة).
- No transliteration of common terms (use "تقرير" not "ريبورت").
- Honorifics in executive reports: "سعادة" for officials, "المهندس/ة" for engineers.

## Output
`{ file, issues: [{type: layout|terminology|tone, line, suggestion}] }`
