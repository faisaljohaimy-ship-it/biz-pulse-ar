/**
 * Environment manifest + validator — one declarative source of truth for the
 * environment variables SADEED reads, grouped by the capability each powers.
 *
 * DOCTRINE (constitution: «SADEED لا تتعطل»): the app is designed to DEGRADE, not
 * crash, when a key is absent — a missing provider key must never take the
 * whole surface down. So this module never throws at import/boot: it REPORTS.
 *  - validateEnv() returns a structured report (which capabilities are ready,
 *    which are missing what) that a boot logger can print as a clear warning.
 *  - assertCapability() is an OPT-IN strict check for the few call sites that
 *    genuinely cannot proceed without a key (e.g. an offline build script) —
 *    it throws a useful, specific message there and only there.
 *
 * Secrets are NEVER read into, or logged by, this module — it deals in variable
 * NAMES and presence only, never values (constitution art. 7 & 13).
 */

/** How a capability's variables combine to be considered "ready". */
export type Requirement = "all" | "one-of" | "optional";

export interface EnvVarSpec {
  /** The exact process.env / import.meta.env key. */
  name: string;
  /** Where it is read. Client vars are public (VITE_*); server vars are secret. */
  scope: "client" | "server";
  /** Secret values must live only in the platform, never in the repo. */
  sensitive: boolean;
  /** One-line purpose (no value ever). */
  description: string;
}

export interface CapabilitySpec {
  key: string;
  labelAr: string;
  requirement: Requirement;
  vars: readonly EnvVarSpec[];
}

const S = (name: string, description: string, sensitive = true): EnvVarSpec => ({
  name,
  scope: "server",
  sensitive,
  description,
});
const C = (name: string, description: string): EnvVarSpec => ({
  name,
  scope: "client",
  sensitive: false,
  description,
});

/**
 * The capability catalogue. Adding a variable here is the single place that
 * teaches the validator, the boot logger, and `.env.example` reviewers what a
 * key is for. `requirement`:
 *  - "one-of": the capability is ready if ANY listed var is set (e.g. the ARIA
 *    brain is ready with any single provider key).
 *  - "all": every listed var must be set (e.g. a Twilio SMS send).
 *  - "optional": informational; never counts as "missing".
 */
export const ENV_CAPABILITIES: readonly CapabilitySpec[] = [
  {
    key: "supabase",
    labelAr: "قاعدة البيانات والمصادقة (Supabase)",
    requirement: "all",
    vars: [
      C("VITE_SUPABASE_URL", "Supabase project URL (public)"),
      C("VITE_SUPABASE_ANON_KEY", "Supabase anon key (public, RLS-guarded)"),
    ],
  },
  {
    key: "aria-brain",
    labelAr: "عقل سَدِيد ومجلس الوكلاء (Google Gemini فقط)",
    requirement: "one-of",
    vars: [
      S("GEMINI_API_KEY", "Google Gemini native API"),
      S("GOOGLE_GENERATIVE_AI_API_KEY", "Google Generative AI key"),
    ],
  },
  {
    key: "sadeed-voice",
    labelAr: "صوت سَدِيد (ElevenLabs — هوية مقفلة)",
    requirement: "all",
    vars: [S("ELEVENLABS_API_KEY", "ElevenLabs — SADEED's exclusive voice")],
  },

  {
    key: "finn-owner-gate",
    labelAr: "بوّابة مالك فِن (قائمة UUID بفواصل — تفشل مغلقة، خادمية فقط)",
    requirement: "all",
    vars: [
      S(
        "FINN_OWNER_USER_IDS",
        "FINN owner user ids (UUIDs, comma-separated); unset/empty/invalid ⇒ nobody enters; server only, never sent to the client",
      ),
    ],
  },
  {
    key: "finn-engine",
    labelAr: "محرّك فِن (GPT أساسًا، والاحتياطي Gemini معلَنٌ عند العطل)",
    requirement: "optional",
    vars: [
      S(
        "OPENAI_API_KEY",
        "OpenAI — FINN's primary engine; absent ⇒ declared fallback to the backup engine",
      ),
      S(
        "FINN_OPENAI_MODEL",
        "Optional OpenAI model id for FINN (default gpt-4.1); server-owned, the client cannot choose",
        false,
      ),
    ],
  },
  {
    key: "finn-quota",
    labelAr: "حصّة فِن اليومية (سطح مستقلّ عن سَدِيد — اختياري، له افتراضات)",
    requirement: "optional",
    vars: [
      S(
        "FINN_DAILY_GLOBAL",
        "Optional daily cap for the whole FINN surface (default 2000); separate bucket from SADEED chat",
        false,
      ),
      S(
        "FINN_DAILY_PER_IDENTITY",
        "Optional daily cap per FINN user identity (default 500); separate bucket from SADEED chat",
        false,
      ),
    ],
  },
  {
    key: "outbound-email",
    labelAr: "البريد الصادر (Resend)",
    requirement: "all",
    vars: [
      S("RESEND_API_KEY", "Resend transactional email"),
      S("RESEND_FROM_EMAIL", "Verified from-address", false),
    ],
  },
  {
    key: "outbound-sms",
    labelAr: "الرسائل النصية الصادرة (Twilio)",
    requirement: "all",
    vars: [
      S("TWILIO_ACCOUNT_SID", "Twilio account SID"),
      S("TWILIO_AUTH_TOKEN", "Twilio auth token"),
    ],
  },
  {
    key: "message-approval",
    labelAr: "توقيع اعتماد الرسائل (≥32 حرفًا)",
    requirement: "all",
    vars: [
      S("SADEED_MESSAGE_APPROVAL_SECRET", "Signs approval tokens; encrypts payloads"),
      S("ARIA_MESSAGE_APPROVAL_SECRET", "Legacy alias of SADEED_MESSAGE_APPROVAL_SECRET"),
    ],
  },
];

export interface CapabilityStatus {
  key: string;
  labelAr: string;
  requirement: Requirement;
  ready: boolean;
  missing: string[];
}

export interface EnvReport {
  ready: CapabilityStatus[];
  degraded: CapabilityStatus[];
  /** True when every non-optional capability has what it needs. */
  allReady: boolean;
}

type EnvLike = Record<string, string | undefined>;

const isSet = (env: EnvLike, name: string): boolean => {
  const v = env[name];
  return typeof v === "string" && v.trim().length > 0;
};

function evaluate(cap: CapabilitySpec, env: EnvLike): CapabilityStatus {
  const setNames = cap.vars.filter((v) => isSet(env, v.name)).map((v) => v.name);
  const missing = cap.vars.filter((v) => !isSet(env, v.name)).map((v) => v.name);
  let ready: boolean;
  if (cap.requirement === "optional") ready = true;
  else if (cap.requirement === "one-of") ready = setNames.length > 0;
  else ready = missing.length === 0;
  // For one-of, "missing" is only meaningful when NONE are set.
  return {
    key: cap.key,
    labelAr: cap.labelAr,
    requirement: cap.requirement,
    ready,
    missing: cap.requirement === "one-of" && ready ? [] : missing,
  };
}

/** Pure: classify every capability as ready or degraded. Never throws. */
export function validateEnv(env: EnvLike = readEnv()): EnvReport {
  const statuses = ENV_CAPABILITIES.map((c) => evaluate(c, env));
  const ready = statuses.filter((s) => s.ready);
  const degraded = statuses.filter((s) => !s.ready);
  return { ready, degraded, allReady: degraded.length === 0 };
}

/**
 * Opt-in strict check for a single capability, for the rare call site that
 * truly cannot degrade (an offline generator script, a server route that has
 * no simulation fallback). Throws a specific, useful message — names only.
 */
export function assertCapability(key: string, env: EnvLike = readEnv()): void {
  const cap = ENV_CAPABILITIES.find((c) => c.key === key);
  if (!cap) throw new Error(`Unknown env capability: ${key}`);
  const status = evaluate(cap, env);
  if (status.ready) return;
  const how = cap.requirement === "one-of" ? "at least one of" : "all of";
  throw new Error(
    `Capability "${key}" (${cap.labelAr}) is not configured — set ${how}: ${status.missing.join(", ")}`,
  );
}

/** A one-line, value-free summary safe to log at boot. */
export function formatEnvReport(report: EnvReport = validateEnv()): string {
  const readyKeys = report.ready.map((s) => s.key).join(", ") || "none";
  const degraded = report.degraded
    .map((s) => `${s.key} (missing: ${s.missing.join("/")})`)
    .join("; ");
  return report.allReady
    ? `[env] all capabilities configured: ${readyKeys}`
    : `[env] ready: ${readyKeys} — degraded (graceful): ${degraded}`;
}

/** Read the ambient environment without assuming Node vs Vite. Never throws. */
function readEnv(): EnvLike {
  const out: EnvLike = {};
  try {
    if (typeof process !== "undefined" && process.env) Object.assign(out, process.env);
  } catch {
    /* no process — browser */
  }
  return out;
}
