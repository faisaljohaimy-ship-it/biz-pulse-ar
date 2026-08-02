# Chapter 04 — Typography System

**Two scripts, one voice. Canonical stacks (from `src/styles.css`):**
`--font-arabic: "Cairo", "IBM Plex Sans Arabic", system-ui` ·
`--font-sans: "Space Grotesk", "DM Sans", system-ui`

---

## Reasoning

Arabic is the host script: it sets the tone, the line-height, the rhythm. Cairo carries
warmth and authority at display sizes; IBM Plex Sans Arabic is the fallback with
excellent screen hinting. Latin (Space Grotesk) appears for identifiers, units and code —
it is deliberately more "technical" so English reads as _data_, Arabic as _voice_.
Numbers are a third register of their own: they are the currency of an executive OS and
get tabular, large, unmissable treatment.

## Script rules

1. UI copy, insights, FINN's voice: **Arabic**. English never leads a screen.
2. Mixed lines use bidi isolation (`dir="auto"` / `<bdi>`); layout direction never flips.
3. Latin identifiers inside Arabic text (SEC-18, KPI codes) render in the Latin stack at
   95% of the Arabic size to balance x-height.
4. Never letter-space Arabic. Never fake-bold either script.

## The type scale (8pt-aligned, rem-based, root 16px)

| Level               | Use                         | Size / Line | Weight (Ar) | Notes                              |
| ------------------- | --------------------------- | ----------- | ----------- | ---------------------------------- |
| **Display XL**      | Boardroom hero KPI          | 72 / 80     | 700         | numerals: Latin tabular            |
| **Display**         | Screen hero number          | 48 / 56     | 700         |                                    |
| **Executive Title** | Screen title (عنوان تنفيذي) | 32 / 40     | 700         | one per screen                     |
| **H2 Header**       | Section header              | 24 / 32     | 600         |                                    |
| **H3 Sub-header**   | Panel header                | 18 / 28     | 600         | 3 words max                        |
| **Body**            | Paragraphs, insights        | 16 / 28     | 400         | Arabic needs the tall 1.75 leading |
| **Body compact**    | Ops tables                  | 14 / 22     | 400         | Operations register only           |
| **Label**           | Chips, captions, axes       | 12 / 16     | 500         | 56% pearl opacity default          |
| **Micro**           | Provenance footers          | 11 / 16     | 500         | never for content                  |

## Numbers — الأرقام

- **All data numerals are Western Arabic (0-9), tabular-nums, Latin stack** — column
  alignment and boardroom legibility outrank stylistic purity; Eastern Arabic numerals
  (٠-٩) are reserved for prose dates inside sentences.
- KPI anatomy: value (Display) + unit (Label, 56%, after the number on its left in RTL) +
  delta chip (Label, status-colored, with ▲▼ glyph + sign). A KPI without unit and time
  reference is a Chapter-01 §4 violation.
- Percentages keep one decimal at most; money abbreviates Arabic-style (٢٫٤ مليون) in
  prose, `2.4M SAR` in tables.
- Numbers never wrap, never truncate; the container grows or the level drops.

## Weights

Cairo/Plex Arabic: 400 (body), 500 (labels), 600 (headers), 700 (display). Space
Grotesk: 400, 500, 700. **Four weights total per script, no 300, no 800+** — thin weights
ghost on glass, black weights clot Arabic ligatures.

## Spacing

- Paragraph spacing = 1 line-height unit; heading top margin = 2× its bottom margin
  (headings belong to what follows).
- Arabic line length 45–75 chars; labels never exceed one line.
- No hyphenation in either script; Arabic justification uses spacing, never kashida
  stretching in UI text.

## Responsive typography

Type scales by register and viewport (see Chapter 10 for breakpoints):

| Level           | Mobile | Desktop | Boardroom/4K |
| --------------- | ------ | ------- | ------------ |
| Display XL      | 40/48  | 72/80   | 96/104       |
| Display         | 32/40  | 48/56   | 64/72        |
| Executive Title | 24/32  | 32/40   | 40/48        |
| Body            | 15/26  | 16/28   | 18/30        |
| Label           | 12/16  | 12/16   | 14/20        |

Scaling is stepped (tokens per breakpoint), not fluid `clamp()` everywhere — stepped
scales keep the 8pt rhythm intact and are testable. The Boardroom column exists because
the wall display is read at 3–5m: minimum legible body there is 18px at 1080p-equivalent
density.

## Do / Don't

- ✅ One Executive Title per screen; ✅ tabular numbers in every table; ✅ units on every value.
- ❌ Mixed weights inside one label; ❌ Arabic in Space Grotesk; ❌ ALL-CAPS Latin longer
  than 4 characters; ❌ centered body paragraphs.
