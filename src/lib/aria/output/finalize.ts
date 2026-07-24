/**
 * FINN output gateway — the ONE funnel every public FINN exit must pass through.
 *
 * Raw model text is untrusted. It may never reach the UI or the TTS layer
 * directly: it must be finalized here into a `SafeFinnOutput`, a BRANDED value
 * that can only be produced by `finalizeFinnOutput`. Public sinks
 * (`renderForUI`, `finnTtsTextFrom`) accept the brand only, so a raw string is
 * a compile error at the sink.
 *
 * The gateway is a deterministic policy engine (context + typed contract), with
 * textual checks as an ADDITIONAL layer — not the whole defence. It fails
 * CLOSED: any error yields a safe refusal, never a passthrough of raw output.
 */
import type { Actor } from "@/finn/shell";
import { HUMAN_GATE_ACTIONS, canDecideProposal } from "@/finn/shell";
import type { GatedAction } from "@/finn/shell";
import { OUT_OF_SCOPE_REPLY, UNAVAILABLE_REPLY, isInScope } from "@/lib/aria/response-contract";

export type FinnOutputStatus =
  | "answer"
  | "refusal"
  | "insufficient_evidence"
  | "approval_required"
  | "denied"
  | "simulation"
  | "executed";

export type PiiClass = "none" | "redacted" | "blocked";

/** A citation that ACTUALLY exists in the evidence context (never model-invented). */
export interface EvidenceRef {
  readonly id: string;
  readonly tag: string;
}

/** A receipt issued by the trusted executor — the ONLY proof an action ran. */
export interface ExecutionReceipt {
  readonly id: string;
  readonly executor: string;
  readonly at: string;
}

/** Executors the gateway trusts to have actually performed a side effect. */
export const TRUSTED_EXECUTORS: ReadonlySet<string> = new Set(["nexios-executor"]);

declare const SafeBrand: unique symbol;

/** The only value a public FINN sink accepts. Unforgeable outside this module. */
export interface SafeFinnOutput {
  readonly [SafeBrand]: true;
  readonly status: FinnOutputStatus;
  /** User-facing text — already guarded and PII-safe. */
  readonly displayText: string;
  /** Text destined for the TTS layer (normalization happens downstream). */
  readonly ttsText: string;
  readonly citations: readonly EvidenceRef[];
  /** Data freshness for a live claim; null when no live claim is made. */
  readonly observedAt: string | null;
  readonly isSimulation: boolean;
  readonly approval: { readonly required: boolean; readonly decidedBy: string | null };
  readonly executionReceipt: ExecutionReceipt | null;
  readonly orgId: string | null;
  readonly pii: PiiClass;
  /** Internal audit reason — NEVER shown to the user. */
  readonly auditReason: string;
}

export interface EvidenceContext {
  readonly available: readonly EvidenceRef[];
}

export interface FinnActionRequest {
  readonly type: "execute" | "approve";
  readonly gatedAction?: GatedAction;
  /** For a deferred execution, when the model wants it to run. */
  readonly requestedExecutionAtISO?: string | null;
}

export interface FinnOutputRequest {
  /** The user's message — used for scope and exfiltration checks. */
  readonly userText: string;
  /** Raw, UNTRUSTED model output. */
  readonly modelText: string;
  readonly actor: Actor;
  readonly evidence: EvidenceContext;
  /** Whether live operational data was actually loaded this turn. */
  readonly liveDataAvailable: boolean;
  /** Server-derived time; null means no trusted clock is available. */
  readonly trustedClockISO: string | null;
  readonly isSimulationEnv: boolean;
  /** Present for a sensitive action request. */
  readonly action?: FinnActionRequest;
  /** The proposal/resource's org — approvals must be in-org. */
  readonly resourceOrgId?: string | null;
  /** A receipt from the trusted executor — the ONLY basis for `executed`. */
  readonly executionReceipt?: ExecutionReceipt | null;
  /** Untrusted retrieved documents (for indirect-injection detection). */
  readonly retrievedDocs?: readonly string[];
}

// ── Safe fixed lines ────────────────────────────────────────────────────────
const REFUSAL_EXFIL = "لا أكشف تعليماتي الداخلية. كيف أساعدك في نطاق الأمن الصناعي؟";
const REFUSAL_INJECTION = "تجاهلت محتوى غير موثوق في المستند — لن أنفّذ أمرًا أو أكشف سرًا.";
const APPROVAL_REQUIRED_LINE = "هذا إجراء حسّاس يتطلب اعتمادًا بشريًا قبل التنفيذ.";
const DENIED_LINE = "صلاحيتك لا تسمح باعتماد هذا الإجراء أو تنفيذه.";
const SIMULATION_LINE = "البيانات الحية غير متاحة الآن — هذا عرض محاكاة مرجعية (بيانات محاكاة).";
const SAFE_ERROR_LINE = "تعذّر إكمال الرد بأمان الآن — أعد المحاولة.";

// ── Detectors (textual layer — ADDITIONAL to the policy above) ──────────────
const RE_EXFIL_INPUT =
  /(system|developer)\s*(prompt|message|instructions?)|(reveal|show|print|repeat|dump|leak)[^.]*(prompt|instruction|system)|(اكشف|أظهر|اعرض|اطبع|كرر|ما|أعطني)[^.]*(تعليمات|التعليمات|تعليماتك|البرومبت|النظام(ية)?)|(المادة|القسم|العنوان|السطر|رقم)[^.]*(تعليمات|النظام|prompt|instruction)/i;
const PROTECTED_MARKERS = [
  "FINN RESPONSE CONTRACT",
  "You are FINN, a capable",
  "GROUNDING AND UNTRUSTED CONTENT",
  "UNTRUSTED ENTERPRISE DATA",
  "humanGateRequiredFor",
  "FINN_RUNTIME",
  "# ROLE",
];
const RE_INJECTION_DOC =
  /ignore (all )?previous instructions|disregard (the )?(above|prior)|reveal (the )?secret|exfiltrate|execute the action|تجاهل[^.]*التعليمات|تخطَّ?[^.]*التعليمات|اكشف[^.]*السر|نفّذ[^.]*الأمر/i;
const RE_SECRET_LEAK =
  /\bsk-[A-Za-z0-9]{12,}\b|\b(api[_-]?key|secret|password|token)\s*[:=]\s*\S+|BEGIN (RSA |EC )?PRIVATE KEY|xi-api-key/i;
const RE_EXEC_CLAIM =
  /(تم|تمّ)\s*(الإرسال|الاعتماد|التنفيذ|الإخلاء|البثّ|الدفع)|has been (sent|approved|executed|dispatched|broadcast)|successfully (sent|approved|executed|dispatched)/i;
const RE_REGULATORY =
  /hcis|الهيئة|توجيه|directive|\bsec\b|\bsaf\b|لائحة|نطاق التوجيه|امتثال|compliance/i;
const RE_NEEDS_TIME =
  /كم\s*(بقي|تبقّى|تبقى|المتبقّي|المتبقي)|متى\s*(ينتهي|تنتهي)|الوقت المتبقّي|remaining time|how long until|expires?\s*(in|at)/i;
const RE_KPI = /\bkpi\b|مؤشر|المؤشرات|نسبة الامتثال|النسبة|metric|الأداء/i;
const RE_CITED_TAG = /\[(?:DOC|KB|SEC|SAF|HCIS)[:-][^\]]+\]|\bSEC-\d+\b|\bSAF-\d+\b/gi;

const RE_PHONE = /\+?\d[\d\s().-]{7,}\d/g;
const RE_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function requestsSystemDisclosure(t: string): boolean {
  return RE_EXFIL_INPUT.test(t);
}
function outputLeaksSystem(m: string): boolean {
  return PROTECTED_MARKERS.some((mark) => m.includes(mark));
}
function injectionInDocs(docs: readonly string[] | undefined): boolean {
  return !!docs?.some((d) => RE_INJECTION_DOC.test(d));
}
function isTrustedReceipt(r: ExecutionReceipt | null | undefined): r is ExecutionReceipt {
  return !!r && TRUSTED_EXECUTORS.has(r.executor) && !!r.id && !!r.at;
}

/** Redact phone/email from user-facing text. Never logs the raw value. */
function redactPii(text: string): { text: string; pii: PiiClass } {
  let pii: PiiClass = "none";
  const out = text
    .replace(RE_EMAIL, () => {
      pii = "redacted";
      return "[بريد محجوب]";
    })
    .replace(RE_PHONE, () => {
      pii = "redacted";
      return "[هاتف محجوب]";
    });
  return { text: out, pii };
}

// ── The branded constructor (module-private) ────────────────────────────────
function make(
  status: FinnOutputStatus,
  displayText: string,
  auditReason: string,
  extra: Partial<
    Omit<SafeFinnOutput, typeof SafeBrand | "status" | "displayText" | "auditReason">
  > = {},
): SafeFinnOutput {
  // The brand is a compile-time phantom only (a `unique symbol` with no runtime
  // value); it exists to stop any module outside this file from constructing a
  // SafeFinnOutput. We build the plain object and assert the brand here.
  return {
    status,
    displayText,
    ttsText: extra.ttsText ?? displayText,
    citations: extra.citations ?? [],
    observedAt: extra.observedAt ?? null,
    isSimulation: extra.isSimulation ?? false,
    approval: extra.approval ?? { required: false, decidedBy: null },
    executionReceipt: extra.executionReceipt ?? null,
    orgId: extra.orgId ?? null,
    pii: extra.pii ?? "none",
    auditReason,
  } as unknown as SafeFinnOutput;
}

/**
 * Finalize a raw model turn into a guarded, branded output. Deterministic and
 * fail-closed. This is the sole producer of SafeFinnOutput.
 */
export function finalizeFinnOutput(req: FinnOutputRequest): SafeFinnOutput {
  try {
    const orgId = req.actor.orgId ?? null;
    const model = req.modelText ?? "";

    // (a) Scope — off-domain refuses before anything else.
    if (!isInScope(req.userText)) {
      return make("refusal", OUT_OF_SCOPE_REPLY, "out-of-scope", { orgId });
    }

    // (b) Prompt exfiltration — input request OR output leak (partial = full).
    if (requestsSystemDisclosure(req.userText) || outputLeaksSystem(model)) {
      return make("refusal", REFUSAL_EXFIL, "prompt-exfiltration-blocked", { orgId });
    }

    // (g) Indirect injection + any raw secret leak → safe refusal.
    if (
      RE_SECRET_LEAK.test(model) ||
      (injectionInDocs(req.retrievedDocs) && RE_EXEC_CLAIM.test(model))
    ) {
      return make("refusal", REFUSAL_INJECTION, "indirect-injection-blocked", { orgId });
    }

    // (e) Sensitive actions — authz → human gate → trusted receipt.
    if (req.action) {
      const receipt = isTrustedReceipt(req.executionReceipt) ? req.executionReceipt : null;

      if (req.action.type === "approve") {
        if (!canDecideProposal(req.actor, req.resourceOrgId)) {
          return make("denied", DENIED_LINE, "approval-authz-denied", { orgId });
        }
        if (receipt) {
          return make(
            "executed",
            `تم الاعتماد والتنفيذ باعتماد موثّق (مرجع ${receipt.id}).`,
            "approved-executed",
            {
              approval: { required: true, decidedBy: req.actor.userId },
              executionReceipt: receipt,
              orgId,
            },
          );
        }
        return make("approval_required", APPROVAL_REQUIRED_LINE, "approved-pending-execution", {
          approval: { required: true, decidedBy: req.actor.userId },
          orgId,
        });
      }

      // type === "execute"
      const gated = req.action.gatedAction ? HUMAN_GATE_ACTIONS.has(req.action.gatedAction) : true;
      if (gated && !receipt) {
        // Covers deferred execution too: no valid receipt ⇒ no bypass.
        return make("approval_required", APPROVAL_REQUIRED_LINE, "execute-requires-human-gate", {
          approval: { required: true, decidedBy: null },
          orgId,
        });
      }
      if (receipt) {
        return make(
          "executed",
          `تم التنفيذ باعتماد موثّق (مرجع ${receipt.id}).`,
          "executed-with-receipt",
          {
            executionReceipt: receipt,
            orgId,
          },
        );
      }
    }

    // A model that CLAIMS an action ran without a trusted receipt never shows it.
    if (RE_EXEC_CLAIM.test(model)) {
      return make("approval_required", APPROVAL_REQUIRED_LINE, "unbacked-execution-claim", {
        approval: { required: true, decidedBy: null },
        orgId,
      });
    }

    // (d) Time — never computed from model memory.
    if (RE_NEEDS_TIME.test(req.userText) && !req.trustedClockISO) {
      return make("insufficient_evidence", UNAVAILABLE_REPLY, "no-trusted-clock", { orgId });
    }

    // (d) Live KPI/data claim without live data → labeled simulation. Checked
    // before the regulatory branch: "no live data for a live ask" is the more
    // specific rule (a KPI question often also mentions compliance).
    if (RE_KPI.test(req.userText) && !req.liveDataAvailable) {
      return make("simulation", SIMULATION_LINE, "no-live-data", { isSimulation: true, orgId });
    }

    // (c) Evidence — a regulatory/live claim needs a real citation.
    if (RE_REGULATORY.test(req.userText) || RE_REGULATORY.test(model)) {
      const cited = (model.match(RE_CITED_TAG) ?? []).map((t) => t.trim());
      const known = new Set(req.evidence.available.map((e) => e.tag));
      const hasRealEvidence = req.evidence.available.length > 0;
      const anyInvented = cited.some((t) => !known.has(t));
      if (
        !hasRealEvidence ||
        (cited.length > 0 && anyInvented && cited.every((t) => !known.has(t)))
      ) {
        return make("insufficient_evidence", UNAVAILABLE_REPLY, "no-supporting-evidence", {
          orgId,
        });
      }
      const { text, pii } = redactPii(model);
      return make("answer", text, "answer-with-evidence", {
        citations: req.evidence.available,
        observedAt: req.trustedClockISO,
        pii,
        orgId,
      });
    }

    // Default answer — PII-redacted, simulation flag carried through.
    const { text, pii } = redactPii(model);
    return make("answer", text, "answer", { pii, isSimulation: req.isSimulationEnv, orgId });
  } catch {
    // (h) Fail closed — never leak raw output on an internal error.
    return make("refusal", SAFE_ERROR_LINE, "guard-error-failclosed");
  }
}

/** The ONLY way to get UI text — accepts the brand, never a raw string. */
export function renderForUI(safe: SafeFinnOutput): string {
  return safe.displayText;
}

/** The ONLY way to get TTS text — accepts the brand, never a raw string. */
export function finnTtsTextFrom(safe: SafeFinnOutput): string {
  return safe.ttsText;
}
