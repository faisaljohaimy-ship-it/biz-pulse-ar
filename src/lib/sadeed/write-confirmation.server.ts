/**
 * بوابة التأكيد البشري لأدوات الكتابة في دردشة سَدِيد (`/api/chat`).
 *
 * الثابت الدستوري: «أي إجراء كتابة أو طوارئ خلف بوابة تأكيد بشري». الأداة
 * الكاتبة تُستدعى مرّتين: الأولى ⇐ لا تكتب شيئًا، وتعيد ملخّصًا عربيًّا يُعرض
 * على المستخدم، ويُحفظ الاقتراح على الخادم؛ والثانية بعد أن يؤكّد المستخدم في
 * رسالته **التالية** ⇐ بالوسائط نفسها، فيُطابَق التأكيد بالاقتراح المحفوظ.
 *
 * **لماذا على الخادم لا في يد النموذج:** المسار يُسقط أجزاء الأدوات من السجلّ
 * بين الطلبات (`sanitizeHistory`)، والعميل لا يتلقّى إلا النصّ الآمن — فرمزٌ
 * يُعاد في نتيجة الأداة لا يصل إلى الطلب التالي أبدًا، ونصّه إن ظهر في الردّ
 * يُسقط الردّ كلّه (حارس تسرّب الأسرار في `output/finalize.ts`). فالرمز الموقَّع
 * صار **ختمًا** لصفّ الاقتراح في السجلّ (أدناه)، لا شيئًا يحمله النموذج.
 *
 * الرمز = base64url(JSON payload) + "." + base64url(HMAC-SHA256).
 * الحمولة {v, tool, uid, org, ah, exp, n} تربطه بالأداة والمستخدم والمؤسسة
 * وبصمة الوسائط (sha256 لـJSON مرتّب المفاتيح بلا `confirmation_token`)،
 * وتنتهي بعد عشر دقائق، و`n` رقمٌ عابر يمنع إعادة التشغيل في طبقة الأداة.
 *
 * مادة المفتاح سرٌّ قائم لا سرٌّ جديد (سرّ اعتماد الرسائل الصادرة)، مفصولُ
 * المجال بالبادئة `sadeed-chat-write-confirm:v1|` فلا يصلح رمز اعتماد بريدٍ
 * رمزَ كتابة ولا العكس. Web Crypto وحده — يعمل على Workers وNode.
 * غياب السرّ أو قصره ⇐ نتيجة «unavailable» مكتوبة، والمستدعي يفشل مغلقًا.
 */
import type { Json } from "@/integrations/supabase/types";

export const WRITE_CONFIRMATION_TTL_MS = 10 * 60 * 1000;
const DOMAIN_PREFIX = "sadeed-chat-write-confirm:v1|";
const MAX_TOKEN_LENGTH = 4096;

export type WriteConfirmationSubject = {
  tool: string;
  userId: string;
  /** المؤسسة التي تُنسب إليها الكتابة؛ `null` لأدوات المستخدم بلا مؤسسة. */
  orgId: string | null;
  args: Record<string, unknown>;
};

type WriteConfirmationPayload = {
  v: 1;
  tool: string;
  uid: string;
  org: string | null;
  ah: string;
  exp: number;
  n: string;
};

export type SignWriteConfirmationResult =
  | { ok: true; token: string; nonce: string; expiresAt: string }
  | { ok: false; reason: "unavailable" };

export type VerifyWriteConfirmationResult =
  | { ok: true; nonce: string; expiresAt: string }
  | {
      ok: false;
      reason:
        | "unavailable"
        | "malformed"
        | "signature_mismatch"
        | "expired"
        | "subject_mismatch"
        | "args_mismatch";
    };

type ClockOptions = { now?: number };

function confirmationSecret(): string | null {
  // SADEED_* أوّلًا والاسم القديم احتياطًا — النمط نفسه في
  // `outbound-messaging.server.ts` و`output/provenance.server.ts`.
  const value = (
    process.env.SADEED_MESSAGE_APPROVAL_SECRET ?? process.env.ARIA_MESSAGE_APPROVAL_SECRET
  )?.trim();
  return value && value.length >= 32 ? value : null;
}

/** هل البوابة قابلة للعمل؟ لا ⇐ المستدعي يفشل مغلقًا قبل أي قراءة أو كتابة. */
export function writeConfirmationAvailable(): boolean {
  return confirmationSecret() !== null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** مقارنة بزمنٍ ثابت لا يتوقّف عند أول اختلاف. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

async function hmacSha256(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${DOMAIN_PREFIX}${value}`),
  );
  return new Uint8Array(signature);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** JSON بمفاتيح مرتّبة تكراريًّا، والقيم `undefined` تسقط كما في JSON.stringify. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? "null" : canonicalJson(item))).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
  return `{${entries.join(",")}}`;
}

/** بصمة الوسائط التي يلتزم بها الرمز — الرمز نفسه خارجها. */
export async function writeConfirmationArgsHash(args: Record<string, unknown>): Promise<string> {
  const { confirmation_token: _omit, ...rest } = args;
  void _omit;
  return sha256Hex(canonicalJson(rest));
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function signWriteConfirmation(
  subject: WriteConfirmationSubject,
  options: ClockOptions = {},
): Promise<SignWriteConfirmationResult> {
  const secret = confirmationSecret();
  if (!secret) return { ok: false, reason: "unavailable" };
  const exp = (options.now ?? Date.now()) + WRITE_CONFIRMATION_TTL_MS;
  const payload: WriteConfirmationPayload = {
    v: 1,
    tool: subject.tool,
    uid: subject.userId,
    org: subject.orgId ?? null,
    ah: await writeConfirmationArgsHash(subject.args),
    exp,
    n: randomNonce(),
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = toBase64Url(await hmacSha256(secret, encoded));
  return {
    ok: true,
    token: `${encoded}.${signature}`,
    nonce: payload.n,
    expiresAt: new Date(exp).toISOString(),
  };
}

function isPayload(value: unknown): value is WriteConfirmationPayload {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    p.v === 1 &&
    typeof p.tool === "string" &&
    typeof p.uid === "string" &&
    (p.org === null || typeof p.org === "string") &&
    typeof p.ah === "string" &&
    typeof p.exp === "number" &&
    Number.isFinite(p.exp) &&
    typeof p.n === "string" &&
    p.n.length > 0
  );
}

export async function verifyWriteConfirmation(
  token: string,
  subject: WriteConfirmationSubject,
  options: ClockOptions = {},
): Promise<VerifyWriteConfirmationResult> {
  const secret = confirmationSecret();
  if (!secret) return { ok: false, reason: "unavailable" };
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: "malformed" };
  }
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra !== undefined) return { ok: false, reason: "malformed" };
  const actual = fromBase64Url(signature);
  if (!actual) return { ok: false, reason: "malformed" };
  // التوقيع أوّلًا: لا تُقرأ حمولةٌ لم يثبت أنها منّا.
  const expected = await hmacSha256(secret, encoded);
  if (!constantTimeEqual(expected, actual)) return { ok: false, reason: "signature_mismatch" };
  const payloadBytes = fromBase64Url(encoded);
  if (!payloadBytes) return { ok: false, reason: "malformed" };
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!isPayload(payload)) return { ok: false, reason: "malformed" };
  if (payload.exp <= (options.now ?? Date.now())) return { ok: false, reason: "expired" };
  if (
    payload.tool !== subject.tool ||
    payload.uid !== subject.userId ||
    payload.org !== (subject.orgId ?? null)
  ) {
    return { ok: false, reason: "subject_mismatch" };
  }
  if (payload.ah !== (await writeConfirmationArgsHash(subject.args))) {
    return { ok: false, reason: "args_mismatch" };
  }
  return { ok: true, nonce: payload.n, expiresAt: new Date(payload.exp).toISOString() };
}

// ── التأكيد الصريح في رسالة المستخدم ─────────────────────────────────────
// قائمة بيضاء ضيّقة لا مصنِّف: الرسالة كلّها (بعد التطبيع) كلمة تأكيد أو
// اثنتان أو ثلاث من القائمة، بعلامات ترقيم اختيارية. علامة الاستفهام ليست
// منها — «نعم؟» سؤالٌ لا تأكيد. وأي نصٍّ أطول من 40 حرفًا مرفوض: نصّ مرفقٍ
// مدموجٌ في دور المستخدم لا يصير موافقةً لأنه يحوي «نعم».
const MAX_CONFIRMATION_CHARS = 40;
const CONFIRMATION_WORD =
  "(?:نعم|اكد|اؤكد|موافق|اوافق|تاكيد|نفذ|confirm|confirmed|i confirm|yes|proceed|go ahead)";
const CONFIRMATION_RE = new RegExp(`^${CONFIRMATION_WORD}(?: ${CONFIRMATION_WORD}){0,2}$`, "u");

function normalizeConfirmation(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[ً-ٰٟـ]/g, "") // التشكيل والتطويل
    .replace(/[أإآ]/g, "ا")
    .toLowerCase()
    .replace(/[.,!،؛;:…\-—–]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isExplicitConfirmation(lastUserText: string | null | undefined): boolean {
  const trimmed = (lastUserText ?? "").trim();
  if (!trimmed || trimmed.length > MAX_CONFIRMATION_CHARS) return false;
  return CONFIRMATION_RE.test(normalizeConfirmation(trimmed));
}

// ── تفاصيل الاقتراح مشفَّرة ──────────────────────────────────────────────
// الوسائط والملخّص يُحفظان مع الاقتراح ليُعادا إلى النموذج حرفًا حين يؤكّد
// المستخدم ويعيد النموذج بناء الوسائط بصياغةٍ أخرى — فيُنفَّذ ما رآه المستخدم
// لا ما أعاد النموذج تأليفه. والسجلّ يقرؤه أعضاء المؤسسة (RLS)، ومهام المستخدم
// وذاكرته ليست لهم، فالتفاصيل AES-GCM بمفتاحٍ مشتقّ من السرّ نفسه بمجالٍ منفصل،
// ومربوطة (additional data) بالمستخدم والأداة والرقم العابر والبصمة.

export type ConfirmationDetails = { args: Record<string, unknown>; summary: string };
type DetailsBinding = { userId: string; tool: string; nonce: string; argsHash: string };

async function detailsKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${DOMAIN_PREFIX}details|${secret}`),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function detailsAad(bind: DetailsBinding): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${bind.userId}|${bind.tool}|${bind.nonce}|${bind.argsHash}`);
}

export async function sealConfirmationDetails(
  details: ConfirmationDetails,
  bind: DetailsBinding,
): Promise<string | null> {
  const secret = confirmationSecret();
  if (!secret) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: detailsAad(bind) },
    await detailsKey(secret),
    new TextEncoder().encode(JSON.stringify(details)),
  );
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

/** يفكّ التفاصيل ويتحقّق أن بصمة الوسائط المفكوكة هي البصمة المختومة. */
export async function openConfirmationDetails(
  sealed: string,
  bind: DetailsBinding,
): Promise<ConfirmationDetails | null> {
  const secret = confirmationSecret();
  if (!secret || typeof sealed !== "string") return null;
  const [ivText, bodyText, extra] = sealed.split(".");
  if (!ivText || !bodyText || extra !== undefined) return null;
  const iv = fromBase64Url(ivText);
  const body = fromBase64Url(bodyText);
  if (!iv || !body) return null;
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: detailsAad(bind) },
      await detailsKey(secret),
      body,
    );
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as Partial<ConfirmationDetails>;
    if (
      !parsed ||
      typeof parsed.summary !== "string" ||
      !parsed.args ||
      typeof parsed.args !== "object" ||
      Array.isArray(parsed.args)
    ) {
      return null;
    }
    if ((await writeConfirmationArgsHash(parsed.args)) !== bind.argsHash) return null;
    return { args: parsed.args, summary: parsed.summary };
  } catch {
    return null;
  }
}

// ── سجلّ الاقتراحات المعلّقة — يعبر حدّ الطلب ────────────────────────────
// يُحفظ في سجلّ أفعال سَدِيد القائم (`finn_actions_log`؛ المادة 26 في
// `constitution.ts`: كل نداء أداة يُسجَّل بمدخله ومخرجه وحالته) بلا تغيير مخطط،
// وبعميل الخدمة وحده. ولا يُعتمد على امتيازات الجدول في الإنتاج (لم تُقَس هنا):
// صفُّ اقتراحٍ أُدرج بلا السرّ يسقط عند فحص ختمه. أربعة أفعال:
//
// - `chat.write.confirmation_requested`: اقتراحٌ عُرض ملخّصه — الأداة والمؤسسة
//   والدور والبصمة والرقم العابر، والرمز الموقَّع **ختمًا** للصفّ (صفٌّ مزوَّر بلا
//   السرّ لا يُقبل)، والتفاصيل مشفَّرة. لا وسائط مقروءة فيه.
// - `chat.write.confirmed`: مطالبةٌ تُكتب **قبل** الكتابة؛ تعذّرها ⇐ لا كتابة،
//   ولا يُنفَّذ إلا أقدم مطالبةٍ للرقم العابر (نداءان متزامنان لا يكتبان مرّتين).
// - `chat.write.executed` / `chat.write.failed`: الأثر بعد الكتابة، أفضل‑جهد
//   كبقيّة السجلّ (فشله لا يُسقط فعلًا تمّ).
//
// والاقتراح لا يُؤكَّد إلا من طلبٍ **لاحق** لطلبه، ومن **آخر** طلبٍ سابقٍ اقترح
// فيه سَدِيد شيئًا: «نعم» تعود على آخر ما عُرض على المستخدم، لا على اقتراحٍ
// أقدم منه بقي معلّقًا. الطلب يُعرَّف بمعرّفٍ عشوائي لكل بناءٍ لأدوات الدردشة.

export const CONFIRMATION_LEDGER_TABLE = "finn_actions_log";
const ACTION_REQUESTED = "chat.write.confirmation_requested";
const ACTION_CONFIRMED = "chat.write.confirmed";
const ACTION_EXECUTED = "chat.write.executed";
const ACTION_FAILED = "chat.write.failed";
// المؤسسة الافتراضية للعمود غير الفارغ — القيمة نفسها في `audit-log.server.ts`
// وافتراض العمود في القاعدة؛ وأدوات المستخدم بلا مؤسسة تُقيَّد بـ`user_id` أصلًا.
const DEFAULT_LEDGER_ORG = "00000000-0000-0000-0000-000000000001";
const LEDGER_SCAN_LIMIT = 50;

export type PendingProposal = {
  tool: string;
  org: string | null;
  turn: string;
  nonce: string;
  argsHash: string;
  seal: string;
  details: string;
};

export type LedgerFailure = { ok: false; error: string };

type LedgerScope = { userId: string; orgId: string | null; tool: string };

async function ledgerClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function ledgerError(error: unknown): LedgerFailure {
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: unknown } | null)?.message ?? error);
  return { ok: false, error: message.slice(0, 300) };
}

function ledgerRow(scope: LedgerScope, action: string, input: Record<string, unknown>) {
  return {
    org_id: scope.orgId ?? DEFAULT_LEDGER_ORG,
    user_id: scope.userId,
    actor: "sadeed",
    action,
    surface: "chat",
    route: "/api/chat",
    article_refs: ["Article 26"],
    input: { tool: scope.tool, org: scope.orgId ?? null, ...input } as Json,
  };
}

function toProposal(input: unknown): PendingProposal | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const text = (key: string) => (typeof r[key] === "string" && r[key] ? (r[key] as string) : null);
  const tool = text("tool");
  const turn = text("turn");
  const nonce = text("nonce");
  const argsHash = text("args_hash");
  const seal = text("seal");
  const details = text("details");
  if (!tool || !turn || !nonce || !argsHash || !seal || !details) return null;
  const org = typeof r.org === "string" ? r.org : null;
  return { tool, org, turn, nonce, argsHash, seal, details };
}

export async function recordPendingConfirmation(
  entry: LedgerScope & {
    turn: string;
    nonce: string;
    argsHash: string;
    seal: string;
    details: string;
    expiresAt: string;
  },
): Promise<{ ok: true } | LedgerFailure> {
  try {
    const admin = await ledgerClient();
    const { error } = await admin.from(CONFIRMATION_LEDGER_TABLE).insert({
      ...ledgerRow(entry, ACTION_REQUESTED, {
        turn: entry.turn,
        nonce: entry.nonce,
        args_hash: entry.argsHash,
        seal: entry.seal,
        details: entry.details,
        expires_at: entry.expiresAt,
      }),
      status: "ok",
    });
    return error ? ledgerError(error) : { ok: true };
  } catch (error) {
    return ledgerError(error);
  }
}

/**
 * اقتراحات آخر طلبٍ سابقٍ للمستخدم داخل مدّة الصلاحية (كل الأدوات)، بلا
 * اقتراحات الطلب الحالي — فهي لم تُعرض بعد على المستخدم.
 */
export async function loadLatestProposalSet(
  userId: string,
  currentTurn: string,
  options: ClockOptions = {},
): Promise<{ ok: true; proposals: PendingProposal[] } | LedgerFailure> {
  try {
    const admin = await ledgerClient();
    const since = new Date((options.now ?? Date.now()) - WRITE_CONFIRMATION_TTL_MS).toISOString();
    const { data, error } = await admin
      .from(CONFIRMATION_LEDGER_TABLE)
      .select("input,created_at")
      .eq("user_id", userId)
      .eq("action", ACTION_REQUESTED)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(LEDGER_SCAN_LIMIT);
    if (error) return ledgerError(error);
    const rows = (data ?? [])
      .map((row) => toProposal((row as { input?: unknown }).input))
      .filter((row): row is PendingProposal => row !== null);
    const latest = rows.find((row) => row.turn !== currentTurn);
    return { ok: true, proposals: latest ? rows.filter((row) => row.turn === latest.turn) : [] };
  } catch (error) {
    return ledgerError(error);
  }
}

/**
 * ما جرى لهذا الرقم العابر: `claimed` ⇐ طُولب به من قبل فلا تنفيذ ثانٍ؛ و`failed`
 * ⇐ أثره المسجَّل «فشل» بلا «تنفيذ» — لم يُكتب شيء، فيُعرض اقتراحٌ جديد بدل
 * القول إنه نُفّذ. مطالبةٌ بلا أثرٍ مسجَّل تُعامَل منفَّذة (لا يُعرف أنها لم تُكتب).
 */
export async function readConfirmationUsage(
  userId: string,
  nonce: string,
): Promise<{ ok: true; claimed: boolean; failed: boolean } | LedgerFailure> {
  try {
    const admin = await ledgerClient();
    const { data, error } = await admin
      .from(CONFIRMATION_LEDGER_TABLE)
      .select("action")
      .eq("user_id", userId)
      .in("action", [ACTION_CONFIRMED, ACTION_EXECUTED, ACTION_FAILED])
      .contains("input", { nonce })
      .limit(LEDGER_SCAN_LIMIT);
    if (error) return ledgerError(error);
    const actions = new Set((data ?? []).map((row) => (row as { action?: unknown }).action));
    return {
      ok: true,
      claimed: actions.has(ACTION_CONFIRMED),
      failed: actions.has(ACTION_FAILED) && !actions.has(ACTION_EXECUTED),
    };
  } catch (error) {
    return ledgerError(error);
  }
}

/**
 * نافذة انتخاب المطالبة بالثواني: ستّة أضعاف مدّة صلاحية الاقتراح (10 د) وأقلّ من
 * يوم. الرقم العابر لا يُقبل أصلًا بعد انتهاء ختمه (`verifyWriteConfirmation`)،
 * فالدلو يكفي أن يعيش أطول من ذلك بهامش.
 */
export const CLAIM_ELECTION_WINDOW_SECONDS = 60 * 60;

/**
 * يطالب بالرقم العابر — **انتخابٌ ذرّي لا استنتاج ترتيب**.
 *
 * ١) يُدرج صفّ `chat.write.confirmed` أثرًا (سجلّ التدقيق)، ثم
 * ٢) يُسأل `public.check_rate_limit('wc-claim:<user>:<nonce>', 1, نافذة)` — دالةٌ
 *    ذرّية (INSERT … ON CONFLICT DO UPDATE تقفل الصفّ) تعيد `true` لنداءٍ واحد
 *    بالضبط مهما تزامن المتنافسون. `first` يُقرَّر بها **وحدها**.
 *
 * كان القرار «هل صفّي أقدم صفٍّ مرئي بترتيب (created_at, id)؟» بلا قيدٍ فريد في
 * الجدول. و`created_at` = بداية المعاملة لا إتمامها، فمعاملةٌ بدأت أبكر وتُتمّ أبطأ
 * تُقرأ أقدمَ بعد أن قرّر منافسُها أنه الأول — فيُنفَّذ الفعل مرّتين (قِيس في
 * `tests/integration/write-confirmation.integration.test.ts`).
 *
 * لماذا الإدراج قبل الانتخاب: لو فشل الإدراج (سجلّ التدقيق معطّل) لا يُستهلك
 * الدلو، فيبقى الاقتراح صالحًا ويُنفَّذ مرّةً واحدة عند إعادة «نعم» — فشلٌ مغلق لا
 * يحرق الاقتراح. ولو عُكس الترتيب لاستُهلك الرقم بلا أثرٍ ولا كتابة.
 *
 * وتبعيةٌ صريحة: الانتخاب يتطلّب أن تكون `check_rate_limit` متاحة (هي نفسها
 * بوّابة حصّة الذكاء). **أي خطأ فيها أو جوابٌ غير منطقي ⇒ `{ ok:false }` ⇒ المستدعي
 * `confirmation_unavailable` ولا كتابة.** والصفّ المدرَج يُتبَع حينها بأثر
 * `chat.write.failed` (أفضل جهد) كي لا يُقرأ الرقم «منفَّذًا»: إعادة «نعم» تعرض
 * اقتراحًا جديدًا. `first: false` ⇐ لا كتابة.
 */
export async function claimConfirmation(
  entry: LedgerScope & { turn: string; nonce: string; argsHash: string },
): Promise<{ ok: true; first: boolean } | LedgerFailure> {
  try {
    const admin = await ledgerClient();
    const { data: mine, error } = await admin
      .from(CONFIRMATION_LEDGER_TABLE)
      .insert({
        ...ledgerRow(entry, ACTION_CONFIRMED, {
          turn: entry.turn,
          nonce: entry.nonce,
          args_hash: entry.argsHash,
        }),
        status: "ok",
      })
      .select("id")
      .single();
    if (error || !mine) return ledgerError(error ?? "claim was not recorded");
    const unavailable = async (reason: unknown): Promise<LedgerFailure> => {
      const failure = ledgerError(reason);
      await recordConfirmationOutcome({
        userId: entry.userId,
        orgId: entry.orgId,
        tool: entry.tool,
        nonce: entry.nonce,
        executed: false,
        error: `claim election unavailable: ${failure.error}`,
      });
      return failure;
    };
    let verdict: { data: unknown; error: unknown };
    try {
      verdict = await admin.rpc("check_rate_limit", {
        _bucket_key: `wc-claim:${entry.userId}:${entry.nonce}`,
        _max_requests: 1,
        _window_seconds: CLAIM_ELECTION_WINDOW_SECONDS,
      });
    } catch (thrown) {
      return unavailable(thrown);
    }
    if (verdict.error) return unavailable(verdict.error);
    if (typeof verdict.data !== "boolean") return unavailable("claim election returned no verdict");
    return { ok: true, first: verdict.data };
  } catch (error) {
    return ledgerError(error);
  }
}

/** أثر ما بعد الكتابة — أفضل‑جهد: يُسجَّل فشله ولا يُسقط فعلًا تمّ. */
export async function recordConfirmationOutcome(
  entry: LedgerScope & {
    nonce: string;
    executed: boolean;
    entity?: Record<string, string>;
    error?: string;
  },
): Promise<void> {
  try {
    const admin = await ledgerClient();
    const { error } = await admin.from(CONFIRMATION_LEDGER_TABLE).insert({
      ...ledgerRow(entry, entry.executed ? ACTION_EXECUTED : ACTION_FAILED, {
        nonce: entry.nonce,
      }),
      output: {
        executed: entry.executed,
        ...(entry.entity ? { entity: entry.entity } : {}),
        ...(entry.error ? { error: entry.error.slice(0, 300) } : {}),
      } as Json,
      status: entry.executed ? "ok" : "error",
    });
    if (error) throw error;
  } catch (error) {
    console.error("[sadeed-write-confirmation] outcome audit failed", {
      tool: entry.tool,
      error: ledgerError(error).error,
    });
  }
}
