/**
 * Approval gate resolver. Constraints of kind "human_approval" or
 * "compliance" produce required/conditional gates on the appropriate
 * atomic nodes; every other node is auto-approved.
 */
import type {
  ApprovalGate,
  ApprovalMode,
  CapabilityBinding,
  MissionConstraint,
  MissionTree,
} from "./types";
import { getActive } from "../marketplace/version.server";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function resolveApprovals(
  tree: MissionTree,
  bindings: CapabilityBinding[],
  constraints: MissionConstraint[],
): ApprovalGate[] {
  const requiresHumanApproval = constraints.some(
    (c) => c.kind === "human_approval" && c.hard,
  );
  const complianceConditional = constraints.some(
    (c) => c.kind === "compliance",
  );

  const gates: ApprovalGate[] = [];
  for (const id of tree.atomic_ids) {
    const b = bindings.find((x) => x.node_id === id);
    const agentId = b?.resolved_agent ?? null;
    const pkg = agentId ? getActive(agentId) : null;
    const manifestSaysHigh = pkg?.manifest.cost === "high";

    let mode: ApprovalMode = "auto_approved";
    let condition: string | undefined;
    let reasoning = "No approval gate required by constraints or agent cost.";

    if (requiresHumanApproval) {
      mode = "required";
      reasoning = "Hard human_approval constraint applies to every atomic node.";
    } else if (manifestSaysHigh) {
      mode = "conditional";
      condition = "cost>medium OR retries>0";
      reasoning =
        "Agent declares high cost; require executive approval on retry or overrun.";
    } else if (complianceConditional) {
      mode = "conditional";
      condition = "compliance_audit_required";
      reasoning =
        "Compliance constraint present; gate becomes required if audit flag is raised.";
    } else if (b?.match_kind === "unresolved") {
      mode = "required";
      reasoning =
        "Unresolved capability requires human confirmation of the recovery path.";
    }

    gates.push({
      id: uid("gate"),
      node_id: id,
      mode,
      condition,
      reasoning,
    });
  }
  return gates;
}
