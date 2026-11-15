import { useMemo } from "react";
import type { TwinSignals } from "@/lib/intelligence.functions";
import { unmeasuredLabel } from "@/lib/evidence/evidence";

type TwinValueNode = { id: string; value: string };

/** Display missing values in the current locale, not as null, NaN or a fabricated zero. */
export function twinValue(v: number | null | undefined, ar: boolean, suffix = ""): string {
  return v == null || !Number.isFinite(v) ? unmeasuredLabel(ar) : String(v) + suffix;
}

/**
 * The same real signals can be viewed in either language without a network refresh.
 * In particular, null documents and velocity must be re-labelled when locale changes.
 * Keep original fallback values and other node semantics unchanged.
 */
export function useLiveTwinNodes<T extends TwinValueNode>(
  nodes: T[],
  signals: TwinSignals | undefined,
  ar: boolean,
): T[] {
  return useMemo(() => {
    if (!signals) return nodes;
    const fallback = (id: string) => nodes.find((n) => n.id === id)?.value ?? "";
    // Counts cannot be negative; do not publish corrupt telemetry as a measured value.
    // Keep signed execution velocity separate: a decline can be a meaningful percentage.
    const measuredCount = (value: number | null | undefined) =>
      twinValue(Number(value) < 0 ? null : value, ar);
    const optional = (value: number | null | undefined, id: string) =>
      value == null ? fallback(id) : measuredCount(value);
    const values: Record<string, string> = {
      depts: optional(signals.departments, "depts"),
      data: measuredCount(signals.events),
      agents: optional(signals.agents, "agents"),
      integ: optional(signals.integrations, "integ"),
      flows: measuredCount(signals.automations),
      know: measuredCount(signals.documents),
      risk: measuredCount(signals.criticalRisks),
      board: measuredCount(signals.boardActions),
      intel: measuredCount(signals.intelligenceSignals),
      exec: twinValue(signals.executionVelocity, ar, "%"),
    };
    return nodes.map((n) => ({ ...n, value: values[n.id] ?? n.value }));
  }, [nodes, signals, ar]);
}
