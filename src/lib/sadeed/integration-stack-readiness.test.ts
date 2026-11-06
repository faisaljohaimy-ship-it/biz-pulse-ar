import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function runProbe(mockCurl: string) {
  return spawnSync(
    "bash",
    [
      "-ec",
      `source tests/integration/stack.sh
counter="$(mktemp)"
printf '0' > "$counter"
trap 'rm -f "$counter"' EXIT
sleep() { :; }
curl() {
  count="$(cat "$counter")"
  count=$((count+1))
  printf '%s' "$count" > "$counter"
  ${mockCurl}
}
wait_for_fixture_smoke test-anon test-service
printf 'probes=%s' "$(cat "$counter")"`,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
}

describe("local PostgREST integration-stack readiness probe", () => {
  it("retries a transient PGRST002 schema-cache response before requiring both fixtures", () => {
    const result = runProbe(`if [ "$count" -le 2 ]; then
  printf '%s\\n' '{"code":"PGRST002"}'
else
  printf '%s\\n' '[{"ref":"INT-A-1"},{"ref":"INT-B-2"}]'
fi`);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("probes=3");
  });

  it("fails closed after a bounded sequence of persistent schema-cache failures", () => {
    const result = runProbe(`printf '%s\\n' '{"code":"PGRST002"}'`);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("did not become ready after 30 startup probes");
    expect(result.stdout).not.toContain("probes=");
  });

  it("does not silently retry an unexpected error as successful readiness", () => {
    const result = runProbe(`printf '%s\\n' '{"code":"PGRST301"}'`);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unexpected gateway response");
  });
});
