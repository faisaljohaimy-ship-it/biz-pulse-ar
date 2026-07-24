/**
 * Shell bridges — Permission Layer · Memory Bridge · Agent Bridge · Output
 * Gateway Integration.
 *
 * Policy is NOT re-implemented here: the permission layer delegates to the
 * advisory shell's authz (admin-only approval, org boundary) and the human-gate
 * set; the output integration wraps the Phase-1 gateway verbatim (it is never
 * modified or bypassed). The memory bridge is a port with an inert default —
 * production wires the existing persistence behind it; the shell itself never
 * touches core tables.
 */
import {
  HUMAN_GATE_ACTIONS,
  canCreateProposal,
  canDecideProposal,
  getSkill,
  requiresHumanGate,
  selectSkills,
  buildRun,
  type Actor,
  type GatedAction,
  type SelectionResult,
} from "@/finn/shell";
import {
  finalizeFinnOutput,
  type EvidenceRef,
  type ExecutionReceipt,
} from "@/lib/aria/output/finalize";
import { sealEnvelope, type SafeFinnOutputEnvelopeV1 } from "@/lib/aria/output/envelope";
import type { ShellContext } from "./managers";
import type { Diagnostics } from "./diagnostics";

// ── Permission Layer ────────────────────────────────────────────────────────

export class ShellPermissionLayer {
  constructor(private readonly diagnostics: Diagnostics) {}

  /** A gated action may only proceed with an explicit human approval flag. */
  requiresHumanGate(action: GatedAction): boolean {
    return HUMAN_GATE_ACTIONS.has(action);
  }

  canDecideProposal(actor: Actor, resourceOrgId?: string | null): boolean {
    const allowed = canDecideProposal(actor, resourceOrgId);
    this.diagnostics.record("info", "permissions", "decide-proposal check", {
      allowed,
      org: resourceOrgId ?? null,
    });
    return allowed;
  }

  canCreateProposal(actor: Actor): boolean {
    return canCreateProposal(actor);
  }
}

// ── Memory Bridge ───────────────────────────────────────────────────────────

export interface MemoryTurn {
  readonly question: string;
  readonly answer: string;
}

/** Port to the memory subsystem; production supplies a real adapter. */
export interface MemoryAdapter {
  remember(turn: MemoryTurn, context: ShellContext): Promise<void>;
  recall(query: string, context: ShellContext): Promise<readonly string[]>;
}

/** Inert default — never fails, never persists (safe for boot/tests). */
export const inertMemoryAdapter: MemoryAdapter = {
  async remember() {
    /* no-op */
  },
  async recall() {
    return [];
  },
};

export class ShellMemoryBridge {
  constructor(
    private readonly adapter: MemoryAdapter,
    private readonly diagnostics: Diagnostics,
  ) {}

  async remember(turn: MemoryTurn, context: ShellContext): Promise<boolean> {
    try {
      await this.adapter.remember(turn, context);
      return true;
    } catch (error) {
      this.diagnostics.record("warn", "memory", "remember failed (non-fatal)", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async recall(query: string, context: ShellContext): Promise<readonly string[]> {
    try {
      return await this.adapter.recall(query, context);
    } catch (error) {
      this.diagnostics.record("warn", "memory", "recall failed (non-fatal)", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}

// ── Output Gateway Integration ──────────────────────────────────────────────

export interface ShellEmitInput {
  readonly userText: string;
  readonly modelText: string;
  readonly evidence?: readonly EvidenceRef[];
  readonly liveDataAvailable?: boolean;
  readonly trustedClockISO?: string | null;
  readonly action?: { type: "execute" | "approve"; gatedAction?: GatedAction };
  readonly resourceOrgId?: string | null;
  readonly executionReceipt?: ExecutionReceipt | null;
  readonly retrievedDocs?: readonly string[];
}

/**
 * The ONLY way a shell module emits user-facing text: straight through the
 * Phase-1 output gateway, sealed into the versioned envelope. Raw model text
 * never leaves the shell.
 */
export class ShellOutputIntegration {
  constructor(private readonly diagnostics: Diagnostics) {}

  emit(input: ShellEmitInput, context: ShellContext): SafeFinnOutputEnvelopeV1 {
    const safe = finalizeFinnOutput({
      userText: input.userText,
      modelText: input.modelText,
      actor: context.actor,
      evidence: { available: input.evidence ?? [] },
      liveDataAvailable: input.liveDataAvailable ?? false,
      trustedClockISO: input.trustedClockISO ?? null,
      isSimulationEnv: true,
      ...(input.action ? { action: input.action } : {}),
      ...(input.resourceOrgId !== undefined ? { resourceOrgId: input.resourceOrgId } : {}),
      ...(input.executionReceipt !== undefined ? { executionReceipt: input.executionReceipt } : {}),
      ...(input.retrievedDocs ? { retrievedDocs: input.retrievedDocs } : {}),
    });
    const envelope = sealEnvelope(safe, {
      requestId: context.requestId,
      locale: context.locale,
      createdAt: input.trustedClockISO ?? "1970-01-01T00:00:00Z",
    });
    this.diagnostics.record("info", "output", "emitted via gateway", {
      status: envelope.status,
      requestId: context.requestId,
    });
    return envelope;
  }
}

// ── Agent Bridge ────────────────────────────────────────────────────────────

export interface AgentTaskResult {
  readonly selection: SelectionResult;
  readonly gated: boolean;
  readonly envelope: SafeFinnOutputEnvelopeV1;
  /** Pure telemetry row (is_simulation=true) — persistence stays outside. */
  readonly telemetry: ReturnType<typeof buildRun>;
}

/**
 * Bridges the ADVISORY capability shell into the runtime: deterministic skill
 * selection, human-gate enforcement through the permission layer, and every
 * user-facing result emitted through the output gateway.
 */
export class ShellAgentBridge {
  constructor(
    private readonly permissions: ShellPermissionLayer,
    private readonly output: ShellOutputIntegration,
    private readonly diagnostics: Diagnostics,
  ) {}

  select(task: string): SelectionResult {
    return selectSkills(task);
  }

  runTask(
    task: string,
    context: ShellContext,
    options: { advisoryText?: string; approvedReceipt?: ExecutionReceipt | null } = {},
  ): AgentTaskResult {
    const selection = this.select(task);
    const top = selection.hits[0];
    const topSkill = top ? getSkill(top.id) : undefined;
    const gated = !!topSkill && requiresHumanGate(topSkill);
    const gatedAction = gated ? topSkill!.gatedActions[0] : undefined;

    const envelope = this.output.emit(
      {
        userText: task,
        modelText: options.advisoryText ?? "",
        ...(gated
          ? {
              action: { type: "execute" as const, ...(gatedAction ? { gatedAction } : {}) },
              executionReceipt: options.approvedReceipt ?? null,
            }
          : {}),
      },
      context,
    );

    const telemetry = buildRun({
      capabilityId: top?.id ?? null,
      task,
      selectedRank: top ? 1 : null,
      latencyMs: null,
      outcome: envelope.status === "refusal" ? "partial" : "success",
      userRole: null,
      region: null,
    });

    this.diagnostics.record("info", "agents", "task routed", {
      top: top?.id ?? null,
      gated,
      status: envelope.status,
    });
    return { selection, gated, envelope, telemetry };
  }
}
