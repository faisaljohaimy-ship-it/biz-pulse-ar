import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const stackScript = path.resolve(process.cwd(), "tests/integration/stack.sh");
const mockedSmoke = [
  'source "$1"',
  'curl() { printf "%s" "$SMOKE_RESPONSE"; }',
  "wait_for_fixture_smoke test-only-anon test-only-service",
].join("\n");

function smokeExit(response: string): number | null {
  const result = spawnSync("bash", ["-c", mockedSmoke, "bash", stackScript], {
    env: { ...process.env, SMOKE_RESPONSE: response },
    encoding: "utf8",
    timeout: 3000,
  });
  if (result.error) throw result.error;
  return result.status;
}

describe("isolated integration fixture readiness smoke", () => {
  it.each([
    '[{"ref":"INT-A-1"},{"ref":"INT-B-2"}]',
    '[\n  { "ref": "INT-A-1" },\n  { "ref": "INT-B-2" }\n]',
  ])("accepts only the exact two ordered fixture records (%s)", (response) => {
    expect(smokeExit(response)).toBe(0);
  });

  it.each([
    '{"error":"expected INT-A-1 then INT-B-2 but found no records"}',
    '{"message":"INT-A-1, INT-B-2"}',
    '[{"ref":"INT-A-1"},{"ref":"INT-B-2"},{"ref":"INT-C-3"}]',
    '[{"ref":"INT-B-2"},{"ref":"INT-A-1"}]',
    '[{"ref":"INT-A-1","unexpected":true},{"ref":"INT-B-2"}]',
    'not JSON INT-A-1 INT-B-2',
  ])("rejects false-positive fixture responses (%s)", (response) => {
    expect(smokeExit(response)).not.toBe(0);
  });
});
