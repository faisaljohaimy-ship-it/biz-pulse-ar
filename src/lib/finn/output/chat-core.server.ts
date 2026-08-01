/**
 * Extracted, dependency-injected FINN chat turn — used by BOTH production
 * (src/routes/api/chat.ts) and tests. There is no parallel test pipeline.
 *
 * The model call is injected (`deps.generate`) so a test can feed a malicious
 * raw phrase and assert it never reaches the emitted bytes. Raw model text is
 * BUFFERED here on the server, finalized through the output gateway, and only
 * the resulting SafeFinnOutput is sealed into an envelope. No raw token is ever
 * returned.
 */
import type { Actor } from "@/finn/shell";
import {
  finalizeFinnOutput,
  type EvidenceRef,
  type ExecutionReceipt,
  type FinnActionRequest,
} from "./finalize";
import { normalizeFinnSpeechText } from "../finn-speech-normalize";
import { sealEnvelope, type SafeFinnOutputEnvelopeV1 } from "./envelope";

/** Built on the SERVER only. No sensitive field is ever taken from the client. */
export interface TrustedOutputContext {
  readonly requestId: string;
  readonly userText: string;
  readonly actor: Actor;
  readonly evidence: readonly EvidenceRef[];
  readonly liveDataAvailable: boolean;
  readonly trustedClockISO: string | null;
  readonly isSimulationEnv: boolean;
  readonly simulationDataAvailable?: boolean;
  readonly locale: "ar" | "en";
  /** Sensitive-action context (server-derived), if this turn requests one. */
  readonly action?: FinnActionRequest;
  readonly resourceOrgId?: string | null;
  readonly executionReceipt?: ExecutionReceipt | null;
  /** Untrusted retrieved documents, for indirect-injection detection. */
  readonly retrievedDocs?: readonly string[];
}

/** The injected model boundary. Production wraps `ai.generateText`. */
export interface ChatGenerateDeps {
  generate: (signal?: AbortSignal) => Promise<{ text: string }>;
}

/**
 * Run one chat turn end-to-end and return a validated safe envelope.
 * Fail-closed: a generation error yields a finalized refusal, never raw text.
 */
export async function runFinnChatTurn(
  ctx: TrustedOutputContext,
  deps: ChatGenerateDeps,
  signal?: AbortSignal,
): Promise<SafeFinnOutputEnvelopeV1> {
  let modelText = "";
  try {
    const out = await deps.generate(signal);
    modelText = typeof out?.text === "string" ? out.text : "";
  } catch {
    modelText = ""; // finalize will treat empty as a safe answer/refusal
  }

  const safe = finalizeFinnOutput({
    userText: ctx.userText,
    modelText,
    actor: ctx.actor,
    evidence: { available: ctx.evidence },
    liveDataAvailable: ctx.liveDataAvailable,
    trustedClockISO: ctx.trustedClockISO,
    isSimulationEnv: ctx.isSimulationEnv,
    simulationDataAvailable: ctx.simulationDataAvailable,
    ...(ctx.action ? { action: ctx.action } : {}),
    ...(ctx.resourceOrgId !== undefined ? { resourceOrgId: ctx.resourceOrgId } : {}),
    ...(ctx.executionReceipt !== undefined ? { executionReceipt: ctx.executionReceipt } : {}),
    ...(ctx.retrievedDocs ? { retrievedDocs: ctx.retrievedDocs } : {}),
  });

  // Speech text is derived from the SAFE display text — never the raw model.
  const speakableText = normalizeFinnSpeechText(safe.displayText, { lang: ctx.locale }).speech;

  return sealEnvelope(safe, {
    requestId: ctx.requestId,
    locale: ctx.locale,
    createdAt: ctx.trustedClockISO ?? "1970-01-01T00:00:00Z",
    speakableText,
  });
}
