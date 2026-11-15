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
    // Preserve historical null fallbacks, but never display NaN/Infinity as live telemetry.
    const optional = (value: number | null | undefined, id: string) =>
      value == null ? fallback(id) : twinValue(value, ar);
    const values: Record<string, string> = {
      depts: optional(signals.departments, "depts"),
      data: twinValue(signals.events, ar),
      agents: optional(signals.agents, "agents"),
      integ: optional(signals.integrations, "integ"),
      flows: twinValue(signals.automations, ar),
      know: twinValue(signals.documents, ar),
      risk: twinValue(signals.criticalRisks, ar),
      board: twinValue(signals.boardActions, ar),
      intel: twinValue(signals.intelligenceSignals, ar),
      exec: twinValue(signals.executionVelocity, ar, "%"),
    };
    return nodes.map((n) => ({ ...n, value: values[n.id] ?? n.value }));
  }, [nodes, signals, ar]);
}
