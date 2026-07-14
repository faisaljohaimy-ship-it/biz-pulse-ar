# ARIA Attachment & Generative Response Constitution
**Article 24 — supreme, additive to Articles I–IX and FR-1..23**
Version 1.0.0 · Effective 2026-07-08

> This charter governs every attachment sent to ARIA and every generative
> artifact ARIA returns (image, document, chart, or media). It is programmatic
> law: violations MUST fail closed. No placeholders, no fake previews, no
> mocked pipelines.

---

## §1 · Scope

Applies to every ARIA surface where a user attaches media or asks ARIA to
produce media: `AriaCopilot`, `AriaDock`, `/assistant`, MCP tool calls,
public embed. Signed-out visitors MAY NOT upload; generative tools are
gated by `requireSupabaseAuth`.

## §2 · Upload Contract (client → server)

- Entry point: `uploadAriaAttachment` (`src/lib/aria/attachments.functions.ts`).
- Server function, `POST`, `requireSupabaseAuth` middleware.
- Zod schema: `{ filename, mime_type, size_bytes, data_b64 }`.
- **MIME allowlist** — images (`png|jpeg|webp|gif`), documents
  (`pdf|txt|md|json|docx|xlsx|xls|csv`), audio (`mpeg|wav|webm|mp4|ogg`),
  video (`mp4|webm|quicktime`). Anything else = **reject** + audit
  `aria.attachment.upload.rejected_mime`.
- **Hard cap** — 25 MB per file, 10 files per turn.
- **Rate limit** — 30 uploads / 60 s / user (`enforceRateLimit`).
- **Storage** — private bucket `aria-attachments`, path
  `<user_id>/<uuid>-<safe_name>`. RLS policies scope SELECT/INSERT/DELETE
  to the owner (see `20260708101625_*.sql`).
- **Signed URL** — 1 hour, single-use scope, never persisted client-side
  beyond the active turn.
- **Audit** — every accept/reject/error routed through `logAriaAction`
  with the `Article 24` ref.

## §3 · Multimodal Transport (chat → model)

- Client MUST call `chat.sendMessage({ role:'user', parts:[...] })` with
  AI-SDK-v5 typed parts:
  - `{ type:'text', text }` for the user's prompt.
  - `{ type:'file', mediaType, url }` for **each** upload (signed URL).
- The transport route (`src/routes/api/chat.ts`) MUST pass the parts to
  `convertToModelMessages` unchanged so provider adapters emit native
  `image_url` / `input_audio` / `file` blocks.
- **Never** flatten attachments into a text note (`[Attachments: … url]`).
  A URL in prose is opaque to the model.
- Anonymous callers cannot attach — the composer plus button MUST be
  hidden or disabled outside authenticated context.

## §4 · Reading Contract (ARIA's obligations)

When any turn contains one or more `file` parts, ARIA MUST:

1. Acknowledge each attachment (filename + role) in the first line.
2. Extract the concrete information required by the user's request
   (describe, summarize, transcribe, extract table, translate, diff).
3. Ground every claim about the file in what the model actually observed;
   never invent EXIF data, page counts, timestamps, or speakers.
4. If a file kind is unsupported by the active model, respond
   `تعذّر قراءة نوع الملف / Unsupported file type on this model` and
   suggest the closest supported flow. Never silently ignore.

## §5 · Generative Response Contract

ARIA is authorized — and expected — to produce artifacts, not just prose,
when the user asks for one.

| Ask | Tool | Output shape |
|---|---|---|
| Draw / render / image | `generate_image` | `![alt](signed_url)` inline |
| Report / memo / brief | `generate_document` (markdown) | linked file + inline preview |
| Chart / dashboard fragment | client-side chart (Recharts) | rendered in chat |
| Video montage | roadmap (Runway/Veo bridge) | must return `unavailable` until wired |
| Voice reply | existing `/api/tts` pipeline | streamed audio |

Rules:

- Generative tools MUST write their output into the same private bucket
  `aria-attachments/<user_id>/generated/<uuid>.<ext>` under the caller's
  user id, so ownership and retention track uploads.
- Signed URL: 1 hour default.
- The tool result JSON MUST include `{ ok, kind, mime, size_bytes, url, prompt }`
  and be surfaced in the reply with an inline markdown embed.
- No mock URLs, no `example.com`, no base64 placeholders. If the
  provider fails, return `{ ok:false, error }` verbatim.

## §6 · Security Invariants

1. Bucket `aria-attachments` MUST remain private (`public=false`).
2. Owner-only RLS policies MUST cover SELECT / INSERT / DELETE.
3. Signed URLs MUST NOT exceed 1 h.
4. Upload endpoint MUST be rate-limited and MIME-gated on the server.
5. Chat transport MUST reject `file.url` values that are not
   `https://` or the workspace's Supabase storage host.
6. Generated artifacts inherit §6.1–§6.4 verbatim.

## §7 · Audit & Evidence

Every upload, read, and generation MUST produce an `aria_actions_log`
row with `articleRefs: ["Article 24"]`, a status of `ok|denied|error`,
and the request id. FR-19 evidence gate applies to any UI badge that
reports attachment counts or generation availability.

## §8 · Definition of Done

- ✅ MIME + size + rate limits enforced server-side.
- ✅ AI SDK file parts flow end-to-end (composer → transport → model).
- ✅ At least one generative tool (`generate_image`) live and
      returning owned, signed URLs.
- ✅ System prompt teaches ARIA the acknowledgement + grounding rule.
- ✅ Tests: `tsc --noEmit` clean; upload rejects a `.exe`; a
      user-uploaded image returns a description that references the file.

Violations are treated as production defects and MUST block release.
