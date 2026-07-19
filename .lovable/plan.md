# ARIA outbound send: recipient policy + intent gate

Two QA findings both point at intentional guardrails in `send_executive_email` / `send_executive_sms`. The code is doing what it claims to do, but there are inconsistencies. You pick the posture; I'll implement.

## Finding 1 — Non-owner recipients

**Current behavior (intentional):** `resolveOwnerEmail/Sms` throws whenever `to` is not the registered owner, so directors/section heads cannot email or SMS anyone else through ARIA.

**Real bug inside this:** the thrown error tells the user to "use the reviewed approval flow for another recipient," but that flow (`prepareAriaOutboundMessage`) is unreachable — the throw fires before the `ariaAutoApproveEnabled()` branch. The user-visible promise is a lie.

**Options:**
- **A. Keep owner-only, fix the message.** Update the error text to say direct sends to non-owners are not supported at all. Minimal, preserves current security posture. (Recommended default if you want to keep the current lockdown.)
- **B. Route non-owners to approval, owners to direct.** Move `resolveOwnerEmail/Sms` behind the auto-approve branch: if `to` == owner, direct send is allowed (subject to intent gate); if `to` != owner, always go through `prepareAriaOutboundMessage` for human approval. Matches what the current error message already promises.
- **C. Owner-only, no exceptions.** Drop the misleading "use the approval flow" hint entirely and document owner-only as policy.

## Finding 2 — Intent gate too narrow

**Current behavior (intentional):** `hasExplicitOutboundIntent` requires both a send-verb (`send`/`dispatch`/`أرسل`/`ابعث`) and a channel word. "Email me the summary" and voice transcriptions like "ابعث لي الملخّص إيميل" (verb OK, but relies on colloquial ordering) can fail. Attachment-only turns with the injected default text always fail.

**Options:**
- **A. Keep the gate; make the failure honest.** When intent doesn't match, fall back to the approval flow instead of returning an error — the message still requires human review, but the executive isn't silently refused.
- **B. Widen the verb set.** Add English `email`/`text`/`mail`/`sms` used as verbs, Arabic `[اأإآ]بعث` variants, imperative forms like "email me…" / "text me…". Keep the negation/reported-instruction guards.
- **C. Keep as-is.** Only exact verb + channel phrases trigger a direct send; anything else routes to approval by default.

## Recommendation

Do **1B + 2A** together: non-owner recipients and ambiguous intent both fall through to `prepareAriaOutboundMessage` (the reviewed approval flow) instead of returning `{ ok: false, error }`. Owner + explicit verb still gets a direct send. The result: nothing is silently refused, but nothing bypasses review either.

## Scope of change

- `src/lib/aria/outbound-recipient-policy.server.ts` — split "is this the owner?" from "throw"; expose a predicate.
- `src/lib/aria-tools.server.ts` — in both `send_executive_email` and `send_executive_sms`: if recipient is owner AND intent is explicit → direct send; otherwise → `prepareAriaOutboundMessage(supabase, userId, payload)` with the requested recipient.
- `src/lib/aria/outbound-messaging.server.ts` — no change unless you pick 2B.
- Tool `description` strings updated to reflect the actual behavior.
- No DB changes.

## Out of scope

- Approval-flow UI (already exists via `prepareAriaOutboundMessage`).
- Changing the owner defaults or the `ARIA_DIRECT_SEND_ENABLED` kill switch.

Pick a combo (e.g. "1B + 2A") and I'll ship it.
