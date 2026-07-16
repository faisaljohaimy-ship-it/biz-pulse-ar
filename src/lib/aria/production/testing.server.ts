/**
 * Phase 9.0 — Testing registry.
 *
 * In-process registry of tests, plans, and last-known status. Statuses
 * default to "unknown" so the release gate never fabricates a pass.
 */

import type { TestRegistryEntry } from "./types";
import { TestRegistryEntrySchema } from "./contracts";

const REGISTRY = new Map<string, TestRegistryEntry>();

function seedIfEmpty(): void {
  if (REGISTRY.size > 0) return;
  const seed: TestRegistryEntry[] = [
    {
      id: "unit.aria-singleton",
      kind: "unit",
      label: "ARIA singleton contract",
      target: "src/lib/aria-core/singleton-contract.test.ts",
      status: "unknown",
    },
    {
      id: "unit.hologram-face",
      kind: "unit",
      label: "Hologram Face",
      target: "src/components/digital-humans/HologramFace.test.tsx",
      status: "unknown",
    },
    {
      id: "unit.chat-guard",
      kind: "unit",
      label: "Chat guard",
      target: "src/routes/api/-chat-guard.test.ts",
      status: "unknown",
    },
    {
      id: "integration.readiness",
      kind: "integration",
      label: "Production readiness aggregator",
      target: "src/lib/aria/production/readiness.server.ts",
      status: "unknown",
    },
    {
      id: "integration.audit",
      kind: "integration",
      label: "Audit trail persistence",
      target: "src/lib/exec/audit.server.ts",
      status: "unknown",
    },
    {
      id: "e2e.exec-briefing",
      kind: "e2e",
      label: "Executive briefing render",
      target: "src/routes/executive-briefing.tsx",
      status: "unknown",
    },
    {
      id: "e2e.request-demo",
      kind: "e2e",
      label: "Request a demo submission",
      target: "src/routes/request-demo.tsx",
      status: "unknown",
    },
    {
      id: "regression.rls-multitenancy",
      kind: "regression",
      label: "RLS tenant isolation",
      target: "sec_* + aria_*",
      status: "unknown",
    },
    {
      id: "smoke.health",
      kind: "smoke",
      label: "Public health endpoint",
      target: "src/routes/api/public/health.ts",
      status: "unknown",
    },
    {
      id: "smoke.aria-ask",
      kind: "smoke",
      label: "ARIA ask endpoint",
      target: "src/routes/api/public/aria-ask.ts",
      status: "unknown",
    },
    {
      id: "failure.exec-report-timeout",
      kind: "failure",
      label: "Executive report timeout fallback",
      target: "src/lib/reports/snapshot.server.ts",
      status: "unknown",
    },
    {
      id: "failure.graph-401",
      kind: "failure",
      label: "Microsoft Graph 401 injection path",
      target: "executive-reports mock mode",
      status: "unknown",
    },
  ];
  for (const e of seed) REGISTRY.set(e.id, e);
}
seedIfEmpty();

export function registerTest(entry: TestRegistryEntry): TestRegistryEntry {
  const parsed = TestRegistryEntrySchema.parse(entry);
  REGISTRY.set(parsed.id, parsed);
  return parsed;
}

export function updateTestStatus(
  id: string,
  status: TestRegistryEntry["status"],
  notes?: string,
): TestRegistryEntry | null {
  const cur = REGISTRY.get(id);
  if (!cur) return null;
  const next: TestRegistryEntry = {
    ...cur,
    status,
    last_run_at: new Date().toISOString(),
    notes: notes ?? cur.notes,
  };
  REGISTRY.set(id, next);
  return next;
}

export function listTests(kind?: TestRegistryEntry["kind"]): TestRegistryEntry[] {
  const all = [...REGISTRY.values()];
  return kind ? all.filter((e) => e.kind === kind) : all;
}

export function testingSummary(): {
  total: number;
  by_kind: Record<TestRegistryEntry["kind"], number>;
  by_status: Record<TestRegistryEntry["status"], number>;
  failing: TestRegistryEntry[];
  unknown: TestRegistryEntry[];
} {
  const byKind: Record<TestRegistryEntry["kind"], number> = {
    unit: 0,
    integration: 0,
    e2e: 0,
    regression: 0,
    smoke: 0,
    failure: 0,
  };
  const byStatus: Record<TestRegistryEntry["status"], number> = {
    planned: 0,
    passing: 0,
    failing: 0,
    skipped: 0,
    unknown: 0,
  };
  const failing: TestRegistryEntry[] = [];
  const unknown: TestRegistryEntry[] = [];
  for (const e of REGISTRY.values()) {
    byKind[e.kind]++;
    byStatus[e.status]++;
    if (e.status === "failing") failing.push(e);
    if (e.status === "unknown") unknown.push(e);
  }
  return { total: REGISTRY.size, by_kind: byKind, by_status: byStatus, failing, unknown };
}
