---
name: microcopy-polisher
description: Polish UI microcopy — buttons, labels, empty states, tooltips, error messages, confirmations — for clarity, consistency, and voice. Use when the user asks to improve interface text, fix error messages, or review the wording in a screen or component.
---

# Microcopy Polisher

Make every string in the interface do exactly one job, clearly, in the product's voice.

## When to trigger
- "Improve the text in this screen / component / form"
- Rewriting error messages, empty states, tooltips, confirmation dialogs
- A copy consistency pass before release

## Process
1. **Inventory the strings** in scope with their context (where shown, what the user is doing at that moment).
2. **Apply the core rules**:
   - **Buttons say what happens**: "Save changes", not "Submit"; the action keeps its name through the flow (Publish → "Published").
   - **Errors = what went wrong + how to fix it**, in the interface's voice. Never vague ("Something went wrong"), never blaming, no apology theater.
   - **Empty states invite action**: what this space is for + the first step to fill it.
   - **Tooltips add information**, never repeat the label.
   - **Confirmations state consequence**: "Delete 3 files? This can't be undone." with verbs, not Yes/No.
3. **Consistency sweep**: one term per concept across the product (don't mix "remove/delete", "sign in/log in"). Sentence case. Active voice. No filler ("please", "successfully" — usually cuttable).
4. **Deliver as before → after table** with a one-line reason per change; flag strings needing a product decision separately.

## Arabic/RTL addendum
- Keep Arabic UI text concise (Arabic runs ~20–25% longer); verify button/label overflow.
- Numerals: follow the product convention consistently (Arabic-Indic vs Latin), tabular in data contexts.
- Mixed-direction strings (Latin brand names inside Arabic text): mark where directional isolation is needed.

## Quality bar
A first-time user never pauses to interpret a control, and error recovery needs no support ticket.
