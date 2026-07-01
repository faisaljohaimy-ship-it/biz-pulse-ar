/**
 * Known limitations — deterministic list; caller may append but never fabricate.
 */
import type { EvidenceRef, KnownLimitation, RcInputs } from "./types";
import { ev } from "./gate-utils.server";

export function baseKnownLimitations(input: RcInputs): readonly KnownLimitation[] {
  const items: KnownLimitation[] = [
    {
      id: "LIM-001",
      area: "world_model",
      description:
        "Digital twin validated only on seeded Jeddah / Makkah / Yanbu tenants.",
      severity: "medium",
      workaround: "Extend seed data before opening additional tenants.",
      evidence: [ev("sec.seed", "config", "sec_* seed dataset")],
    },
    {
      id: "LIM-002",
      area: "multimodal",
      description:
        "Vision analyzers require caller-supplied OCR/ASR; no in-process pixel model.",
      severity: "low",
      workaround: "Route uploads through the OCR/ASR adapter before analysis.",
      evidence: [ev("mm.pkg", "config", "src/lib/aria/multimodal")],
    },
    {
      id: "LIM-003",
      area: "governance",
      description:
        "Approval TTL defaults to 15 minutes; long-running approvals require caller-supplied TTL.",
      severity: "low",
      evidence: [ev("gov.approval", "config", "src/lib/aria/governance/approval.server.ts")],
    },
  ];

  const missingCreds = Object.entries(input.external_credentials ?? {})
    .filter(([, present]) => !present)
    .map(([k]) => k);
  if (missingCreds.length > 0) {
    items.push({
      id: "LIM-004",
      area: "integration",
      description: `Missing external credentials: ${missingCreds.join(", ")}. Affected connectors run in degraded mode.`,
      severity: "high",
      workaround: "Provide credentials via secrets vault before pilot cutover.",
      evidence: [ev("integration.vault", "config", "aria.integration.vault") as EvidenceRef],
    });
  }
  return items;
}
