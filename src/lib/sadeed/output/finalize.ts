/**
 * SADEED output gateway — the ONE funnel every public SADEED exit must pass through.
 *
 * Raw model text is untrusted. It may never reach the UI or the TTS layer
 * directly: it must be finalized here into a `SafeSadeedOutput`, a BRANDED value
 * that can only be produced by `finalizeSadeedOutput`. Public sinks
 * (`renderForUI`, `sadeedTtsTextFrom`) accept the brand only, so a raw string is
 * a compile error at the sink.
 *
 * The gateway is a deterministic policy engine (context + typed contract), with
 * textual checks as an ADDITIONAL layer — not the whole defence. It fails
 * CLOSED: any error yields a safe refusal, never a passthrough of raw output.
 */
import type { Actor } from "@/sadeed/shell";
import { HUMAN_GATE_ACTIONS, canDecideProposal } from "@/sadeed/shell";
import type { GatedAction } from "@/sadeed/shell";
import { OUT_OF_SCOPE_REPLY, UNAVAILABLE_REPLY, isInScope } from "@/lib/sadeed/response-contract";

export type SadeedOutputStatus =
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

/** The only value a public SADEED sink accepts. Unforgeable outside this module. */
export interface SafeSadeedOutput {
  readonly [SafeBrand]: true;
  readonly status: SadeedOutputStatus;
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

export interface SadeedActionRequest {
  readonly type: "execute" | "approve";
  readonly gatedAction?: GatedAction;
  /** For a deferred execution, when the model wants it to run. */
  readonly requestedExecutionAtISO?: string | null;
}

export interface SadeedOutputRequest {
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
  /** True only when a labeled reference dataset was actually supplied. */
  readonly simulationDataAvailable?: boolean;
  /** Present for a sensitive action request. */
  readonly action?: SadeedActionRequest;
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
const SIMULATION_DISCLOSURE = "بيانات محاكاة مرجعية — وليست حالة تشغيلية حية.";

// ── Detectors (textual layer — ADDITIONAL to the policy above) ──────────────
const RE_EXFIL_INPUT =
  /(system|developer)\s*(prompt|message|instructions?)|(reveal|show|print|repeat|dump|leak)[^.]*(prompt|instruction|system)|(اكشف|أظهر|اعرض|اطبع|كرر|ما|أعطني)[^.]*(تعليمات|التعليمات|تعليماتك|البرومبت|النظام(ية)?)|(المادة|القسم|العنوان|السطر|رقم)[^.]*(تعليمات|النظام|prompt|instruction)/i;
/**
 * Verbatim fragments of the SERVER-SIDE system prompt. Any of them appearing in
 * a model turn means the instructions leaked, so the turn is refused whole
 * (partial disclosure = full disclosure).
 *
 * ── WHY THE RETIRED SPELLINGS ARE LISTED TOO ──
 * The 2026-08-09 identifier break renamed `FINN` to `SADEED` across the repo —
 * and the rename moved BOTH SIDES of this list: the prompt headers changed and
 * so did the markers, so the guard stayed green while it stopped guarding the
 * only text that can still carry the old wording. A leak is not always text the
 * CURRENT prompt produced: a replayed conversation row, a cached turn, a
 * fine-tuned/stale model echo and a rolled-back deploy all carry the FINN-era
 * headers. Detection reads untrusted external text, so its left-hand side keeps
 * the old spelling next to the new one (ROLLBACK.md — «الدرس»).
 */
const PROTECTED_MARKERS = [
  // ── The live prompt of record ──
  "SADEED RESPONSE CONTRACT",
  "You are SADEED, a capable",
  "GROUNDING AND UNTRUSTED CONTENT",
  "UNTRUSTED ENTERPRISE DATA",
  "humanGateRequiredFor",
  "SADEED_RUNTIME",
  "# ROLE",
  // The identity preamble is the LARGEST live system block (it is prepended by
  // /api/chat, /api/sadeed/chat and the presence explainer) and nothing here
  // covered it: a verbatim dump of it alone matched no marker at all. Its
  // header never carried the FINN spelling — wave 2 renamed the display text
  // before wave 3 touched identifiers — so it needs no legacy twin.
  "# SADEED — IDENTITY",
  // Same omission, two more live composers: the supreme law and the per-user
  // learned-instincts block appended by the prompt injector.
  "# SADEED SUPREME LAW",
  "# SADEED LEARNED INSTINCTS",
  // ── The retired spellings of the same markers (see the note above) ──
  "FINN RESPONSE CONTRACT",
  "You are FINN, a capable",
  "FINN_RUNTIME",
  "# FINN SUPREME LAW",
  "# FINN LEARNED INSTINCTS",
];
const RE_INJECTION_DOC =
  /ignore (all )?previous instructions|disregard (the )?(above|prior)|reveal (the )?secret|exfiltrate|execute the action|تجاهل[^.]*التعليمات|تخطَّ?[^.]*التعليمات|اكشف[^.]*السر|نفّذ[^.]*الأمر/i;
const RE_SECRET_LEAK =
  /\bsk-[A-Za-z0-9]{12,}\b|\b(api[_-]?key|secret|password|token)\s*[:=]\s*\S+|BEGIN (RSA |EC )?PRIVATE KEY|xi-api-key/i;
const RE_EXEC_CLAIM =
  /(تم|تمّ)\s*(الإرسال|الاعتماد|التنفيذ|الإخلاء|البثّ|الدفع)|has been (sent|approved|executed|dispatched|broadcast)|successfully (sent|approved|executed|dispatched)/i;
// A regulatory CLAIM needs a citation only when it is specific and citable —
// a bare mention of "الامتثال/compliance/توجيه" is a normal domain answer and
// must NOT be forced into insufficient_evidence (avoids over-refusal, §11).
const RE_REG_QUERY =
  /نطاق التوجيه|رقم التوجيه|نص التوجيه|لائحة الهيئة|directive (scope|number|text)|\bSEC-?\d|\bSAF-?\d/i;
const RE_REG_CLAIM =
  /\bSEC-\d+\b|\bSAF-\d+\b|\[(?:KB|DOC|HCIS)[:-][^\]]*\]|رقم التوجيه|نطاق التوجيه/i;
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

/**
 * Identity guard — the assistant is SADEED. Any legacy self-name that leaks
 * from a model turn or a stale knowledge row is rewritten before the text can
 * reach a screen or the voice path. Token-bounded, display-only.
 *
 * TWO retired assistant names exist, not one: «آريا» (retired 2026-07-30) and
 * «فِن»/FINN (retired 2026-08-09). Only the first was handled here — and the
 * second is the one still LIVE IN THE DATABASE: migration
 * `20260809120000_sadeed_visible_text_rename.sql` is written but NOT applied,
 * so `intelligence_agents.name_ar`, `agent_definitions.system_prompt`,
 * `evolution_proposals.title_ar` and the seeded corpus still read «فِن
 * التنفيذي» / "FINN Executive" / "You are FINN, the executive AI". Those rows
 * reach the screen and the speaker THROUGH this function, which was letting
 * them pass untouched. Both names stay on the LEFT-HAND SIDE for as long as a
 * stored row can still carry them (ROLLBACK.md — «الدرس»).
 */
const RE_LEGACY_NAME_AR = /\u0622\u0631\u064A\u0627|\u0627\u0631\u064A\u0627/g;
const RE_LEGACY_NAME_EN = /\bA\u0052IA\b/gi;
/**
 * The Arabic form of the SECOND retired name, exactly as the APPLIED migration
 * `20260730130000_finn_visible_text_rename.sql` wrote it into the live rows:
 * ف + KASRA + ن (optionally shadda'd). The kasra is REQUIRED, and that is the
 * whole safety margin: bare «فن» is the ordinary Arabic word for "art", and a
 * guard that rewrote that to «سَدِيد» would corrupt correct prose — which is how
 * a guard earns its own deletion. The diacritized spelling is the retired
 * proper noun and nothing else.
 *
 * The boundary is spelled out as "no Arabic letter on either side" because
 * JavaScript's `\b` is ASCII-only and never fires at an Arabic/Arabic seam —
 * the same reason the identity-contract guard spells out its VOICE_OLD_AR
 * boundary. A single leading clitic (و/ف/ب/ل/ك — «وفِن» appears verbatim in
 * that migration) is captured and re-emitted instead of blocking the match.
 */
const RE_LEGACY_ASSISTANT_AR = /(?<![ء-ي])([وفبلك]?)فِنّ?(?![ء-ي])/g;
/**
 * The Latin form. Lookarounds rather than a word boundary, so the LIVE
 * identifiers survive: `finn_knowledge` / `finn_documents` are table names and
 * `finn-portrait.png` is an asset key (owner directive — the ban is on display
 * text, never on identifiers), and a `\b` boundary would have rewritten the
 * hyphenated ones.
 */
const RE_LEGACY_ASSISTANT_EN = /(?<![A-Za-z0-9_-])FINN(?![A-Za-z0-9_-])/gi;
const RE_LEGACY_PLATFORM_AR = /(?:ال)?(?:نِكْسِيُوس|نكسيوس|نيكسيوس|نيكسوس|نكسوس)/g;
const RE_LEGACY_PLATFORM_WITH_PREFIX_AR =
  /منصة\s+(?:ال)?(?:نِكْسِيُوس|نكسيوس|نيكسيوس|نيكسوس|نكسوس)/g;
const RE_LEGACY_PLATFORM_EN = /\bNEXIOS(?:\s+AI\s+OS)?\b/gi;

/**
 * Self-introduction clause ban — «أنا SADEED، الذكاء التنفيذي لـ NEXIOS» (and
 * its legacy forms / English twin) must never appear in a chat turn. BOTH
 * retired names are alternatives on the left: a stored greeting row that still
 * opens «أنا فِن، الذكاء التنفيذي…» must lose the whole clause, not merely have
 * the name swapped inside it.
 */
const RE_SELF_INTRO_AR = new RegExp(
  "\\s*(?:أهلا[ًا]?\\s*بك[،,]?\\s*)?أنا\\s+(?:SADEED|FINN|فِ?نّ?|\u0622\u0631\u064A\u0627|\u0627\u0631\u064A\u0627|A\u0052IA)\\s*[،,]?\\s*الذكاء\\s+التنفيذي\\s+(?:لـ?\\s*)?(?:NEXIOS|نيكسيوس|نكسيوس)?\\s*[.،,!]?",
  "gi",
);
const RE_SELF_INTRO_EN = new RegExp(
  "\\s*(?:hi|hello)?[,]?\\s*I(?:'m| am)\\s+(?:SADEED|FINN|A\u0052IA)\\s*,?\\s*the\\s+executive\\s+intelligence\\s+(?:of|for)\\s+NEXIOS\\s*[.!]?",
  "gi",
);

export function enforceSadeedIdentity(text: string): string {
  const platformReplacement = /[\u0600-\u06ff]/.test(text) ? "المنصة" : "the platform";
  return (
    text
      .replace(RE_SELF_INTRO_AR, " ")
      .replace(RE_SELF_INTRO_EN, " ")
      // Owner directive 2026-08-09: the displayed assistant name is the brand
      // itself — «سَدِيد» in Arabic prose, «SADEED» in Latin prose.
      .replace(RE_LEGACY_NAME_AR, "سَدِيد")
      .replace(RE_LEGACY_NAME_EN, "SADEED")
      // The second retired name — the one the un-migrated rows still carry.
      // `$1` re-emits the captured Arabic clitic («وفِن» ⇒ «وسَدِيد»).
      .replace(RE_LEGACY_ASSISTANT_AR, "$1سَدِيد")
      .replace(RE_LEGACY_ASSISTANT_EN, "SADEED")
      .replace(RE_LEGACY_PLATFORM_WITH_PREFIX_AR, "المنصة")
      .replace(RE_LEGACY_PLATFORM_AR, "المنصة")
      .replace(RE_LEGACY_PLATFORM_EN, platformReplacement)
      // Preserve Markdown paragraphs/lists. Only compact horizontal whitespace;
      // collapsing all \s previously flattened every executive report to a line.
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function simulationDisplayText(modelText: string): string {
  const marked = modelText
    .replace(/البيانات\s+الحية/g, "البيانات المرجعية")
    .replace(/الحالة\s+الحية/g, "الحالة المرجعية")
    .replace(/نسبة\s+الامتثال\s+الحية/g, "نسبة الامتثال المرجعية")
    .replace(/(المؤشرات|الأرقام|الارقام|النسب)\s+الحية/g, "$1 المرجعية")
    .replace(/\blive\s+(data|status)\b/gi, "reference $1")
    .trim();
  if (!marked) return SIMULATION_LINE;
  if (marked.includes(SIMULATION_DISCLOSURE)) return marked;
  return `${marked}\n\n> ${SIMULATION_DISCLOSURE}`;
}

// ── The branded constructor (module-private) ────────────────────────────────
function make(
  status: SadeedOutputStatus,
  displayText: string,
  auditReason: string,
  extra: Partial<
    Omit<SafeSadeedOutput, typeof SafeBrand | "status" | "displayText" | "auditReason">
  > = {},
): SafeSadeedOutput {
  // The brand is a compile-time phantom only (a `unique symbol` with no runtime
  // value); it exists to stop any module outside this file from constructing a
  // SafeSadeedOutput. We build the plain object and assert the brand here.
  const safeText = enforceSadeedIdentity(displayText);
  return {
    status,
    displayText: safeText,
    ttsText: extra.ttsText ? enforceSadeedIdentity(extra.ttsText) : safeText,
    citations: extra.citations ?? [],
    observedAt: extra.observedAt ?? null,
    isSimulation: extra.isSimulation ?? false,
    approval: extra.approval ?? { required: false, decidedBy: null },
    executionReceipt: extra.executionReceipt ?? null,
    orgId: extra.orgId ?? null,
    pii: extra.pii ?? "none",
    auditReason,
  } as unknown as SafeSadeedOutput;
}

/**
 * Finalize a raw model turn into a guarded, branded output. Deterministic and
 * fail-closed. This is the sole producer of SafeSadeedOutput.
 */
export function finalizeSadeedOutput(req: SadeedOutputRequest): SafeSadeedOutput {
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
      if (req.simulationDataAvailable) {
        const { text, pii } = redactPii(simulationDisplayText(model));
        return make("simulation", text, "reference-simulation", {
          isSimulation: true,
          observedAt: req.trustedClockISO,
          pii,
          orgId,
        });
      }
      return make("simulation", SIMULATION_LINE, "no-live-data", { isSimulation: true, orgId });
    }

    // (c) Evidence — a SPECIFIC regulatory claim/query needs a real citation.
    if (RE_REG_QUERY.test(req.userText) || RE_REG_CLAIM.test(model)) {
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
    if (!model.trim()) return make("refusal", SAFE_ERROR_LINE, "empty-model-output", { orgId });
    const { text, pii } = redactPii(model);
    return make("answer", text, "answer", { pii, isSimulation: req.isSimulationEnv, orgId });
  } catch {
    // (h) Fail closed — never leak raw output on an internal error.
    return make("refusal", SAFE_ERROR_LINE, "guard-error-failclosed");
  }
}

/** The ONLY way to get UI text — accepts the brand, never a raw string. */
export function renderForUI(safe: SafeSadeedOutput): string {
  return safe.displayText;
}

/** The ONLY way to get TTS text — accepts the brand, never a raw string. */
export function sadeedTtsTextFrom(safe: SafeSadeedOutput): string {
  return safe.ttsText;
}

/**
 * Deterministic content-safety re-validation for text arriving at an HTTP sink
 * (e.g. the TTS endpoint) where the in-process brand cannot be trusted. Blocks
 * any protected-marker or secret leakage, redacts PII, and enforces the SADEED
 * identity so the retired name can never be SPOKEN even when the caller posts
 * raw text straight to the voice API. Returns ok=false when the text must NOT
 * be spoken (caller uses a safe fixed line, never raw).
 */
export function revalidateSpeakableText(text: string): {
  ok: boolean;
  text: string;
  pii: PiiClass;
} {
  if (RE_SECRET_LEAK.test(text) || outputLeaksSystem(text)) {
    return { ok: false, text: "", pii: "blocked" };
  }
  const { text: redacted, pii } = redactPii(text);
  return { ok: true, text: enforceSadeedIdentity(redacted), pii };
}

/**
 * True if text leaks a secret or protected system content. Used by boundaries
 * (outbound email/SMS, exports) that may legitimately carry PII under an
 * explicit human-approval policy but must NEVER carry secrets or system prompt.
 */
export function containsUnsafeLeakage(text: string): boolean {
  return RE_SECRET_LEAK.test(text) || outputLeaksSystem(text);
}
