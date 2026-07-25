# 02 — Input System · نظام الإدخال

**Where the executive speaks to the OS — by keyboard, by selection, by voice. Inputs are
near-solid (Constitution Ch. 02: controls are never ambiguous glass).**

---

## Base spec

| Property | Value |
|---|---|
| Height | 48 (md) · 40 (compact/Operations) |
| Background | `--nx-ink` @ 92% (near-solid) |
| Border | 1px white 14%; hover 20%; focus 2px `--nx-cyan` |
| Radius | `--nx-radius-12` |
| Padding-inline | 16; with leading icon 44 |
| Typography | Body 16 (prevents mobile zoom); placeholder pearl 56% |
| Label | Label 12, above the field, always visible (no placeholder-as-label, ever) |
| Help/error slot | Label 12 below; error = critical color + glyph + Arabic text |
| A11y | programmatic label association; error announced `aria-describedby`; required marked in text not color |
| RTL | text-align right; caret RTL; leading icon on right; Latin identifiers auto-bidi |

**States:** universal matrix + **Filled** (border 20%, value 100%) and **Read-only**
(no border change on hover, copy affordance).

## The fourteen inputs

| Component | Purpose | Overrides & behavior |
|---|---|---|
| **NxTextInput** | Single-line text | base |
| **NxPasswordInput** | Secrets | trailing reveal Icon Button (`aria-pressed`); paste allowed; no browser-bypass styling |
| **NxSearchInput** | Filter a local set | leading search glyph, trailing clear ×; filters live (debounce 200ms); Escape clears |
| **NxExecutiveSearch** | Global OS search | lg 56px, glass E3 when summoned (⌘K/palette), results grouped by domain chips (layer colors); max 7 visible results, keyboard-first |
| **NxCommandInput** | Palette command line | mono-flavored Latin slot inside Arabic UI; prefix `>` glyph; executes registered commands only (closed world — mirrors shell registries) |
| **NxVoiceInput** | Dictation into a field | TextInput + trailing Voice Button; interim transcript renders 72% until committed; mic state per doc 01 Voice |
| **NxTextarea** | Multi-line | min 3 rows, autosize to 8, then internal scroll; counter slot when maxed |
| **NxDropdown** | Pick one from ≤ ~12 | trigger = input-look + chevron (mirrors RTL); menu at E3, item height 40, check-glyph on selected |
| **NxAutocomplete** | Pick from large sets | SearchInput + E3 results; highlighted match in cyan; "no match" = designed empty (doc 12), never blank |
| **NxTagInput** | Multi-value (tags, approvers) | chips 8-radius inside field; Backspace edits last chip; chip remove ×; wraps to 2 rows then scrolls |
| **NxDatePicker** | Dates | dual calendar Hijri/Gregorian toggle chip; Western Arabic numerals; range mode; keyboard grid navigation |
| **NxTimePicker** | Times | 24h default; stepper columns (h/m); typing allowed |
| **NxFileUpload** | Evidence/documents | dashed 14% border dropzone, 24 padding; file rows with type glyph, size, remove; progress per doc 11; rejects outside accept-list with error state (never silent) |
| **NxVoiceRecorder** | Capture audio notes/commands | Voice Button + live waveform (agent-cyan bars, amplitude-driven), elapsed mono timer, stop/discard/confirm trio; playback row after capture; recording state announced to SR |

## Validation doctrine

Validate on blur, re-validate on change *after* first error (never punish mid-typing).
Error messages are Arabic, specific, and actionable ("الرمز يجب أن يطابق SEC-NN" not
"invalid input"). A form's submit Primary stays enabled — pressing it surfaces all
errors and focuses the first (disabled-submit hides the map to success).

## Motion

Menus/calendars open 200ms ease-out from the trigger edge (downward, RTL-anchored);
voice waveform is a licensed live loop; everything else is micro-motion only.
