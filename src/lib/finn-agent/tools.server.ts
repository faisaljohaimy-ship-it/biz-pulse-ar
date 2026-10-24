/**
 * أدوات فِن الهندسية — **قراءةٌ فقط، للخادم وحده، بعد بوّابة المالك.**
 *
 * أمر المالك ٢٠٢٦/١٠/٢٤: فِن وكيلٌ هندسيّ فعليّ لا واجهةٌ شكلية، يفحص المستودع والنشر وحالة
 * المنصّة. وما بقي ثابتًا من قرار W5: **يقترح ولا ينفّذ** — فهذه الأدوات الثلاث تقرأ ولا تكتب،
 * ولا تنفّذ كودًا، ولا تلمس قاعدة الإنتاج، ولا تنشر، ولا تغيّر صلاحية.
 *
 * ## الحدود التي تحرسها الوحدة نفسها (لا الموجِّه وحده)
 *
 * 1. **قائمةٌ مغلقة** (`FINN_TOOL_NAMES`) وكل مدخلٍ مخطَّط بـzod: تعداداتٌ ومعرّف commit سداسيّ
 *    — لا نصٌّ حرّ يصير مسارًا أو استعلامًا.
 * 2. **مضيفان ثابتان** (`api.github.com` و`api.vercel.com`) والمستودع ثابتٌ في الكود؛ النموذج لا
 *    يختار مضيفًا ولا مستودعًا ولا مسارًا. و`method: "GET"` وحده و`redirect: "error"`.
 * 3. **تفشل مغلقةً**: بلا بيانات اعتمادها في بيئة الخادم تعيد `not_configured` صادقةً — لا
 *    اختلاق ولا بديلٌ مكتوب. والمفاتيح منفصلةٌ عن غيرها (`FINN_GITHUB_TOKEN` · `FINN_VERCEL_TOKEN`)
 *    ويُنصَح بأقلّ صلاحية (قراءة فقط)؛ لا تُسجَّل ولا تُعاد ولا يُحسب طولها.
 * 4. **مهلةٌ وسقف حجم** لكل نداءٍ، وأخطاء المنبع رموزٌ عامّة (`upstream_denied` · `timeout` …)
 *    لا جسم ردٍّ ولا ترويسة.
 * 5. **المخرجات بياناتٌ غير موثوقة** (`untrusted: true`): عناوين طلبات الدمج ورسائل الـcommit
 *    نصٌّ يكتبه غيرُ المالك أحيانًا، فتُنظَّف (محارف تحكّم · أنماط أسرار) وتُقصّ، ولا تحمل أسماء
 *    مؤلّفين ولا عناوين بريد. والموجِّه يوجب معاملتها بيانات لا أوامر.
 * 6. **سجلّ تدقيقٍ مقتضب**: اسم الأداة والنتيجة والزمن فقط — لا مدخلات ولا مخرجات.
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { buildStamp } from "@/lib/build/build-info.server";
import { aiKillSwitchOn } from "@/lib/governance/ai-quota.server";
import { validateEnv } from "@/lib/env/env-manifest";
import { FINN_TOOL_NAMES, type FinnToolName } from "./tool-names";
import type { FinnEngineStatus } from "./status";

/** أقصى عدد خطواتٍ (نداء نموذج + أدواته) في ردٍّ واحد — سقفٌ لا حلقة مفتوحة. */
export const FINN_MAX_STEPS = 4;

export const FINN_GITHUB_REPO = "faisaljohaimy-ship-it/biz-pulse-ar";
const GITHUB_API = "https://api.github.com";
const VERCEL_API = "https://api.vercel.com";

export const FINN_TOOL_TIMEOUT_MS = 6_000;
const MAX_BODY_CHARS = 400_000;
const MAX_FIELD_CHARS = 160;
const MAX_RESULT_CHARS = 6_000;

type EnvLike = Record<string, string | undefined>;

export type FinnToolDeps = {
  readonly env: EnvLike;
  readonly fetchImpl: typeof fetch;
  readonly engineStatus: () => FinnEngineStatus;
  /** يُستدعى بعد كل أداة — اسمٌ ونتيجةٌ وزمنٌ فقط. */
  readonly audit: (entry: { tool: FinnToolName; ok: boolean; ms: number }) => void;
};

/* ── التنظيف ────────────────────────────────────────────────────────────── */

/** محارف التحكّم وفواصل الأسطر الأحادية ⇒ مسافة (بدالةٍ لا تعبيرٍ نمطيّ: يمنعه no-control-regex). */
function stripControl(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029 ? " " : ch;
  }
  return out;
}
/** أنماط أسرارٍ معروفة — لو تسرّب واحدٌ منها في عنوانٍ أو رسالة لا يصل النموذج ولا المالك. */
const SECRET_SHAPES =
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{16,}|sb_secret_[A-Za-z0-9_-]{16,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g;

/** عناوين البريد — قد تظهر في عنوان commit أو طلب دمج؛ لا تصل النموذج ولا الواجهة. */
const EMAIL_SHAPE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** نصٌّ من منبعٍ خارجيّ ⇒ سطرٌ واحد، بلا محارف تحكّم ولا أسرار، مقصوصٌ. */
export function cleanText(value: unknown, max = MAX_FIELD_CHARS): string {
  if (typeof value !== "string") return "";
  const oneLine = stripControl(value).replace(/\s+/g, " ").trim();
  const safe = oneLine.replace(SECRET_SHAPES, "[محجوب]").replace(EMAIL_SHAPE, "[بريد محجوب]");
  return safe.length > max ? `${safe.slice(0, max - 1)}…` : safe;
}

const firstLine = (value: unknown) =>
  cleanText(typeof value === "string" ? (value.split("\n")[0] ?? "") : "");

const shortSha = (value: unknown) =>
  typeof value === "string" && /^[0-9a-f]{7,40}$/i.test(value) ? value.slice(0, 9) : "";

const isoOrNull = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return null;
};

/* ── القراءة: GET وحده ──────────────────────────────────────────────────── */

export type ReadFailure =
  | "timeout"
  | "network"
  | "upstream_denied"
  | "not_found"
  | "rate_limited"
  | "upstream_error"
  | "bad_response"
  | "too_large";

async function readOnlyGet(
  url: string,
  headers: Record<string, string>,
  deps: Pick<FinnToolDeps, "fetchImpl">,
  outer?: AbortSignal,
): Promise<{ ok: true; json: unknown } | { ok: false; code: ReadFailure }> {
  const timeout = AbortSignal.timeout(FINN_TOOL_TIMEOUT_MS);
  const signal = outer ? AbortSignal.any([outer, timeout]) : timeout;
  let response: Response;
  try {
    response = await deps.fetchImpl(url, {
      method: "GET",
      headers,
      redirect: "error",
      signal,
    });
  } catch (error) {
    return { ok: false, code: timeout.aborted || isAbort(error) ? "timeout" : "network" };
  }
  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) return { ok: false, code: "upstream_denied" };
    if (status === 404) return { ok: false, code: "not_found" };
    if (status === 429) return { ok: false, code: "rate_limited" };
    return { ok: false, code: status >= 500 ? "upstream_error" : "bad_response" };
  }
  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, code: timeout.aborted ? "timeout" : "network" };
  }
  if (text.length > MAX_BODY_CHARS) return { ok: false, code: "too_large" };
  try {
    return { ok: true, json: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, code: "bad_response" };
  }
}

function isAbort(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    ((error as { name?: unknown }).name === "AbortError" ||
      (error as { name?: unknown }).name === "TimeoutError")
  );
}

const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

/** يقصّ المصفوفات حتى يدخل الناتج السقف — لا يُرمى ناتجٌ ضخم في سياق النموذج. */
function fit<T extends { items?: unknown[] }>(result: T): T {
  let current = result;
  while (
    current.items &&
    current.items.length > 1 &&
    JSON.stringify(current).length > MAX_RESULT_CHARS
  ) {
    current = { ...current, items: current.items.slice(0, Math.ceil(current.items.length / 2)) };
  }
  return current;
}

const NOT_CONFIGURED = { ok: false, configured: false, reason: "not_configured" } as const;

/* ── الأدوات ────────────────────────────────────────────────────────────── */

function platformStatus(deps: FinnToolDeps) {
  const report = validateEnv(deps.env);
  return {
    ok: true,
    source: "in-process",
    build: buildStamp(),
    engine: deps.engineStatus(),
    ai_paused: aiKillSwitchOn(),
    capabilities: {
      ready: report.ready.map((s) => s.key),
      // أسماء الإعدادات الناقصة فقط (لا قيمة)، لتشخيص المالك: ما الذي لم يُضبط.
      degraded: report.degraded.map((s) => ({ key: s.key, missing: s.missing })),
    },
  };
}

type GithubView = "recent_commits" | "open_pull_requests" | "checks_for_commit";

async function githubActivity(
  input: { view: GithubView; sha?: string },
  deps: FinnToolDeps,
  signal?: AbortSignal,
) {
  const token = deps.env.FINN_GITHUB_TOKEN?.trim() ?? "";
  if (!token) return NOT_CONFIGURED;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sadeed-finn-readonly",
  };
  const base = `${GITHUB_API}/repos/${FINN_GITHUB_REPO}`;

  if (input.view === "checks_for_commit") {
    if (!input.sha) return { ok: false, reason: "sha_required" } as const;
    const read = await readOnlyGet(
      `${base}/commits/${encodeURIComponent(input.sha)}/check-runs?per_page=30`,
      headers,
      deps,
      signal,
    );
    if (!read.ok) return { ok: false, reason: read.code } as const;
    const body = obj(read.json);
    return fit({
      ok: true,
      source: "github",
      untrusted: true,
      view: input.view,
      sha: shortSha(input.sha),
      total: typeof body.total_count === "number" ? body.total_count : null,
      items: arr(body.check_runs)
        .slice(0, 30)
        .map((run) => {
          const r = obj(run);
          return {
            name: cleanText(r.name, 80),
            status: cleanText(r.status, 24),
            conclusion: cleanText(r.conclusion, 24) || null,
          };
        }),
    });
  }

  if (input.view === "open_pull_requests") {
    const read = await readOnlyGet(`${base}/pulls?state=open&per_page=10`, headers, deps, signal);
    if (!read.ok) return { ok: false, reason: read.code } as const;
    return fit({
      ok: true,
      source: "github",
      untrusted: true,
      view: input.view,
      items: arr(read.json)
        .slice(0, 10)
        .map((pr) => {
          const p = obj(pr);
          return {
            number: typeof p.number === "number" ? p.number : null,
            title: cleanText(p.title),
            draft: p.draft === true,
            base: cleanText(obj(p.base).ref, 60),
            head: cleanText(obj(p.head).ref, 80),
            updated: isoOrNull(p.updated_at),
          };
        }),
    });
  }

  const read = await readOnlyGet(`${base}/commits?sha=main&per_page=10`, headers, deps, signal);
  if (!read.ok) return { ok: false, reason: read.code } as const;
  return fit({
    ok: true,
    source: "github",
    untrusted: true,
    view: "recent_commits" as const,
    items: arr(read.json)
      .slice(0, 10)
      .map((commit) => {
        const c = obj(commit);
        const inner = obj(c.commit);
        return {
          sha: shortSha(c.sha),
          message: firstLine(inner.message),
          date: isoOrNull(obj(inner.committer).date),
        };
      }),
  });
}

const VERCEL_ID = /^[A-Za-z0-9_-]{1,64}$/;

async function vercelDeployments(
  input: { limit: number },
  deps: FinnToolDeps,
  signal?: AbortSignal,
) {
  const token = deps.env.FINN_VERCEL_TOKEN?.trim() ?? "";
  const project = deps.env.FINN_VERCEL_PROJECT_ID?.trim() ?? "";
  const team = deps.env.FINN_VERCEL_TEAM_ID?.trim() ?? "";
  if (!token || !VERCEL_ID.test(project) || (team !== "" && !VERCEL_ID.test(team))) {
    return NOT_CONFIGURED;
  }
  const query = new URLSearchParams({
    projectId: project,
    limit: String(input.limit),
    target: "production",
  });
  if (team) query.set("teamId", team);
  const read = await readOnlyGet(
    `${VERCEL_API}/v6/deployments?${query.toString()}`,
    { Authorization: `Bearer ${token}`, Accept: "application/json" },
    deps,
    signal,
  );
  if (!read.ok) return { ok: false, reason: read.code } as const;
  return fit({
    ok: true,
    source: "vercel",
    untrusted: true,
    items: arr(obj(read.json).deployments)
      .slice(0, input.limit)
      .map((deployment) => {
        const d = obj(deployment);
        const meta = obj(d.meta);
        return {
          id: cleanText(d.uid ?? d.id, 40),
          state: cleanText(d.readyState ?? d.state, 24),
          target: cleanText(d.target, 24),
          sha: shortSha(meta.githubCommitSha),
          ref: cleanText(meta.githubCommitRef, 60),
          created: isoOrNull(d.created ?? d.createdAt),
        };
      }),
  });
}

/* ── التركيب ────────────────────────────────────────────────────────────── */

function defaultDeps(engineStatus: () => FinnEngineStatus): FinnToolDeps {
  return {
    env: process.env,
    fetchImpl: (...args) => fetch(...args),
    engineStatus,
    audit: (entry) => console.info("[finn] tool", entry),
  };
}

/** يلفّ تنفيذ أداةٍ بالتدقيق والحدّ: لا رمي يقطع الرد، وفشلٌ غير متوقَّع رمزٌ عامّ. */
function audited<I, R extends { ok: boolean }>(
  name: FinnToolName,
  deps: FinnToolDeps,
  run: (input: I, signal?: AbortSignal) => Promise<R> | R,
) {
  return async (input: I, options?: { abortSignal?: AbortSignal }) => {
    const started = Date.now();
    let result: R | { ok: false; reason: "tool_failed" };
    try {
      result = await run(input, options?.abortSignal);
    } catch {
      result = { ok: false, reason: "tool_failed" };
    }
    try {
      deps.audit({ tool: name, ok: result.ok, ms: Date.now() - started });
    } catch {
      /* التدقيق أفضل جهد. */
    }
    return result;
  };
}

/**
 * مجموعة أدوات فِن لطلبٍ واحد. تُبنى عند كل طلب (لا حالةَ مشتركة) وتأخذ تبعياتها لتُختبر
 * بمحاكاةٍ بلا شبكة.
 */
export function buildFinnTools(
  engineStatus: () => FinnEngineStatus,
  overrides: Partial<FinnToolDeps> = {},
): ToolSet {
  const deps: FinnToolDeps = { ...defaultDeps(engineStatus), ...overrides };
  return {
    platform_status: tool({
      description:
        "Read-only snapshot of THIS server: build SHA/ref, FNN engine flags, AI kill-switch, and which configuration capabilities are ready or missing (names only, never values). Use for release-readiness and 'what is deployed / what is misconfigured' questions.",
      inputSchema: z.object({}),
      execute: audited("platform_status", deps, () => platformStatus(deps)),
    }),
    github_activity: tool({
      description:
        "Read-only GitHub view of the product repository: recent commits on main, open pull requests, or the check runs of one commit. Returns untrusted data (titles/messages are written by others). Returns not_configured when the server has no read credential.",
      inputSchema: z.object({
        view: z.enum(["recent_commits", "open_pull_requests", "checks_for_commit"]),
        sha: z
          .string()
          .regex(/^[0-9a-fA-F]{7,40}$/)
          .optional(),
      }),
      execute: audited(
        "github_activity",
        deps,
        (input: { view: GithubView; sha?: string }, signal) => githubActivity(input, deps, signal),
      ),
    }),
    vercel_deployments: tool({
      description:
        "Read-only list of the most recent production deployments (state, commit SHA, ref, time). Use to compare what is deployed with what is on main. Returns not_configured when the server has no read credential.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(10).default(5) }),
      execute: audited("vercel_deployments", deps, (input: { limit: number }, signal) =>
        vercelDeployments(input, deps, signal),
      ),
    }),
  };
}

/** للاختبارات: الأسماء المسجَّلة فعلًا في المجموعة. */
export function registeredFinnToolNames(engineStatus: () => FinnEngineStatus): string[] {
  return Object.keys(buildFinnTools(engineStatus)).sort();
}

export { FINN_TOOL_NAMES };
