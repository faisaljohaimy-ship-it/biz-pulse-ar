import type {
  EvidenceRef,
  ProcurementChecklistItem,
  ProcurementItemState,
  ProcurementReadiness,
} from "./types";
import { ProcurementChecklistItemZ } from "./contracts";

export function assessProcurement(input: {
  items: ReadonlyArray<ProcurementChecklistItem>;
  evidence: ReadonlyArray<EvidenceRef>;
}): ProcurementReadiness {
  if (input.evidence.length === 0) throw new Error("procurement assessment requires evidence");
  const items = input.items.map((i) => ProcurementChecklistItemZ.parse(i));
  const readyCount = items.filter((i) => i.state === "ready").length;
  const blockedCount = items.filter((i) => i.state === "blocked").length;
  let overall: ProcurementItemState;
  if (items.length === 0) overall = "unknown";
  else if (blockedCount > 0) overall = "blocked";
  else if (readyCount === items.length) overall = "ready";
  else if (items.some((i) => i.state === "in_progress")) overall = "in_progress";
  else if (items.some((i) => i.state === "unknown")) overall = "unknown";
  else overall = "not_started";
  return {
    items,
    readyCount,
    blockedCount,
    overall,
    evidence: input.evidence,
  };
}
