/**
 * SafeFinnOutputV1 — the ONE legal transport contract for FINN output.
 *
 * A `SafeFinnOutput` (see ./finalize) is an in-process branded value. The moment
 * it crosses a wire (JSON/HTTP/SSE) the compile-time brand is worthless — so we
 * serialize ONLY this versioned envelope of safe fields, and the consumer MUST
 * re-parse it at runtime (zod) before using anything. No path ever puts raw
 * model text into an envelope.
 */
import { z } from "zod";
import type { SafeFinnOutput } from "./finalize";

export const SAFE_OUTPUT_VERSION = "finn-safe-output.v1" as const;

/** Reason codes explain a decision WITHOUT leaking internal reasoning. */
export const ReasonCodeSchema = z.enum([
  "answered",
  "answered_with_evidence",
  "out_of_scope",
  "prompt_exfiltration_blocked",
  "indirect_injection_blocked",
  "no_supporting_evidence",
  "no_trusted_clock",
  "no_live_data",
  "approval_required",
  "approval_denied",
  "executed_with_receipt",
  "unbacked_execution_claim",
  "guard_error_failclosed",
]);
export type ReasonCode = z.infer<typeof ReasonCodeSchema>;

export const CitationSchema = z.object({
  id: z.string().min(1).max(200),
  tag: z.string().min(1).max(200),
});

export const EnvelopeSchema = z.object({
  version: z.literal(SAFE_OUTPUT_VERSION),
  requestId: z.string().min(1).max(200),
  status: z.enum([
    "answer",
    "refusal",
    "insufficient_evidence",
    "approval_required",
    "denied",
    "simulation",
    "executed",
  ]),
  displayText: z.string().max(20_000),
  speakableText: z.string().max(20_000),
  locale: z.enum(["ar", "en"]),
  reasonCodes: z.array(ReasonCodeSchema).max(8),
  citations: z.array(CitationSchema).max(32),
  approvedActions: z.array(z.string().max(64)).max(16),
  executionReceipts: z
    .array(
      z.object({
        id: z.string().max(200),
        executor: z.string().max(64),
        at: z.string().max(40),
      }),
    )
    .max(8),
  isSimulation: z.boolean(),
  createdAt: z.string().min(1).max(40),
  /** Optional provenance for HTTP-reachable sinks (e.g. TTS). */
  provenance: z
    .object({
      receipt: z.string().min(1).max(512),
      expiresAt: z.string().min(1).max(40),
    })
    .optional(),
});

export type SafeFinnOutputEnvelopeV1 = z.infer<typeof EnvelopeSchema>;

/** Map an internal audit reason to a wire-safe reason code. */
function reasonCodeFor(safe: SafeFinnOutput): ReasonCode {
  switch (safe.auditReason) {
    case "out-of-scope":
      return "out_of_scope";
    case "prompt-exfiltration-blocked":
      return "prompt_exfiltration_blocked";
    case "indirect-injection-blocked":
      return "indirect_injection_blocked";
    case "no-supporting-evidence":
      return "no_supporting_evidence";
    case "no-trusted-clock":
      return "no_trusted_clock";
    case "no-live-data":
      return "no_live_data";
    case "approval-authz-denied":
      return "approval_denied";
    case "execute-requires-human-gate":
    case "approved-pending-execution":
      return "approval_required";
    case "approved-executed":
    case "executed-with-receipt":
      return "executed_with_receipt";
    case "unbacked-execution-claim":
      return "unbacked_execution_claim";
    case "answer-with-evidence":
      return "answered_with_evidence";
    case "guard-error-failclosed":
      return "guard_error_failclosed";
    default:
      return "answered";
  }
}

/**
 * The ONLY legal way to turn a SafeFinnOutput into a transportable envelope.
 * No raw/internal field is ever included. `speakableText` may be supplied
 * pre-normalized (speech normalization happens after finalization).
 */
export function sealEnvelope(
  safe: SafeFinnOutput,
  meta: {
    requestId: string;
    locale: "ar" | "en";
    createdAt: string;
    speakableText?: string;
    provenance?: { receipt: string; expiresAt: string };
  },
): SafeFinnOutputEnvelopeV1 {
  return {
    version: SAFE_OUTPUT_VERSION,
    requestId: meta.requestId,
    status: safe.status,
    displayText: safe.displayText,
    speakableText: meta.speakableText ?? safe.ttsText,
    locale: meta.locale,
    reasonCodes: [reasonCodeFor(safe)],
    citations: safe.citations.map((c) => ({ id: c.id, tag: c.tag })),
    approvedActions: safe.status === "executed" ? ["executed"] : [],
    executionReceipts: safe.executionReceipt
      ? [
          {
            id: safe.executionReceipt.id,
            executor: safe.executionReceipt.executor,
            at: safe.executionReceipt.at,
          },
        ]
      : [],
    isSimulation: safe.isSimulation,
    createdAt: meta.createdAt,
    ...(meta.provenance ? { provenance: meta.provenance } : {}),
  };
}

/**
 * Parse an untrusted wire payload back into a validated envelope. Rejects an
 * unknown version, missing required fields, or a non-conforming shape. On
 * failure returns { ok:false } — the caller MUST fall back to a safe message,
 * never to raw text.
 */
export function parseEnvelope(
  input: unknown,
): { ok: true; envelope: SafeFinnOutputEnvelopeV1 } | { ok: false; error: string } {
  const parsed = EnvelopeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
  return { ok: true, envelope: parsed.data };
}
