# FNN home chat identity — owner request, 2026-10-23

The owner supplied a portrait and requested FNN as a separate home-page bot, coordinated with Claude Code and Lovable. Base: `f476257408a25c1829cd812d823328b7aa1af830`.

## Continue existing implementation

Current main already has an owner-only `HomeFinnCard`, lazily rendered inline `FinnChat`, a separate client conversation state and `/finn` full-page view. This change does NOT create another agent, duplicate a chat instance, modify SADEED, or change an AI provider. It improves the existing card's separate identity.

- Replace `public/home/finn-portrait.webp` with a responsive derivative of the exact latest upload.
- Display size 96×120; image size 192×240, WebP 13,928 bytes. This supersedes earlier documentation referring to the 288×360 crop.
- Original uploaded JPEG SHA-256: `a93cd204cb1ae07481642541cdf6f23daf0cfd4a7419cda5936ebc6bb5e1ef1e`.
- New image Git blob: `f70ca4165302b155a40d9a0b704d6b6fe9c65504`. Locally computed and GitHub-returned values agree.
- Show an FNN badge, amber design token and an explicit Arabic/English separate-chat / owner-only disclosure. Preserve all canonical internal Finn identifiers and existing display title to avoid a global rename.
- Preserve default inline chat, fold/unfold without losing the same user's draft, and the full-screen route.
- Key the card by authenticated user ID so a cached access result cannot retain another session's draft.

## Coordination and boundaries

ChatGPT owns only this isolated home-card patch. Keep Claude's newer cinema, FINN APIs, owner authorization, provider plan and recent CI/deployment policy unchanged. Lovable's connected project was checked and pointed at the same base SHA before the patch. Coordinate through Issue #18 and the new PR; comments or project knowledge are NOT proof a Claude or Lovable agent has executed or reviewed the patch.

No database/schema/secret/RLS/provider/billing changes. No AI chat or audio call. No new paid agent session. The public portrait asset is not a security boundary; the server owner check remains authoritative. Guest screenshots cannot establish owner-only browser behavior.

## Evidence required

Two changed/new TSX modules passed local syntax transpilation. Seven new DOM tests cover identity, localization, guest/denied visibility, fold preservation, account switching with cached access, and logout. They still require actual CI execution; syntax checks are not whole-repository typecheck or authenticated E2E. Preserve the existing home-card and authorization tests. Do not call a preview production or claim a live FNN reply without a real authorized test.
