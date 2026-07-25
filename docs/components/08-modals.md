# 08 — Modals · النوافذ الطارئة

**Overlays interrupt; interruption is expensive. Every overlay here justifies its cost
with a decision or a depth the page cannot host. Elevations per Constitution Ch. 06
(E3 drawers/popovers · E4 dialogs · scrim law).**

---

## Base spec (`NxDialog`)

| Property | Value |
|---|---|
| Surface | card @ 88%, blur 24, E4; radius 20 |
| Scrim | obsidian @ 70%, click-to-dismiss (unless critical) |
| Width | sm 400 · md 560 · lg 720; height ≤ 80vh then internal scroll |
| Anatomy | header 56 (title H2 + close Icon Button, close on the left/trailing) · body 24 padding · footer 64 (actions left-aligned = trailing: Primary/gold rightmost of the action group) |
| Motion | enter fade + scale 98→100, 200ms; exit 150ms; scrim fades in parallel |
| Focus | trap inside; initial focus = first field or least-destructive action; Escape closes; focus returns to trigger |
| A11y | `role="dialog"` `aria-modal` `aria-labelledby`; SR announced on open |
| Stacking | max ONE dialog; a dialog needing a dialog is a flow (use Fullscreen) |

## The seven overlays

| Component | Purpose | Overrides |
|---|---|---|
| **NxDialog** | Confirmations, focused single-step tasks | base; destructive confirms restate the object by name + consequence line, confirm button Danger, no default focus on Danger |
| **NxDrawer** | Inspect depth without leaving context (Ch. 09 disclosure level 2) | slides from **left** edge (RTL: leftward = deeper), width 480 / 45% tablet / 100% mobile; E3, page stays visible + inert; header sticky with breadcrumb-back; may host panels/cards/tables |
| **NxFullscreen** | Multi-step flows, immersive viewers (twin, cinema) | full viewport E4 solid-ish (94%), TopNav replaced by flow header (title + step indicator + exit); exit always confirms if unsaved; the only overlay allowed to contain its own nav (Tabs/steps) |
| **NxApprovalModal** | The human gate (executes the Constitution's approval anatomy) | md; body = ApprovalCard content (request, evidence links, impact, deadline); footer solid strip: Executive Action gold "اعتماد" + Outline "رفض" + Ghost "لاحقًا"; **scrim not click-dismissable; Escape = "لاحقًا"** — a gate is never dismissed by accident; decision writes an audit line (shown as confirmation toast) |
| **NxFinnModal** | Summoned FINN conversation surface | lg; agent border + presence ring header; body = conversation (FinnCards) + composer (VoiceInput); FINN thinking state per doc 11; never auto-opens — only by user summon or explicit alert action |
| **NxRuntimeModal** | Module operations detail (restart plan, health detail) | md; runtime border; state-changing actions inside require typed-confirm pattern for critical modules (اكتب اسم الوحدة) |
| **NxKnowledgeModal** | Document/reference reader | lg; knowledge border; reader typography (Body 16/28, measure ≤ 75ch); source + freshness header row; cite/copy affordances |

## Overlay selection law

Confirm/decide → Dialog · Inspect → Drawer · Flow/immerse → Fullscreen. If content
scrolls more than 2× viewport in a Dialog, it belonged in a Drawer; if a Drawer needs
steps, it belonged in Fullscreen. Approval/Finn/Runtime/Knowledge are flavored instances,
not new physics.

## Mobile

Dialogs become bottom sheets (radius 20 top corners, drag-handle, 90% max height);
Drawers become full-screen pushes with back affordance; Fullscreen is native. Sheet
drag-to-dismiss disabled on ApprovalModal (gate law).
