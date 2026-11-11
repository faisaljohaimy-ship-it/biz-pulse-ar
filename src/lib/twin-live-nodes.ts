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
    // A measured zero is not missing: never replace it with a reference count.
    // Preserve the existing fallback only for non-finite/missing signals.
    const countOrFallback = (value: number, id: string) =>
      Number.isFinite(value) ? String(value) : fallback(id);
    const values: Record<string, string> = {
      depts: countOrFallback(signals.departments, "depts"),
      data: String(signals.events),
      agents: countOrFallback(signals.agents, "agents"),
      integ: countOrFallback(signals.integrations, "integ"),
      flows: String(signals.automations),
      know: twinValue(signals.documents, ar),
      risk: String(signals.criticalRisks),
      board: String(signals.boardActions),
      intel: String(signals.intelligenceSignals),
      exec: twinValue(signals.executionVelocity, ar, "%"),
    };
    return nodes.map((n) => ({ ...n, value: values[n.id] ?? n.value }));
  }, [nodes, signals, ar]);
}
