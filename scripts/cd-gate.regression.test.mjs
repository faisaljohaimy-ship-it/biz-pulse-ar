/** Offline execution of the actual workflow program: no network or credentials. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import * as guards from "./cd-gate.mjs";

const sha = "a".repeat(40);
const oldSha = "b".repeat(40);
const baselineId = "dpl_baseline";
const candidateId = "dpl_candidate";
const repository = { full_name: guards.RELEASE_REPOSITORY };
const run = {
  name: "CI Verification",
  path: ".github/workflows/ci.yml",
  event: "push",
  head_branch: "main",
  head_sha: sha,
  head_repository: repository,
  status: "completed",
  conclusion: "success",
};
const workflow = readFileSync(
  new URL("../.github/workflows/deploy-vercel.yml", import.meta.url),
  "utf8",
);
const formattingWorkflow = readFileSync(
  new URL("../.github/workflows/autoformat.yml", import.meta.url),
  "utf8",
);
const embedded = workflow.match(
  /node --experimental-strip-types --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/,
)[1];
const program = embedded
  .replace(/^          /gm, "")
  .replace(/^import[\s\S]*?from '[^']+';\n/gm, "")
  .replace("process.exit(0);", "return;");

async function fixture(options = {}) {
  const eventName = options.manual ? "workflow_dispatch" : "workflow_run";
  const event = {
    repository,
    workflow_run: { ...run, ...options.run },
    sender: { login: guards.RELEASE_REPOSITORY.split("/")[0] },
    inputs: { target: "production", confirm: "deploy", ...options.inputs },
    ...options.event,
  };
  const env = {
    GITHUB_EVENT_NAME: eventName,
    GITHUB_EVENT_PATH: "fixture-event.json",
    GITHUB_STEP_SUMMARY: "fixture-summary.md",
    RELEASE_SHA: sha,
    RELEASE_REF: "main",
    GH_TOKEN: "offline-fixture",
    VERCEL_TOKEN: "offline-fixture",
    VERCEL_PROJECT_ID: guards.RELEASE_PROJECT,
    VERCEL_ORG_ID: guards.RELEASE_TEAM,
    SADEED_DEPLOY_CYCLE_BUDGET: "4",
    SADEED_DEPLOY_CYCLE_STARTED_AT: "2026-11-22T00:00:00.000Z",
    ...options.env,
  };
  const calls = [],
    summary = [];
  let activeId = baselineId,
    staged = false,
    clock = Date.parse("2026-11-22T00:00:01.000Z");
  const deployment = (id) => ({
    id,
    projectId: guards.RELEASE_PROJECT,
    readyState: "READY",
    target: options.inputs?.target === "preview" && id === candidateId ? null : "production",
    url: id === baselineId ? "baseline.vercel.app" : "candidate.vercel.app",
    meta: { githubCommitSha: id === baselineId ? oldSha : sha },
  });
  function pageResponse(path, phase) {
    if (path.endsWith(".js"))
      return {
        status: 200,
        contentType: "application/javascript",
        body: "export const ready = true;",
      };
    if (path.endsWith(".css"))
      return { status: 200, contentType: "text/css", body: "body { color: black }" };
    assert(guards.RELEASE_ROUTES.includes(path), "No operational or unapproved route probes");
    const broken =
      (phase === "stage" && options.badStagePage) ||
      (phase === "production" && options.badProductionPage && activeId === candidateId);
    return {
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><html><head><link href="/assets/app.css" rel="stylesheet"><script type="module" src="/assets/app.js"></script></head><body>${broken ? "Internal Server Error" : "Application shell"}</body></html>`,
    };
  }
  async function fetchFixture(input, init) {
    const url = new URL(input);
    calls.push({ type: "http", url: url.origin + url.pathname, method: init.method });
    assert.equal(init.method, "GET", "The release probe must never write data");
    if (url.origin === "https://api.github.com") {
      if (url.pathname.endsWith("/git/ref/heads/main"))
        return Response.json({
          object: { sha: options.stale || (options.staleAfterStage && staged) ? oldSha : sha },
        });
      if (url.pathname.endsWith("/actions/workflows/ci.yml/runs"))
        return Response.json({ workflow_runs: options.noCi ? [] : [run] });
      if (url.pathname.includes("/compare/"))
        return Response.json({
          status: "ahead",
          behind_by: 0,
          merge_base_commit: { sha: oldSha },
          files:
            options.files ??
            (options.paths ?? ["src/components/sec/SecurityDecisionCenter.tsx"]).map(
              (filename) => ({ filename }),
            ),
        });
    }
    if (url.origin === "https://api.vercel.com") {
      if (url.pathname === "/v6/deployments") {
        const countEvidence = staged
          ? (options.stagedCountEvidence ?? options.countEvidence)
          : options.countEvidence;
        const deployments =
          countEvidence?.deployments ?? (staged ? [{ uid: candidateId, created: clock - 1 }] : []);
        return Response.json(
          countEvidence ?? {
            deployments,
            pagination: { count: deployments.length, next: null },
          },
        );
      }
      if (url.pathname.startsWith("/v4/aliases/"))
        return Response.json({
          alias: url.pathname.split("/").at(-1),
          projectId: guards.RELEASE_PROJECT,
          deploymentId: activeId,
        });
      if (url.pathname.startsWith("/v13/deployments/"))
        return Response.json(
          deployment(url.pathname.includes(baselineId) ? baselineId : candidateId),
        );
    }
    if (guards.PRODUCTION_DOMAINS.includes(url.hostname)) {
      if (url.pathname !== "/api/public/live") {
        const page = pageResponse(url.pathname, "production");
        return new Response(page.body, {
          status: page.status,
          headers: { "content-type": page.contentType },
        });
      }
      return Response.json({
        ok: true,
        status: "live",
        build: {
          sha: activeId === candidateId && !options.badProductionStamp ? sha : oldSha,
          ref: "main",
        },
      });
    }
    throw new Error("Unexpected fixture URL");
  }
  const context = {
    ...guards,
    probePublicLive: (origin, expected, settings = {}) =>
      guards.probePublicLive(origin, expected, { ...settings, fetchImpl: fetchFixture }),
    probePublicPages: (origin, settings = {}) =>
      guards.probePublicPages(origin, { ...settings, fetchImpl: fetchFixture }),
    process: { env, exitCode: 0 },
    URL,
    AbortSignal,
    Response,
    JSON,
    Promise,
    console: { log() {}, error() {} },
    Date: class extends Date {
      static now() {
        return clock;
      }
    },
    setTimeout(callback, delay) {
      clock += delay;
      callback();
    },
    readFileSync() {
      return JSON.stringify(event);
    },
    appendFileSync(_path, line) {
      summary.push(line);
    },
    fetch: fetchFixture,
    spawnSync(command, args) {
      assert.equal(command, "vercel");
      assert(!args.includes("--token"), "Credentials must never appear in argv");
      calls.push({ type: "cli", args });
      if (args[0] === "deploy") {
        staged = true;
        return { status: 0, stdout: "https://candidate.vercel.app" };
      }
      if (args[0] === "curl" && new URL(args[1]).pathname !== "/api/public/live") {
        const page = pageResponse(new URL(args[1]).pathname, "stage");
        return { status: 0, stdout: `${page.body}\n${page.status}\n${page.contentType}` };
      }
      if (args[0] === "curl")
        return {
          status: 0,
          stdout: JSON.stringify({
            ok: true,
            status: "live",
            build: { sha: options.badStageStamp ? oldSha : sha, ref: env.RELEASE_REF },
          }),
        };
      if (args[0] === "promote") {
        activeId = options.concurrentWriter ? "dpl_other" : candidateId;
        return { status: options.promoteFailure ? 1 : 0, stdout: "" };
      }
      if (args[0] === "rollback") {
        if (!options.rollbackFailure) activeId = baselineId;
        return { status: options.rollbackFailure ? 1 : 0, stdout: "" };
      }
      throw new Error("Unexpected CLI command");
    },
  };
  let thrown;
  try {
    await new vm.Script(`(async () => {\n${program}\n})()`).runInNewContext(context);
  } catch (error) {
    thrown = error;
  }
  return {
    calls,
    summary: summary.join(""),
    exitCode: thrown ? 1 : context.process.exitCode,
    activeId,
    commands: calls.filter((call) => call.type === "cli").map((call) => call.args[0]),
  };
}

test("valid automatic release stages without domains, verifies, then promotes exact artifact", async () => {
  const result = await fixture();
  assert.equal(result.exitCode, 0, result.summary);
  assert.equal(result.commands[0], "deploy");
  assert.equal(result.commands.at(-1), "promote");
  assert(!result.commands.includes("rollback"));
  const deploy = result.calls.find((call) => call.type === "cli" && call.args[0] === "deploy");
  assert(deploy.args.includes("--prod") && deploy.args.includes("--skip-domain"));
  assert.equal(result.activeId, candidateId);
  assert.match(result.summary, /Production verified/);
});

test("Vercel terminal pagination without next permits a fully verified release", async () => {
  const created = Date.parse("2026-11-22T00:00:00.000Z");
  const deployments = ["dpl_first", "dpl_second", "dpl_third"].map((uid, index) => ({
    uid,
    created: created + index,
    projectId: guards.RELEASE_PROJECT,
  }));
  const result = await fixture({
    env: { SADEED_DEPLOY_CYCLE_BUDGET: "6" },
    countEvidence: {
      deployments,
      pagination: { count: 3, prev: created + 2 },
    },
    stagedCountEvidence: {
      deployments: [
        ...deployments,
        { uid: candidateId, created: created + 3, projectId: guards.RELEASE_PROJECT },
      ],
      pagination: { count: 4, prev: created + 3 },
    },
  });
  assert.equal(result.exitCode, 0, result.summary);
  assert.equal(result.commands[0], "deploy");
  assert.equal(result.commands.at(-1), "promote");
  assert.equal(result.activeId, candidateId);
  assert.match(result.summary, /spent=3; remaining=3; reserve=2/);
  assert.match(result.summary, /Production verified/);
});

test("secret-bearing job rejects manual feature dispatch before checkout/environment", () => {
  assert.match(
    workflow,
    /github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/,
  );
  assert.match(workflow, /persist-credentials: false/);
});

test("formatter only proposes a manual trusted-main patch and cannot advance checked main", () => {
  assert.match(formattingWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(formattingWorkflow, /^\s*(?:push|pull_request|workflow_run):/m);
  assert.match(
    formattingWorkflow,
    /github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/,
  );
  assert.match(formattingWorkflow, /contents: read/);
  assert.doesNotMatch(
    formattingWorkflow,
    /contents: write|\[skip ci\]|git\s+(?:commit|push|pull)\b/,
  );
  assert.match(formattingWorkflow, /persist-credentials: false/);
  assert.match(formattingWorkflow, /git diff --binary/);
  assert.match(formattingWorkflow, /actions\/upload-artifact@[0-9a-f]{40}/);
});

for (const [label, options] of [
  ["stale SHA", { stale: true }],
  ["cross-repository event", { event: { repository: { full_name: "attacker/repository" } } }],
  ["fork CI", { run: { head_repository: { full_name: "attacker/fork" } } }],
  ["PR CI", { run: { event: "pull_request" } }],
  ["failed CI", { run: { conclusion: "failure" } }],
  ["incomplete CI", { run: { status: "in_progress" } }],
  ["untrusted workflow path", { run: { path: ".github/workflows/decoy.yml" } }],
  ["feature branch Production", { env: { RELEASE_REF: "feature/test" } }],
  ["missing credentials", { env: { VERCEL_TOKEN: "" } }],
  ["wrong project", { env: { VERCEL_PROJECT_ID: "prj_other" } }],
  ["wrong team", { env: { VERCEL_ORG_ID: "team_other" } }],
  ["missing deployment budget", { env: { SADEED_DEPLOY_CYCLE_BUDGET: "" } }],
  ["NaN deployment budget", { env: { SADEED_DEPLOY_CYCLE_BUDGET: "NaN" } }],
  ["invalid deployment budget", { env: { SADEED_DEPLOY_CYCLE_BUDGET: "Infinity" } }],
  ["missing cycle boundary", { env: { SADEED_DEPLOY_CYCLE_STARTED_AT: "" } }],
  [
    "future cycle boundary",
    { env: { SADEED_DEPLOY_CYCLE_STARTED_AT: "2099-01-01T00:00:00.000Z" } },
  ],
  [
    "normalized impossible cycle date",
    { env: { SADEED_DEPLOY_CYCLE_STARTED_AT: "2026-02-30T00:00:00.000Z" } },
  ],
  [
    "incomplete deployment count",
    { countEvidence: { deployments: [], pagination: { count: 0, next: 123 } } },
  ],
  [
    "string deployment cursor",
    { countEvidence: { deployments: [], pagination: { count: 0, next: "123" } } },
  ],
  ["missing deployment pagination", { countEvidence: { deployments: [] } }],
  [
    "truncated deployment count without next",
    { countEvidence: { deployments: [], pagination: { count: 1 } } },
  ],
  [
    "cross-project deployment count without next",
    {
      countEvidence: {
        deployments: [
          {
            uid: baselineId,
            created: Date.parse("2026-11-22T00:00:00.000Z"),
            projectId: "prj_other",
          },
        ],
        pagination: { count: 1 },
      },
    },
  ],
  [
    "duplicated deployment count",
    {
      countEvidence: {
        deployments: [
          { uid: baselineId, created: Date.parse("2026-11-22T00:00:00.000Z") },
          { uid: baselineId, created: Date.parse("2026-11-22T00:00:00.000Z") },
        ],
        pagination: { count: 2, next: null },
      },
    },
  ],
  [
    "two emergency reserve boundary",
    {
      countEvidence: {
        deployments: [
          { uid: "dpl_first", created: Date.parse("2026-11-22T00:00:00.000Z") },
          { uid: "dpl_second", created: Date.parse("2026-11-22T00:00:00.000Z") },
        ],
        pagination: { count: 2, next: null },
      },
    },
  ],
  [
    "two emergency reserve boundary without next",
    {
      countEvidence: {
        deployments: [
          { uid: "dpl_first", created: Date.parse("2026-11-22T00:00:00.000Z") },
          { uid: "dpl_second", created: Date.parse("2026-11-22T00:00:00.000Z") },
        ],
        pagination: { count: 2, prev: Date.parse("2026-11-22T00:00:00.000Z") },
      },
    },
  ],
  ["sensitive automatic delta", { paths: ["src/routes/api/chat.ts"] }],
  ["release guard change", { paths: ["scripts/cd-gate.mjs"] }],
  ["role authorization change", { paths: ["src/lib/org/roles.ts"] }],
  ["owner gate change", { paths: ["src/lib/finn-agent/owner-gate.server.ts"] }],
  ["root gate change", { paths: ["src/routes/__root.tsx"] }],
  [
    "renamed sensitive file",
    {
      files: [
        { filename: "src/components/harmless.tsx", previous_filename: "src/lib/org/roles.ts" },
      ],
    },
  ],
  [
    "manual feature preview",
    { manual: true, inputs: { target: "preview" }, env: { RELEASE_REF: "feature/untrusted" } },
  ],
  ["manual production without CI", { manual: true, noCi: true }],
  ["manual production without confirmation", { manual: true, inputs: { confirm: "" } }],
]) {
  test(`${label} cannot create or promote any deployment`, async () => {
    const result = await fixture(options);
    assert.equal(result.exitCode, 1);
    assert.deepEqual(result.commands, []);
    assert.equal(result.activeId, baselineId);
  });
}

test("manual preview remains available without Production actions", async () => {
  const result = await fixture({ manual: true, inputs: { target: "preview", confirm: "" } });
  assert.equal(result.exitCode, 0, result.summary);
  assert.equal(result.commands[0], "deploy");
  assert(result.commands.slice(1).every((command) => command === "curl"));
  assert.equal(result.activeId, baselineId);
});

test("owner exact-SHA review with repository context permits a sensitive release", async () => {
  const result = await fixture({
    manual: true,
    paths: [".github/workflows/deploy-vercel.yml"],
    inputs: {
      owner_review_sha: sha,
      owner_review_context: `https://github.com/${guards.RELEASE_REPOSITORY}/pull/453`,
    },
  });
  assert.equal(result.exitCode, 0, result.summary);
});

for (const options of [
  {
    owner_review_sha: oldSha,
    owner_review_context: `https://github.com/${guards.RELEASE_REPOSITORY}/pull/453`,
  },
  { owner_review_sha: sha, owner_review_context: "https://github.com/attacker/repo/pull/1" },
])
  test("wrong owner review SHA/context cannot authorize sensitive changes", async () => {
    const result = await fixture({
      manual: true,
      paths: ["supabase/migrations/change.sql"],
      inputs: options,
    });
    assert.equal(result.exitCode, 1);
    assert.deepEqual(result.commands, []);
  });

test("stale-after-stage and bad stage stamp never promote or rollback", async () => {
  for (const options of [{ staleAfterStage: true }, { badStageStamp: true }]) {
    const result = await fixture(options);
    assert.equal(result.exitCode, 1);
    assert.equal(result.commands[0], "deploy");
    assert(result.commands.slice(1).every((command) => command === "curl"));
    assert.equal(result.activeId, baselineId);
  }
});

test("partial promotion failure rolls back only to the verified baseline", async () => {
  const result = await fixture({ promoteFailure: true });
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.commands.slice(-2), ["promote", "rollback"]);
  assert.equal(result.activeId, baselineId);
  assert.match(result.summary, /Rollback verified/);
});

test("wrong post-promotion stamp times out and restores baseline", async () => {
  const result = await fixture({ badProductionStamp: true });
  assert.equal(result.exitCode, 1);
  assert.equal(result.activeId, baselineId);
  assert.match(result.summary, /Rollback verified/);
});

test("fatal staged route blocks promotion without touching production", async () => {
  const result = await fixture({ badStagePage: true });
  assert.equal(result.exitCode, 1);
  assert(!result.commands.includes("promote"));
  assert(!result.commands.includes("rollback"));
  assert.equal(result.activeId, baselineId);
});

test("fatal production route rolls back even when liveness and SHA pass", async () => {
  const result = await fixture({ badProductionPage: true });
  assert.equal(result.exitCode, 1);
  assert(result.commands.includes("rollback"));
  assert.equal(result.activeId, baselineId);
  assert.match(result.summary, /Rollback verified/);
});

test("HTML decoys, external/missing assets and MIME/status failures cannot pass UI smoke", () => {
  for (const [status, type, body] of [
    [500, "text/html", "<!doctype html><html>Application shell</html>"],
    [200, "application/json", '{"ok":true}'],
    [200, "text/html", "<!doctype html><html>Internal Server Error</html>"],
    [
      200,
      "text/html",
      '<!doctype html><html><script src="https://evil.test/app.js"></script></html>',
    ],
    [
      200,
      "text/html",
      '<!doctype html><html><script src="/assets/../app.js"></script><link href="/assets/app.css"></html>',
    ],
  ])
    assert.throws(() => guards.assertPageHtml(status, type, body));
  for (const args of [
    [404, "text/css", "body{}", "/assets/app.css"],
    [200, "text/html", "<!doctype html>", "/assets/app.js"],
    [200, "text/css", "", "/assets/app.css"],
  ])
    assert.throws(() => guards.assertAsset(...args));
});

test("one routine slot may be spent while exactly two emergency deployments remain", () => {
  const now = Date.parse("2026-11-22T00:00:01.000Z");
  const cycle = guards.deploymentCycle(
    { SADEED_DEPLOY_CYCLE_BUDGET: "4", SADEED_DEPLOY_CYCLE_STARTED_AT: "2026-11-22T00:00:00.000Z" },
    now,
  );
  const decision = guards.assertDeploymentBudget(
    cycle,
    {
      deployments: [{ uid: baselineId, created: now - 1, state: "ERROR" }],
      pagination: { count: 1, next: null },
    },
    now,
  );
  assert.equal(decision.remaining, 3);
  assert.equal(decision.routineRemaining, 1);
  assert.equal(decision.allowed, true);
});

test("omitted next preserves deployment identity, time, project and completeness guards", () => {
  const now = Date.parse("2026-11-22T00:00:01.000Z");
  const cycle = guards.deploymentCycle(
    { SADEED_DEPLOY_CYCLE_BUDGET: "4", SADEED_DEPLOY_CYCLE_STARTED_AT: "2026-11-22T00:00:00.000Z" },
    now,
  );
  const deployment = { uid: baselineId, created: now - 1, projectId: guards.RELEASE_PROJECT };
  const evidence = (changes) => ({
    deployments: [{ ...deployment, ...changes }],
    pagination: { count: 1, prev: now - 1 },
  });
  assert.equal(guards.verifiedDeploymentCount(cycle, evidence(), now), 1);
  for (const [label, invalid] of [
    ["undefined evidence", undefined],
    ["null evidence", null],
    ["missing deployments", { pagination: { count: 0 } }],
    ["null pagination", { deployments: [], pagination: null }],
    ["array pagination", { deployments: [], pagination: [] }],
    ["explicit undefined cursor", { deployments: [], pagination: { count: 0, next: undefined } }],
    ["boolean cursor", { deployments: [], pagination: { count: 0, next: false } }],
    ["missing count", { deployments: [], pagination: {} }],
    ["string count", { deployments: [], pagination: { count: "0" } }],
    ["invalid ID", evidence({ uid: "not-a-deployment" })],
    ["missing timestamp", evidence({ created: undefined })],
    ["fractional timestamp", evidence({ created: now - 0.5 })],
    ["before cycle", evidence({ created: cycle.since - 1 })],
    ["future timestamp", evidence({ created: now + 1 })],
    ["another project", evidence({ projectId: "prj_other" })],
    ["duplicated ID", { deployments: [deployment, deployment], pagination: { count: 2 } }],
  ])
    assert.throws(
      () => guards.verifiedDeploymentCount(cycle, invalid, now),
      /Complete deployment count evidence is required|Deployment count evidence is invalid or duplicated/,
      label,
    );
});

test("another release writer is never overwritten by rollback", async () => {
  const result = await fixture({ concurrentWriter: true });
  assert.equal(result.exitCode, 1);
  assert(!result.commands.includes("rollback"));
  assert.equal(result.activeId, "dpl_other");
  assert.match(result.summary, /ROLLBACK UNVERIFIED/);
});

test("failed rollback remains explicitly unverified and red", async () => {
  const result = await fixture({ promoteFailure: true, rollbackFailure: true });
  assert.equal(result.exitCode, 1);
  assert.match(result.summary, /ROLLBACK UNVERIFIED/);
});

test("truncated SHA, wrong deployment environment and incomplete alias evidence fail closed", () => {
  assert.throws(() => guards.assertSha(sha.slice(0, 7)));
  assert.throws(() =>
    guards.assertDeployment(
      {
        id: candidateId,
        projectId: guards.RELEASE_PROJECT,
        readyState: "READY",
        target: null,
        url: "candidate.vercel.app",
        meta: { githubCommitSha: sha },
      },
      sha,
      "production",
    ),
  );
  assert.throws(() =>
    guards.assertAliases(
      [{ alias: "neexios.com", projectId: guards.RELEASE_PROJECT, deploymentId: baselineId }],
      baselineId,
    ),
  );
  for (const origin of [
    "https://candidate.vercel.app/path",
    "https://user@candidate.vercel.app",
    "https://candidate.vercel.app.evil.test",
    "http://candidate.vercel.app",
  ])
    assert.throws(() => guards.deploymentOrigin(origin));
});
