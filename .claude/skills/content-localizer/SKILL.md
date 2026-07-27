---
name: content-localizer
description: Translate and localize UI strings, docs, and marketing copy into target languages while preserving tone, variables, and formatting. Use when the user asks to translate app content, localize a product, adapt copy for a market (e.g. Arabic RTL), or prepare i18n string files.
---

# Content Localizer

Turn Claude into a localization specialist: translate and culturally adapt product content without breaking code, placeholders, or brand voice.

## When to trigger
- "Translate this app / page / strings to <language>"
- "Localize our product for <market>"
- Preparing or updating i18n files (JSON, .po, .strings, ARB)
- Adapting marketing copy or docs for a new region

## Process
1. **Inventory** the source content: identify strings, placeholders (`{name}`, `%s`, `{{count}}`), HTML/Markdown markup, and character-length constraints (buttons, labels).
2. **Clarify locale, not just language**: ar-SA vs ar-EG, pt-BR vs pt-PT. Ask once if ambiguous.
3. **Translate meaning, not words**: keep tone (formal/casual), adapt idioms, keep product/brand names untranslated unless instructed.
4. **Protect the technical layer**: never translate placeholders, keys, code, URLs, or variable names. Keep markup structure identical.
5. **Handle plurals and gender** per target-language rules (e.g., Arabic 6 plural forms).
6. **RTL awareness**: for Arabic/Hebrew/Farsi flag any UI strings that need direction handling (numerals, mixed Latin terms, punctuation mirroring).
7. **Deliver in the source format**: same file type, same keys, translations only in values.

## Output rules
- Side-by-side table for review when content is short; full localized file when content is long.
- Flag untranslatable or ambiguous strings in a short "needs decision" list instead of guessing silently.
- Note length overflows likely to break UI (translated string >130% of source for buttons/labels).

## Quality bar
A native speaker should not detect it was translated; an engineer should be able to drop the file in without a single key or placeholder breaking.
