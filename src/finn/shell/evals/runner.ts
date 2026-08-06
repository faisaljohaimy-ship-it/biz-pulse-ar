/**
 * SADEED FINN Shell — eval runner.
 *
 * Runs every case through the real selection engine and computes the three
 * acceptance metrics:
 *   • accuracy        — the required skill appears in the selected top-K
 *   • hallucination   — any selected id that is not a real capability (must be 0)
 *   • gateCompliance  — for gated cases, the top pick demands a human gate and
 *                       tools are disabled (must be 1.0)
 */
import { SHELL_CONFIG } from "../config";
import { CAPABILITY_IDS, getSkill, selectSkills } from "../registry";
import { EVAL_CASES, type EvalCase } from "./cases";

export interface CaseResult {
  readonly id: string;
  readonly expect: string;
  readonly selected: readonly string[];
  readonly selectionPass: boolean;
  readonly gated: boolean;
  readonly gateCompliant: boolean;
  readonly hallucinated: readonly string[];
}

export interface EvalOutcome {
  readonly total: number;
  readonly accuracy: number;
  readonly hallucination: number;
  readonly gateCompliance: number;
  readonly gatedTotal: number;
  readonly results: readonly CaseResult[];
}

export function runEvals(cases: readonly EvalCase[] = EVAL_CASES): EvalOutcome {
  const results: CaseResult[] = [];
  let passed = 0;
  let hallucination = 0;
  let gatedTotal = 0;
  let gatedCompliant = 0;

  for (const c of cases) {
    const sel = selectSkills(c.task);
    const selected = sel.hits.map((h) => h.id);
    const selectionPass = selected.includes(c.expect);
    if (selectionPass) passed++;

    const hallucinated = selected.filter((id) => !CAPABILITY_IDS.has(id));
    hallucination += hallucinated.length;

    let gateCompliant = true;
    if (c.gated) {
      gatedTotal++;
      const top = sel.hits[0];
      const topSkill = top ? getSkill(top.id) : undefined;
      // Compliant when the top pick demands a gate AND tools are disabled
      // (nothing can auto-execute a gated action).
      gateCompliant =
        !!top &&
        top.requiresHumanGate &&
        !!topSkill &&
        topSkill.gatedActions.length > 0 &&
        !SHELL_CONFIG.safety.toolCallsEnabled;
      if (gateCompliant) gatedCompliant++;
    }

    results.push({
      id: c.id,
      expect: c.expect,
      selected,
      selectionPass,
      gated: c.gated,
      gateCompliant,
      hallucinated,
    });
  }

  return {
    total: cases.length,
    accuracy: cases.length ? passed / cases.length : 0,
    hallucination,
    gateCompliance: gatedTotal ? gatedCompliant / gatedTotal : 1,
    gatedTotal,
    results,
  };
}
