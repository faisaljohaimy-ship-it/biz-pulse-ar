import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertNoPayloadOrg,
  assertParamWithinBounds,
  assertRuntimeWrite,
  runtimeWrite,
  SHELL_PROTECTED_TABLES,
  SHELL_RUNTIME_WRITE_ALLOWLIST,
  WriteGatewayError,
  type ShellWriter,
} from "./gateway";

/** A capturing fake writer — records the row it was asked to insert. */
function fakeWriter(): { writer: ShellWriter; captured: Record<string, unknown>[] } {
  const captured: Record<string, unknown>[] = [];
  const writer: ShellWriter = {
    from() {
      return {
        async insert(rows: unknown) {
          captured.push(rows as Record<string, unknown>);
          return { error: null };
        },
      };
    },
  };
  return { writer, captured };
}

describe("FINN shell — runtime write gateway", () => {
  it("allows ONLY the four runtime tables", () => {
    expect([...SHELL_RUNTIME_WRITE_ALLOWLIST].sort()).toEqual([
      "eval_results",
      "shell_params",
      "shell_proposals",
      "shell_runs",
    ]);
    for (const t of SHELL_RUNTIME_WRITE_ALLOWLIST) {
      expect(() => assertRuntimeWrite(t, "insert")).not.toThrow();
    }
  });

  it("REJECTS shell_capabilities (protected governance table) on every op", () => {
    expect(SHELL_PROTECTED_TABLES.has("shell_capabilities")).toBe(true);
    expect(SHELL_RUNTIME_WRITE_ALLOWLIST.has("shell_capabilities")).toBe(false);
    for (const op of ["insert", "update", "upsert", "delete", "rpc"] as const) {
      expect(() => assertRuntimeWrite("shell_capabilities", op)).toThrow(WriteGatewayError);
    }
  });

  it("REJECTS an unknown / future table by default-deny", () => {
    for (const t of ["shell_secrets", "finn_documents", "profiles", "some_future_table"]) {
      expect(() => assertRuntimeWrite(t, "insert")).toThrow(WriteGatewayError);
    }
  });

  it("REJECTS a shell_params value outside its trusted [min,max]", () => {
    // topK bounds are [1,5]; confidenceThreshold [0.5,0.85].
    expect(() => assertParamWithinBounds("selection.topK", 3)).not.toThrow();
    expect(() => assertParamWithinBounds("selection.topK", 6)).toThrow(WriteGatewayError);
    expect(() => assertParamWithinBounds("selection.topK", 0)).toThrow(WriteGatewayError);
    expect(() => assertParamWithinBounds("selection.confidenceThreshold", 0.99)).toThrow(
      WriteGatewayError,
    );
    // No trusted bounds source → refuse (never invent bounds).
    expect(() => assertParamWithinBounds("selection.unknownKey", 1)).toThrow(WriteGatewayError);
  });

  it("blocks a shell_params write whose value breaches bounds", async () => {
    const { writer } = fakeWriter();
    await expect(
      runtimeWrite(
        "shell_params",
        "insert",
        { key: "selection.topK", value_num: 99 },
        { writer, session: { orgId: "org-1", userId: "u1" } },
      ),
    ).rejects.toBeInstanceOf(WriteGatewayError);
  });

  it("REJECTS org_id supplied in the payload — tenancy is session-only", () => {
    expect(() => assertNoPayloadOrg({ org_id: "org-attacker" })).toThrow(WriteGatewayError);
    expect(() => assertNoPayloadOrg({ orgId: "org-attacker" })).toThrow(WriteGatewayError);
    expect(() => assertNoPayloadOrg({ organization_id: "x" })).toThrow(WriteGatewayError);
    expect(() => assertNoPayloadOrg({ taskHash: "abcd1234" })).not.toThrow();
  });

  it("injects org_id from the session, never from the payload", async () => {
    const { writer, captured } = fakeWriter();
    const out = await runtimeWrite(
      "shell_runs",
      "insert",
      { taskHash: "deadbeef", isSimulation: true },
      { writer, session: { orgId: "org-session", userId: "u1" } },
    );
    expect(out.org_id).toBe("org-session");
    expect(captured[0].org_id).toBe("org-session");
  });

  it("refuses an org-scoped write with no session", async () => {
    const { writer } = fakeWriter();
    await expect(
      runtimeWrite("shell_runs", "insert", { taskHash: "x" }, { writer }),
    ).rejects.toBeInstanceOf(WriteGatewayError);
  });

  it("is a safe validate-only no-op with no writer", async () => {
    await expect(
      runtimeWrite("shell_runs", "insert", { taskHash: "x", isSimulation: true }),
    ).resolves.toEqual({ taskHash: "x", isSimulation: true });
  });

  it("has NO direct write path bypassing the gateway (source scan)", () => {
    const shellDir = resolve(process.cwd(), "src/finn/shell");
    const offenders: string[] = [];
    // Any Supabase write/execute primitive is only permitted inside gateway.ts.
    const WRITE_PATTERNS = [/\.from\s*\(/, /\.rpc\s*\(/];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = `${dir}/${entry}`;
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.endsWith(".ts")) continue;
        if (entry === "gateway.ts") continue; // the sole sanctioned write site
        if (entry.endsWith(".test.ts")) continue; // tests use fakes, not real writes
        const src = readFileSync(full, "utf8");
        if (WRITE_PATTERNS.some((re) => re.test(src))) offenders.push(full);
      }
    };
    walk(shellDir);

    expect(offenders, `direct write outside gateway: ${offenders.join(", ")}`).toHaveLength(0);
  });
});
