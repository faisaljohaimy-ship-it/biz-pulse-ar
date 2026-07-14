/**
 * ARIA chat attachment upload — Article 23 (l).
 *
 * Signed-in users upload attachments (image/video/audio/document) into the
 * private `aria-attachments` storage bucket under `<user_id>/<uuid>-<name>`.
 * RLS on storage.objects restricts read/write/delete to the owner.
 *
 * Returns a short-lived signed URL the chat transport can pass into the
 * multimodal message body (Article 3 keeps everything on the canonical path).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAriaAction } from "./audit-log.server";
import { enforceRateLimit } from "@/lib/governance/rate-limit.server";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);

const MAX_BYTES = 25 * 1024 * 1024;

const InputSchema = z.object({
  filename: z.string().min(1).max(200),
  mime_type: z.string().min(1).max(120),
  size_bytes: z.number().int().positive().max(MAX_BYTES),
  /** base64-encoded file body (no data: prefix). */
  data_b64: z.string().min(1),
});

function safeName(name: string) {
  return name.replace(/[^\w.\- ()]/g, "_").slice(0, 100);
}

export const uploadAriaAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => InputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const startedAt = Date.now();
    const { userId } = context;

    // Article 24 §2 — rate-limit uploads per user.
    const rate = await enforceRateLimit(`aria-upload:${userId}`, 30, 60);
    if (!rate.allowed && !rate.unavailable) {
      await logAriaAction({
        action: "aria.attachment.upload.rate_limited",
        userId,
        surface: "AriaCopilot",
        articleRefs: ["Article 24"],
        status: "denied",
      });
      throw new Error("Upload rate limit exceeded — try again shortly.");
    }

    if (!ALLOWED_MIME.has(data.mime_type)) {
      await logAriaAction({
        action: "aria.attachment.upload.rejected_mime",
        userId,
        surface: "AriaCopilot",
        articleRefs: ["Article 23"],
        status: "denied",
        input: { mime: data.mime_type, size: data.size_bytes },
      });
      throw new Error(`Unsupported mime type: ${data.mime_type}`);
    }

    const bytes = Buffer.from(data.data_b64, "base64");
    if (bytes.length !== data.size_bytes || bytes.length > MAX_BYTES) {
      throw new Error("Payload size mismatch or too large");
    }

    const objectPath = `${userId}/${crypto.randomUUID()}-${safeName(data.filename)}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from("aria-attachments")
      .upload(objectPath, bytes, { contentType: data.mime_type, upsert: false });

    if (upErr) {
      await logAriaAction({
        action: "aria.attachment.upload.failed",
        userId,
        surface: "AriaCopilot",
        articleRefs: ["Article 23"],
        status: "error",
        input: { mime: data.mime_type, size: bytes.length },
        output: { error: upErr.message },
        latencyMs: Date.now() - startedAt,
      });
      throw new Error(`Upload failed: ${upErr.message}`);
    }

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("aria-attachments")
      .createSignedUrl(objectPath, 60 * 60); // 1h

    if (signErr || !signed?.signedUrl) {
      throw new Error(`Sign failed: ${signErr?.message ?? "unknown"}`);
    }

    await logAriaAction({
      action: "aria.attachment.upload.ok",
      userId,
      surface: "AriaCopilot",
      articleRefs: ["Article 23"],
      status: "ok",
      input: { mime: data.mime_type, size: bytes.length },
      output: { path: objectPath },
      latencyMs: Date.now() - startedAt,
    });

    return {
      path: objectPath,
      signed_url: signed.signedUrl,
      mime_type: data.mime_type,
      size_bytes: bytes.length,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  });
