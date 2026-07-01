/**
 * Phase 9.3 — Verification of tool engine invariants.
 */

import { listTools } from "./registry.server";
import { isAdapterBound } from "./adapter.server";
import type { VerificationIssue, VerificationReport } from "./types";

function duplicates(): VerificationIssue[] {
  const seen = new Set<string>();
  const dups: VerificationIssue[] = [];
  for (const t of listTools()) {
    if (seen.has(t.tool_id)) {
      dups.push({
        code: "duplicate_tool_id",
        severity: "error",
        detail: `duplicate tool_id ${t.tool_id}`,
        subject_id: t.tool_id,
      });
    }
    seen.add(t.tool_id);
  }
  return dups;
}

function unboundHandlers(): VerificationIssue[] {
  const seen = new Set<string>();
  const out: VerificationIssue[] = [];
  for (const t of listTools()) {
    if (seen.has(t.adapter)) continue;
    seen.add(t.adapter);
    if (!isAdapterBound(t.adapter)) {
      out.push({
        code: "unbound_handler",
        severity: "warn",
        detail: `no handler bound for adapter ${t.adapter}`,
        subject_id: t.adapter,
      });
    }
  }
  return out;
}

function missingCapability(): VerificationIssue[] {
  return listTools()
    .filter((t) => !t.capability_id)
    .map((t) => ({
      code: "missing_capability" as const,
      severity: "error" as const,
      detail: `tool ${t.tool_id} missing capability_id`,
      subject_id: t.tool_id,
    }));
}

export function verifyToolEngine(): VerificationReport {
  const issues: VerificationIssue[] = [
    ...duplicates(),
    ...unboundHandlers(),
    ...missingCapability(),
  ];
  return {
    taken_at: new Date().toISOString(),
    issues,
    ok: issues.every((i) => i.severity !== "error"),
  };
}
