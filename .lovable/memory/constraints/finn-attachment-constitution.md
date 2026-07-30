---
name: FINN Attachment & Generative Constitution
description: Article 24 — supreme law for chat attachments (upload → multimodal transport → FINN reading) and generative artifacts (image/document/media). Full text at docs/FINN_ATTACHMENT_CONSTITUTION.md.
type: constraint
---

# Article 24 — Attachment & Generative Response

Applies to every FINN surface (FinnCopilot, FinnDock, /assistant, MCP, embed).

## Upload
- `uploadFinnAttachment` server fn, `requireSupabaseAuth`, MIME allowlist,
  25 MB cap, 10 files/turn, 30 uploads/60 s rate limit.
- Private bucket `finn-attachments/<user_id>/<uuid>-<name>`. Owner-only RLS.
- 1 h signed URLs, audited via `logFinnAction` with `["Article 24"]`.

## Transport
- Client MUST send AI-SDK-v5 typed parts: `{type:'text'}` + one
  `{type:'file', mediaType, url}` per attachment. Never flatten to a URL note.

## Reading
- FINN MUST acknowledge each file, extract the requested info, ground every
  claim in what the model observed, and refuse unsupported types explicitly.

## Generative Response
- `generate_image` (Lovable AI Gateway) → stored in
  `finn-attachments/<user_id>/generated/<uuid>.png`, 1 h signed URL,
  embedded inline as `![alt](url)`. Video montage = roadmap (return
  `unavailable` until wired). No mock URLs, no placeholders.

## Security
Private bucket + owner RLS + short signed URLs + server-side MIME/size/rate
limits + rejection of non-https `file.url`. Violations block release.
