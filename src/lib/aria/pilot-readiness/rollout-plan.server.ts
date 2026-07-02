// Rollout plan — deterministic wave ordering.
import type { EvidenceRef, RolloutPlan, RolloutWave } from "./types";
import { RolloutWaveZ } from "./contracts";

export function buildRolloutPlan(input: {
  pilotId: string;
  waves: ReadonlyArray<RolloutWave>;
  evidence: ReadonlyArray<EvidenceRef>;
}): RolloutPlan {
  if (input.evidence.length === 0) throw new Error("rollout plan requires evidence");
  const waves = input.waves.map((w) => RolloutWaveZ.parse(w));
  const sorted = [...waves].sort((a, b) => a.waveNumber - b.waveNumber);
  // enforce unique wave numbers
  const seen = new Set<number>();
  for (const w of sorted) {
    if (seen.has(w.waveNumber)) throw new Error(`duplicate wave number: ${w.waveNumber}`);
    seen.add(w.waveNumber);
  }
  return { pilotId: input.pilotId, waves: sorted, evidence: input.evidence };
}
