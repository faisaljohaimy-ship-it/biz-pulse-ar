import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("migration harness rejects remote/implicit targets before executing any SQL", () => {
  const directory = mkdtempSync(join(tmpdir(), "sadeed-migration-target-"));
  const marker = join(directory, "sql-was-executed");
  writeFileSync(join(directory, "psql"), `#!/bin/sh\ntouch '${marker}'\nexit 1\n`, { mode: 0o755 });
  const script = fileURLToPath(new URL("./apply-migrations.sh", import.meta.url));
  try {
    for (const args of [
      ["-h", "203.0.113.42", "-d", "postgres"],
      ["-h127.0.0.1", "-d", "postgres://remote.invalid/postgres"],
      ["--host=127.0.0.1", "-d", "host=remote.invalid dbname=postgres"],
      ["-d", "postgres"],
      ["-h", "127.0.0.1", "-h", "remote.invalid"],
    ]) {
      const result = spawnSync("bash", [script, ...args], {
        encoding: "utf8",
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
      });
      assert.equal(result.status, 1, JSON.stringify(args));
      assert.match(result.stderr, /Refusing/);
      assert.equal(existsSync(marker), false, "psql executed before target validation");
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
