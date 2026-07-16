/**
 * ARIA chat attachment upload — Article 23 (l).
 *
 * Signed-in users upload attachments (image/video/audio/document) into a
 * service-role-only quarantine bucket. Only structurally inspected files
 * (and, when configured, files approved by the external malware scanner) are
 * promoted into private `aria-attachments` storage.
 *
 * Returns a short-lived signed URL the chat transport can pass into the
 * multimodal message body (Article 3 keeps everything on the canonical path).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAriaAction } from "./audit-log.server";
import { enforceRateLimit } from "@/lib/governance/rate-limit.server";
import {
  ARIA_ATTACHMENT_MAX_BYTES,
  ARIA_ATTACHMENT_MIME_TYPES,
  FileInspectionError,
  inspectAriaAttachment,
} from "@/lib/security/file-inspection.server";

const ALLOWED_MIME = new Set<string>(ARIA_ATTACHMENT_MIME_TYPES);
const QUARANTINE_BUCKET = "aria-attachments-quarantine";
const CLEAN_BUCKET = "aria-attachments";

const InputSchema = z.object({
  filename: z.string().min(1).max(200),
  mime_type: z.string().min(1).max(120),
  size_bytes: z.number().int().positive().max(ARIA_ATTACHMENT_MAX_BYTES),
  /** base64-encoded file body (no data: prefix). */
  data_b64: z
    .string()
    .min(1)
    .max(Math.ceil((ARIA_ATTACHMENT_MAX_BYTES * 4) / 3) + 4)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Invalid base64 attachment payload"),
});

function safeName(name: string) {
  const cleaned = name
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}.\- _()]/gu, "_")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .slice(0, 100);
  return cleaned || "attachment";
}

async function sha256(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const source = Uint8Array.from(bytes).buffer;
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

type MalwareVerdict = {
  clean: true;
  external: boolean;
  engine: string;
};

/**
 * Optional enterprise scanner contract:
 * POST raw bytes and return `{ "clean": true, "engine": "..." }`.
 * If ARIA_FILE_SCAN_URL is configured, timeout, configuration, malformed
 * responses, and scanner errors all fail closed.
 */
async function scanForMalware(input: {
  bytes: Uint8Array;
  mime: string;
  contentHash: string;
}): Promise<MalwareVerdict> {
  const url = process.env.ARIA_FILE_SCAN_URL?.trim();
  if (!url) {
    return { clean: true, external: false, engine: "nexios-structural-v1" };
  }
  const secret = process.env.ARIA_FILE_SCAN_SECRET?.trim();
  if (!secret) {
    throw new Error("ARIA file scanner is configured without ARIA_FILE_SCAN_SECRET.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const body = Uint8Array.from(input.bytes).buffer;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": input.mime,
        "X-Nexios-Content-SHA256": input.contentHash,
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`ARIA file scanner unavailable (${response.status}).`);
    }
    const result = (await response.json().catch(() => null)) as {
      clean?: unknown;
      verdict?: unknown;
      engine?: unknown;
      signature?: unknown;
    } | null;
    const isClean = result?.clean === true || result?.verdict === "clean";
    if (!isClean) {
      const signature = typeof result?.signature === "string" ? result.signature.slice(0, 80) : "";
      throw new FileInspectionError(
        "malware_detected",
        signature
          ? `External malware scanner rejected the attachment (${signature}).`
          : "External malware scanner rejected the attachment.",
      );
    }
    return {
      clean: true,
      external: true,
      engine:
        typeof result?.engine === "string" && result.engine.trim()
          ? result.engine.trim().slice(0, 80)
          : "external-malware-scanner",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const uploadAriaAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw) => InputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const startedAt = Date.now();
    const { userId } = context;

    // Article 24 §2 — rate-limit uploads per user.
    const rate = await enforceRateLimit(`aria-upload:${userId}`, 30, 60);
    if (rate.unavailable) {
      await logAriaAction({
        action: "aria.attachment.upload.security_gate_unavailable",
        userId,
        surface: "AriaCopilot",
        articleRefs: ["Article 24"],
        status: "denied",
      });
      throw new Error("Upload security gate is unavailable — try again shortly.");
    }
    if (!rate.allowed) {
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
    if (bytes.length !== data.size_bytes || bytes.length > ARIA_ATTACHMENT_MAX_BYTES) {
      throw new Error("Payload size mismatch or too large");
    }

    const objectPath = `${userId}/${crypto.randomUUID()}-${safeName(data.filename)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: quarantineError } = await supabaseAdmin.storage
      .from(QUARANTINE_BUCKET)
      .upload(objectPath, bytes, { contentType: "application/octet-stream", upsert: false });

    if (quarantineError) {
      await logAriaAction({
        action: "aria.attachment.upload.failed",
        userId,
        surface: "AriaCopilot",
        articleRefs: ["Article 23"],
        status: "error",
        input: { mime: data.mime_type, size: bytes.length },
        output: { stage: "quarantine", error: quarantineError.message },
        latencyMs: Date.now() - startedAt,
      });
      throw new Error(`Quarantine upload failed: ${quarantineError.message}`);
    }

    let contentHash = "unavailable";
    let filenameHash = "unavailable";
    let detectedMime: string | null = null;
    let scanEngine = process.env.ARIA_FILE_SCAN_URL
      ? "external-malware-scanner"
      : "nexios-structural-v1";
    let approved = false;

    try {
      contentHash = await sha256(bytes);
      filenameHash = await sha256(data.filename.normalize("NFKC"));
      const inspection = inspectAriaAttachment({
        bytes,
        filename: data.filename,
        claimedMime: data.mime_type,
      });
      detectedMime = inspection.detectedMime;
      const malware = await scanForMalware({
        bytes,
        mime: inspection.detectedMime,
        contentHash,
      });
      scanEngine = malware.engine;

      const { error: promoteError } = await supabaseAdmin.storage
        .from(CLEAN_BUCKET)
        .upload(objectPath, bytes, {
          contentType: inspection.detectedMime,
          upsert: false,
        });
      if (promoteError) throw new Error(`Promotion failed: ${promoteError.message}`);

      const { error: ledgerError } = await supabaseAdmin.from("aria_attachment_scans").insert({
        user_id: userId,
        object_path: objectPath,
        original_name_hash: filenameHash,
        content_sha256: contentHash,
        claimed_mime: data.mime_type,
        detected_mime: inspection.detectedMime,
        size_bytes: bytes.length,
        scan_status: malware.external ? "approved_external" : "approved_local",
        scan_engine: malware.engine,
      });
      if (ledgerError) {
        await supabaseAdmin.storage.from(CLEAN_BUCKET).remove([objectPath]);
        throw new Error(`Inspection ledger failed: ${ledgerError.message}`);
      }

      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from(CLEAN_BUCKET)
        .createSignedUrl(objectPath, 60 * 60);
      if (signErr || !signed?.signedUrl) {
        await supabaseAdmin.storage.from(CLEAN_BUCKET).remove([objectPath]);
        throw new Error(`Sign failed: ${signErr?.message ?? "unknown"}`);
      }
      await logAriaAction({
        action: "aria.attachment.upload.approved",
        userId,
        surface: "AriaCopilot",
        articleRefs: ["Article 23", "Article 24"],
        status: "ok",
        input: { mime: data.mime_type, size: bytes.length, contentHash },
        output: {
          path: objectPath,
          detectedMime: inspection.detectedMime,
          checks: inspection.checks,
          scanEngine: malware.engine,
        },
        latencyMs: Date.now() - startedAt,
      });
      approved = true;

      return {
        path: objectPath,
        signed_url: signed.signedUrl,
        mime_type: inspection.detectedMime,
        size_bytes: bytes.length,
        scan_status: malware.external ? "approved_external" : "approved_local",
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      const inspectionError = error instanceof FileInspectionError;
      const reason = inspectionError ? error.code : "scan_error";
      await supabaseAdmin.from("aria_attachment_scans").insert({
        user_id: userId,
        object_path: objectPath,
        original_name_hash: filenameHash,
        content_sha256: contentHash,
        claimed_mime: data.mime_type,
        detected_mime: detectedMime,
        size_bytes: bytes.length,
        scan_status: inspectionError ? "rejected" : "scan_error",
        scan_engine: scanEngine,
        signature: reason,
      });
      await logAriaAction({
        action: "aria.attachment.upload.rejected",
        userId,
        surface: "AriaCopilot",
        articleRefs: ["Article 23", "Article 24"],
        status: "denied",
        input: { mime: data.mime_type, size: bytes.length, contentHash },
        output: { reason },
        latencyMs: Date.now() - startedAt,
      });
      throw error;
    } finally {
      await supabaseAdmin.storage.from(QUARANTINE_BUCKET).remove([objectPath]);
      if (!approved) await supabaseAdmin.storage.from(CLEAN_BUCKET).remove([objectPath]);
    }
  });
