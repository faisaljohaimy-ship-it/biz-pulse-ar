import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const script = join(root, "scripts/rag-preflight.sh");

function harness(t, { missing = false, mode = "pass", noPsql = false } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "sadeed-rag-guard-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const bin = join(directory, "bin");
  mkdirSync(bin);
  const log = join(directory, "calls.log");
  writeFileSync(log, "");
  symlinkSync("/usr/bin/dirname", join(bin, "dirname"));
  if (!missing) {
    for (const tool of ["initdb", "pg_ctl", "psql", "id", "sleep"]) {
      if (tool === "psql" && noPsql) continue;
      const source = `#!/bin/bash
if [ "${tool}" = id ]; then echo 1000; exit 0; fi
if [ "${tool}" = sleep ]; then exit 0; fi
printf '%s\\n' '${tool}'" $*" >> "$RAG_TEST_LOG"
if [ "${tool}" = initdb ] && [ "$RAG_TEST_MODE" = initdb-fail ]; then exit 7; fi
if [ "${tool}" = pg_ctl ] && [ "$RAG_TEST_MODE" = start-fail ] && [[ " $* " = *' start '* ]]; then exit 8; fi
if [ "${tool}" = psql ]; then
  printf '%s\\n' "psql-env PGSERVICE=$PGSERVICE PGPASSFILE=$PGPASSFILE" >> "$RAG_TEST_LOG"
  if [ "$RAG_TEST_MODE" = sql-fail ]; then echo 'ERROR: synthetic SQL assertion failed' >&2; exit 1; fi
fi
exit 0
`;
      writeFileSync(join(bin, tool), source, { mode: 0o755 });
    }
  }
  const env = {
    PATH: missing || noPsql ? bin : `${bin}:/usr/bin:/bin`,
    PGBIN: bin,
    RAG_TEST_LOG: log,
    RAG_TEST_MODE: mode,
    LANG: "C.UTF-8",
    // Inert traps prove fixture libpq configuration ignores inherited targets.
    PGSERVICE: "reserved-invalid-inert-service",
    PGPASSFILE: join(directory, "must-not-read-password-file"),
  };
  return {
    bin,
    log,
    run(flag) {
      const result = spawnSync("/bin/bash", [script], {
        cwd: root,
        env: { ...env, ...(flag === undefined ? {} : { SADEED_E2E_FIXTURE_ONLY: flag }) },
        encoding: "utf8",
        timeout: 10_000,
      });
      assert.ifError(result.error);
      return { ...result, output: result.stdout + result.stderr, calls: readFileSync(log, "utf8") };
    },
  };
}

test("omitted and false retain the unavailable-Postgres advisory skip", (t) => {
  for (const flag of [undefined, "false"]) {
    const result = harness(t, { missing: true }).run(flag);
    assert.equal(result.status, 0);
    assert.match(result.output, /لا يوجد Postgres محلي/);
    assert.match(result.output, /تُتخطّى/);
    assert.equal(result.calls, "");
  }
});

test("required fixture run fails when PostgreSQL is unavailable", (t) => {
  const result = harness(t, { missing: true }).run("true");
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.output, /✓ كل فحوص/);
  assert.equal(result.calls, "");
});

test("required fixture run rejects a missing psql before setup", (t) => {
  const result = harness(t, { noPsql: true }).run("true");
  assert.equal(result.status, 1);
  assert.match(result.output, /psql/);
  assert.equal(result.calls, "");
});

for (const mode of ["initdb-fail", "start-fail"]) {
  test(`required fixture ${mode} fails before any SQL client`, (t) => {
    const result = harness(t, { mode }).run("true");
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.calls, /^psql /m);
    assert.doesNotMatch(result.output, /✓ كل فحوص/);
  });
}

test("fixture harness runs all five unchanged SQL entries on private Unix sockets", (t) => {
  const result = harness(t).run("true");
  assert.equal(result.status, 0, result.output);
  const clients = result.calls.split("\n").filter((line) => line.startsWith("psql "));
  assert.equal(clients.length, 5);
  for (const line of clients) {
    assert.match(line, /-h \/tmp\/[^ ]+\/sock /);
    assert.match(line, / -X -d postgres /);
    assert.match(line, /ON_ERROR_STOP=1/);
  }
  for (const name of ["layer", "barrier", "capture", "operations", "search"])
    assert.match(result.calls, new RegExp(`-f supabase/preflight/rag_${name}_check\\.sql`));
  assert.equal((result.calls.match(/psql-env PGSERVICE= PGPASSFILE=\/dev\/null/g) || []).length, 5);
  assert.match(result.output, /✓ كل فحوص/);
});

test("fixture SQL assertion errors remain failures rather than skips", (t) => {
  const result = harness(t, { mode: "sql-fail" }).run("true");
  assert.equal(result.status, 1);
  assert.equal(result.calls.split("\n").filter((line) => line.startsWith("psql ")).length, 5);
  assert.match(result.output, /synthetic SQL assertion failed/);
  assert.doesNotMatch(result.output, /✓ كل فحوص/);
});

test("every scheduled/manual RAG job requires PostgreSQL regardless of fixture input", () => {
  const workflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  const job = workflow.match(/  rag-preflight:\n([\s\S]*?)\n  integration:/)?.[1];
  assert.ok(job, "RAG job must remain separate from integration");
  assert.match(
    job,
    /^    if: github\.event_name == 'schedule' \|\| github\.event_name == 'workflow_dispatch'$/m,
  );
  assert.match(job, /^      SADEED_E2E_FIXTURE_ONLY: ["']true["']$/m);
  assert.doesNotMatch(
    job,
    /inputs\.fixture_only/,
    "RAG execution must not depend on the optional diagnostic input",
  );
  const provisioning = job.match(
    /      - name: Provision PostgreSQL 16 for required fixture RAG checks\n([\s\S]*?)      - name: RAG preflight/,
  )?.[1];
  assert.ok(provisioning);
  assert.doesNotMatch(
    provisioning,
    /^        if:/m,
    "every selected RAG job must provision its tools",
  );
  assert.match(provisioning, /set -euo pipefail/);
  assert.match(job, /run: npm run check:rag/);
});

test("the actual fixture provisioning shell stops immediately on apt setup failure", (t) => {
  const fixture = harness(t, { missing: true });
  writeFileSync(
    join(fixture.bin, "sudo"),
    '#!/bin/bash\nprintf "%s\\n" "$*" >> "$RAG_TEST_LOG"\nexit 9\n',
    { mode: 0o755 },
  );
  const workflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  const match = workflow.match(
    /      - name: Provision PostgreSQL 16 for required fixture RAG checks\n        run: \|\n((?:          .*\n)+)/,
  );
  assert.ok(match, "RAG provisioning step must stay unconditional and executable");
  const body = match[1].replace(/^          /gm, "");
  const result = spawnSync("/bin/bash", ["-c", body], {
    env: { PATH: fixture.bin, RAG_TEST_LOG: fixture.log },
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 9);
  assert.equal(readFileSync(fixture.log, "utf8"), "apt-get update -qq\n");
});
