# 09 — Notifications · نظام الإشعارات

**How the OS speaks unprompted. Ranked by interruption cost: banner < toast < alert <
critical. Severity is always triple-coded — color + glyph + Arabic word (Constitution
Ch. 03 §9).**

---

## Base grammar

| Property | Value |
|---|---|
| Severity set | info `--nx-info` · success `--nx-success` · warning `--nx-warning` · critical `--nx-critical` — glyphs ⓘ ✓ ⚠ ⛔ + words معلومة/نجاح/تحذير/حرج |
| Structure | severity edge-bar 3px (right, RTL) + glyph + title (Body-600) + optional line (Body-compact 72%) + actions ≤ 2 + close |
| Colors | body stays neutral glass/ink; ONLY the bar, glyph and word carry severity (no flooded backgrounds) |
| A11y | polite live region; critical = assertive; actions keyboard-reachable; auto-dismiss pauses on hover/focus |

## The eight messengers

| Component | Purpose | Spec |
|---|---|---|
| **NxToast** | Transient outcome feedback | E5 near-solid (Ch. 06), 12 radius, bottom-**left** stack (RTL trailing), max 3 visible (older collapse to counter); auto-dismiss 5s (8s with action); enter slide-up 200ms, exit fade 150ms |
| **NxAlert** | Inline contextual notice inside panels/forms | in-flow (no elevation), 12 radius, ink @ 60% fill; persists until state resolves; never auto-dismisses |
| **NxBanner** | System-wide condition (simulation mode, degraded connection, maintenance) | full-width strip under TopNav, 48px, in-flow (pushes content); one banner max — new replaces old by priority; includes resolve/detail action; the `is_simulation` banner is a permanent resident when applicable |
| **NxCriticalAlert** | Immediate executive attention | E5 toast anatomy but: critical bar + one-time 2-pulse ring (Ch. 06), **no auto-dismiss**, requires explicit acknowledge (Ghost "علمت" ) or act (Secondary); assertive announce; if screen has an EventStreamPanel it also lands there |
| **NxSuccessNotice** | Positive completion | Toast with success severity; text states *what* succeeded by name; no confetti, no celebration motion (premium restraint) |
| **NxWarningNotice** | Degradation/approaching limits | Toast (transient) or Alert (persistent) with warning severity; must include the threshold ("٨٥٪ من الحد") |
| **NxExecutionResult** | Outcome of a gated execution (post-approval runs) | Toast lg variant: run id (mono Latin), outcome chip (نجح/فشل/جزئي), duration, "عرض السجل" action → audit trail; failure variant persists like CriticalAlert until acknowledged |
| **NxApprovalResult** | Outcome of a human gate decision | Toast with gold edge accent (the one gold-flavored notification): "اعتُمد بواسطة…" / "رُفض" + audit line reference; links to decision record |

## Notification laws

1. One channel per event: an event lands in toast **or** stream **or** banner by
   severity/persistence rules — never simultaneously except Critical (toast + stream).
2. Toasts never contain forms or more than 2 actions; complex response → the action
   opens a drawer/modal.
3. Success is quiet, failure is specific, critical is unmissable — calibrate down, never
   up ("toast inflation" audits quarterly: if >30% of toasts are ignorable, demote them).
4. Batch operations produce ONE summarizing notification ("اعتُمدت ٤ توصيات، فشلت ١ —
   التفاصيل"), never N toasts.
5. Reduced-motion: slides become fades; pulse rings render static at full ring.
