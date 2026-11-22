/** Pure release guards. Importing this module performs no I/O or deployment. */
import { checkBudget, EMERGENCY_RESERVE } from "../src/lib/rag/deployment.ts";
export const RELEASE_REPOSITORY = "faisaljohaimy-ship-it/biz-pulse-ar";
export const RELEASE_PROJECT = "prj_9ijbW2tJ2J5p2C2RwbK4A6qJfIpO";
export const RELEASE_TEAM = "team_lFSyX3zRr4VzdY5egj5xO2Ro";
export const PRODUCTION_DOMAINS = ["neexios.com", "www.neexios.com"];
export const RELEASE_ROUTES = ["/auth", "/sec/decision-center", "/sec/incidents"];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

export function assertSha(sha) {
  requireCondition(typeof sha === "string" && /^[0-9a-f]{40}$/.test(sha), "Full SHA required");
  return sha;
}

export function assertReleaseConfig(env) {
  requireCondition(Boolean(env.VERCEL_TOKEN?.trim()), "VERCEL_TOKEN is missing");
  requireCondition(env.VERCEL_PROJECT_ID === RELEASE_PROJECT, "Unexpected Vercel project");
  requireCondition(env.VERCEL_ORG_ID === RELEASE_TEAM, "Unexpected Vercel team");
}

export function deploymentCycle(env, now) {
  const raw = env.SADEED_DEPLOY_CYCLE_BUDGET;
  const start = env.SADEED_DEPLOY_CYCLE_STARTED_AT;
  const total = Number(raw);
  const since = Date.parse(start);
  requireCondition(
    typeof raw === "string" &&
      /^[1-9]\d*$/.test(raw) &&
      Number.isSafeInteger(total) &&
      total > EMERGENCY_RESERVE,
    "Explicit finite deployment budget is required",
  );
  requireCondition(
    typeof start === "string" &&
      Number.isSafeInteger(since) &&
      since >= 0 &&
      Number.isSafeInteger(now) &&
      since <= now &&
      new Date(since).toISOString() === start,
    "Explicit canonical deployment cycle boundary is required",
  );
  return { total, since, start };
}

export function verifiedDeploymentCount(cycle, evidence, now) {
  const pagination = evidence?.pagination;
  // Vercel terminal pages may omit next; pagination and the matching count are still required.
  requireCondition(
    Array.isArray(evidence?.deployments) &&
      pagination !== null &&
      typeof pagination === "object" &&
      !Array.isArray(pagination) &&
      (pagination.next === null || !("next" in pagination)) &&
      pagination.count === evidence.deployments.length,
    "Complete deployment count evidence is required",
  );
  const ids = new Set();
  for (const deployment of evidence.deployments) {
    const id = deployment.uid ?? deployment.id;
    requireCondition(
      typeof id === "string" &&
        /^dpl_[a-zA-Z0-9]+$/.test(id) &&
        !ids.has(id) &&
        Number.isSafeInteger(deployment.created) &&
        deployment.created >= cycle.since &&
        deployment.created <= now &&
        (!deployment.projectId || deployment.projectId === RELEASE_PROJECT),
      "Deployment count evidence is invalid or duplicated",
    );
    ids.add(id);
  }
  return ids.size;
}

export function assertDeploymentBudget(cycle, evidence, now) {
  const spent = verifiedDeploymentCount(cycle, evidence, now);
  const decision = checkBudget({ total: cycle.total, spent }, "routine");
  requireCondition(decision.allowed, "Deployment would consume the two emergency reserves");
  return { ...decision, spent };
}

/** Automatic releases stop on paths needing a fresh, exact owner review. */
export function sensitiveReleasePaths(paths) {
  return paths.filter((path) =>
    /^(?:supabase\/|scripts\/|\.github\/|\.env|package(?:-lock)?\.json$|vite\.config\.|vercel\.json$|src\/(?:integrations\/|lib\/(?:auth|access|org|finn-agent|governance|security|rag|ai|mcp|sadeed-core\/|sadeed\/(?:llm|task-bus|.*provider|messaging-channel|same-origin|response-contract|chat-message-text))|routes\/(?:api\/|__root\.tsx$)))|\.server\.[cm]?[jt]s$/.test(
      path,
    ),
  );
}

function successfulMainRun(run, sha) {
  return (
    run?.name === "CI Verification" &&
    run.path === ".github/workflows/ci.yml" &&
    run.event === "push" &&
    run.head_branch === "main" &&
    run.head_sha === sha &&
    run.head_repository?.full_name === RELEASE_REPOSITORY &&
    run.status === "completed" &&
    run.conclusion === "success"
  );
}

export function assertReleaseCandidate({ eventName, event, sha, ref, mainSha, ciRuns = [] }) {
  assertSha(sha);
  requireCondition(event.repository?.full_name === RELEASE_REPOSITORY, "Wrong repository");
  requireCondition(["workflow_dispatch", "workflow_run"].includes(eventName), "Unsupported event");
  const automatic = eventName === "workflow_run";
  const target = automatic ? "production" : event.inputs?.target;
  requireCondition(["preview", "production"].includes(target), "Invalid release target");
  requireCondition(
    ref === "main" && mainSha === sha,
    "Controller must run from exact current main",
  );
  if (target === "production") {
    requireCondition(
      ref === "main" && mainSha === sha,
      "Production candidate is stale or not main",
    );
    requireCondition(
      automatic
        ? successfulMainRun(event.workflow_run, sha)
        : ciRuns.some((run) => successfulMainRun(run, sha)),
      "Successful push-to-main CI on this exact SHA is required",
    );
    if (!automatic) requireCondition(event.inputs?.confirm === "deploy", "Confirm deploy required");
  }
  if (event.inputs?.expected_sha)
    requireCondition(event.inputs.expected_sha === sha, "Expected SHA does not match candidate");
  return target;
}

export function assertOwnerReview(eventName, event, sha, paths) {
  if (!sensitiveReleasePaths(paths).length) return;
  const context = event.inputs?.owner_review_context ?? "";
  const expected = `https://github.com/${RELEASE_REPOSITORY}/`;
  requireCondition(
    eventName === "workflow_dispatch" &&
      event.sender?.login === RELEASE_REPOSITORY.split("/")[0] &&
      event.inputs?.owner_review_sha === sha &&
      context.startsWith(expected) &&
      /^(?:pull|issues)\/[1-9]\d*(?:#[a-zA-Z0-9_-]+)?$/.test(context.slice(expected.length)),
    "Sensitive release paths require owner dispatch, exact owner_review_sha and repository review URL",
  );
}

export function deploymentOrigin(value) {
  const url = new URL(value);
  requireCondition(
    url.protocol === "https:" &&
      /^[a-z0-9-]+\.vercel\.app$/.test(url.hostname) &&
      url.origin === value,
    "Expected a canonical Vercel deployment origin",
  );
  return url.origin;
}

export function assertDeployment(deployment, sha, target) {
  assertSha(sha);
  requireCondition(/^dpl_[a-zA-Z0-9]+$/.test(deployment.id), "Invalid deployment ID");
  requireCondition(
    deployment.projectId === RELEASE_PROJECT,
    "Deployment belongs to another project",
  );
  requireCondition(deployment.readyState === "READY", "Deployment is not READY");
  requireCondition(
    target === "production" ? deployment.target === "production" : !deployment.target,
    "Deployment target does not match release",
  );
  requireCondition(deployment.meta?.githubCommitSha === sha, "Deployment SHA mismatch");
  deploymentOrigin(`https://${deployment.url}`);
}

export function assertAliases(aliases, deploymentId) {
  requireCondition(
    aliases.length === PRODUCTION_DOMAINS.length,
    "Missing production alias evidence",
  );
  for (const domain of PRODUCTION_DOMAINS) {
    const alias = aliases.find((entry) => entry.alias === domain);
    requireCondition(
      alias?.projectId === RELEASE_PROJECT && alias.deploymentId === deploymentId,
      "Production aliases do not match the verified deployment",
    );
  }
}

export function assertLive(body, sha, ref = "main") {
  requireCondition(
    body?.ok === true &&
      body.status === "live" &&
      body.build?.sha === assertSha(sha) &&
      body.build.ref === ref,
    "Liveness or exact build stamp verification failed",
  );
}

/** GET-only: no DB/rate-store probes, URL credentials, redirects or AI calls. */
export async function probePublicLive(origin, sha, { fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  requireCondition(
    PRODUCTION_DOMAINS.some((domain) => origin === `https://${domain}`),
    "Unapproved production origin",
  );
  const response = await fetchImpl(`${origin}/api/public/live`, {
    method: "GET",
    redirect: "error",
    headers: { "cache-control": "no-cache" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  requireCondition(response.status === 200, "Liveness did not return HTTP 200");
  assertLive(await response.json(), sha);
}

/** HTTP UI smoke complements, but does not claim, a hydrated browser interaction test. */
export function assertPageHtml(status, contentType, body) {
  requireCondition(
    status === 200 && /^text\/html\b/i.test(contentType),
    "Route did not return HTML 200",
  );
  const visible = body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  requireCondition(
    /<!doctype html>/i.test(body) &&
      /<html\b/i.test(body) &&
      !/Internal Server Error|Something went wrong|Application error|خطأ غير متوقع|تعذّر تحميل الصفحة/i.test(
        visible,
      ),
    "Route returned an invalid or fatal page",
  );
  const references = [
    ...body.matchAll(/(?:src|href)=["'](\/assets\/[^"'<>\s]+\.(?:js|css))["']/gi),
  ].map((match) => match[1]);
  const assets = [
    references.find((path) => path.endsWith(".js")),
    references.find((path) => path.endsWith(".css")),
  ];
  requireCondition(
    assets.every((path) => path && /^\/assets\/[a-zA-Z0-9_.-]+\.(?:js|css)$/.test(path)),
    "Missing canonical application JS/CSS assets",
  );
  return assets;
}

export function assertAsset(status, contentType, body, path) {
  requireCondition(
    status === 200 &&
      Boolean(body.trim()) &&
      !/^\s*<!doctype/i.test(body) &&
      (path.endsWith(".css")
        ? /^text\/css\b/i.test(contentType)
        : /^(?:application|text)\/javascript\b/i.test(contentType)),
    "Application asset failed HTTP/MIME verification",
  );
}

export async function probePublicPages(
  origin,
  { fetchImpl = fetch, timeoutMs = 10000, routes = RELEASE_ROUTES } = {},
) {
  requireCondition(
    PRODUCTION_DOMAINS.some((domain) => origin === `https://${domain}`),
    "Unapproved production origin",
  );
  requireCondition(
    routes.length > 0 && routes.every((route) => RELEASE_ROUTES.includes(route)),
    "Unapproved smoke route",
  );
  const deadline = Date.now() + timeoutMs;
  const assets = new Map();
  async function get(path) {
    const remaining = deadline - Date.now();
    requireCondition(remaining > 0, "Route smoke deadline exceeded");
    const response = await fetchImpl(origin + path, {
      method: "GET",
      redirect: "error",
      headers: { "cache-control": "no-cache" },
      signal: AbortSignal.timeout(remaining),
    });
    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      body: await response.text(),
    };
  }
  await Promise.all(
    routes.map(async (route) => {
      const page = await get(route);
      await Promise.all(
        assertPageHtml(page.status, page.contentType, page.body).map((path) => {
          if (!assets.has(path))
            assets.set(
              path,
              get(path).then((asset) =>
                assertAsset(asset.status, asset.contentType, asset.body, path),
              ),
            );
          return assets.get(path);
        }),
      );
    }),
  );
}
