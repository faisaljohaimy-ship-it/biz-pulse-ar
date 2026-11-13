import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
const stack = readFileSync(new URL("./stack.sh", import.meta.url), "utf8");

const start = workflow.indexOf("\n  integration:\n");
const end = workflow.indexOf("\n  security-gap-closure-e2e:", start);
const integration = start >= 0 && end > start ? workflow.slice(start, end) : "";

test("full CI provisions PostgreSQL 16 before bringing up the real integration stack", () => {
  assert.ok(integration, "integration job must remain configured");
  const provisioning = integration.indexOf("- name: Provision PostgreSQL 16 toolchain");
  const bringUp = integration.indexOf("run: npm run integration:up");
  assert.ok(provisioning >= 0 && bringUp > provisioning, "install must precede stack startup");

  const setup = integration.slice(provisioning, bringUp);
  assert.match(setup, /sudo apt-get update -qq/);
  assert.match(setup, /apt-get install -y --no-install-recommends postgresql-16 postgresql-client-16/);
  assert.match(setup, /test -x \/usr\/lib\/postgresql\/16\/bin\/initdb/);
  assert.match(setup, /test -x \/usr\/lib\/postgresql\/16\/bin\/pg_ctl/);
  assert.match(setup, /command -v psql/);
});

test("integration stack still fails closed without the pinned PostgreSQL executables", () => {
  assert.match(integration, /CI: "true"/);
  assert.match(stack, /if \[ ! -x "\$PGBIN\/initdb" \] \|\| \[ ! -x "\$PGBIN\/pg_ctl" \]; then/);
  assert.match(stack, /if \[ "\$\{CI:-\}" = "true" \]; then/);
  assert.match(stack, /die "Postgres 16 binaries not found/);
});
