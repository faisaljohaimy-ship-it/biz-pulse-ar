// Environment validation. No fake pass without evidence.
import type { EnvironmentReport, EnvironmentSpec, EvidenceRef, TriState } from "./types";
import { EnvironmentSpecZ } from "./contracts";

interface Check {
  id: string;
  state: TriState;
  message: string;
  evidence: EvidenceRef[];
}

export function validateEnvironment(
  spec: EnvironmentSpec,
  evidence: ReadonlyArray<EvidenceRef> = [],
): EnvironmentReport {
  const parsed = EnvironmentSpecZ.parse(spec);
  const checks: Check[] = [];

  checks.push({
    id: "env.kind",
    state:
      parsed.kind === "production" || parsed.kind === "staging"
        ? "pass"
        : parsed.kind === "unknown"
          ? "unknown"
          : "fail",
    message: `kind=${parsed.kind}`,
    evidence: [...evidence],
  });

  checks.push({
    id: "env.region",
    state: parsed.region.length > 0 ? "pass" : "unknown",
    message: `region=${parsed.region}`,
    evidence: [...evidence],
  });

  checks.push({
    id: "env.runtime",
    state:
      parsed.runtime === "workerd" || parsed.runtime === "edge"
        ? "pass"
        : parsed.runtime === "unknown"
          ? "unknown"
          : "fail",
    message: `runtime=${parsed.runtime}`,
    evidence: [...evidence],
  });

  const overall: TriState = checks.some((c) => c.state === "fail")
    ? "fail"
    : checks.some((c) => c.state === "unknown")
      ? "unknown"
      : "pass";

  return {
    kind: parsed.kind,
    region: parsed.region,
    runtime: parsed.runtime,
    checks,
    overall,
  };
}
