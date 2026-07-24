import { describe, expect, it } from "vitest";
import {
  assertShellWrite,
  assertToolCallable,
  CoreWriteForbiddenError,
  isShellTable,
} from "./shell";

/** The boundary guard: the shell writes only shell_* tables, never the core. */
describe("FINN shell — boundary guard", () => {
  it("allows writes to shell tables", () => {
    for (const t of ["shell_runs", "shell_proposals", "shell_params", "eval_results"]) {
      expect(isShellTable(t)).toBe(true);
      expect(() => assertShellWrite(t, "insert")).not.toThrow();
    }
  });

  it("THROWS on any core-table write", () => {
    for (const t of ["aria_documents", "aria_outbound_messages", "sec_reports", "profiles"]) {
      expect(isShellTable(t)).toBe(false);
      expect(() => assertShellWrite(t, "update")).toThrow(CoreWriteForbiddenError);
    }
  });

  it("refuses tool calls while tools are disabled (advisory-only)", () => {
    expect(() => assertToolCallable("nx.governance.list-controls", new Set())).toThrow(
      /advisory-only/,
    );
  });
});
