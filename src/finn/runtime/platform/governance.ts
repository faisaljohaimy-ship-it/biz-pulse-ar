/**
 * Runtime governance — Runtime Policy Manager · Runtime Compliance Manager.
 *
 * Runtime policies are isolated per tenant: a tenant's policy affects that
 * tenant only; platform-wide policies affect everyone. Evaluation is fail
 * closed — every applicable policy must allow. The compliance manager runs
 * registered checks (a throwing check counts as failed, contained) and
 * reports an overall verdict.
 */
import { PlatformError, type TenantContext } from "./types";
import type { AuditLayer } from "../orchestration/policy";
import type { ConfigurationManager } from "./config";

export interface RuntimePolicy {
  readonly id: string;
  /** null → platform-wide; otherwise applies ONLY to that tenant. */
  readonly tenantId: string | null;
  evaluate(action: string, ctx: TenantContext | null): { allowed: boolean; reason: string };
}

export class RuntimePolicyManager {
  private readonly policies = new Map<string, RuntimePolicy>();

  register(policy: RuntimePolicy): void {
    if (this.policies.has(policy.id)) {
      throw new PlatformError("policy", `duplicate policy "${policy.id}"`);
    }
    this.policies.set(policy.id, policy);
  }

  /** Platform policies + the caller tenant's policies; ALL must allow. */
  evaluate(
    action: string,
    ctx: TenantContext | null,
  ): { allowed: boolean; reasons: readonly string[] } {
    const reasons: string[] = [];
    for (const policy of this.policies.values()) {
      const applies = policy.tenantId === null || policy.tenantId === ctx?.tenantId;
      if (!applies) continue;
      const verdict = policy.evaluate(action, ctx);
      if (!verdict.allowed) reasons.push(`${policy.id}: ${verdict.reason}`);
    }
    return { allowed: reasons.length === 0, reasons };
  }

  count(): number {
    return this.policies.size;
  }
}

export interface ComplianceCheck {
  readonly id: string;
  run(): { passed: boolean; detail: string };
}

export interface ComplianceReport {
  readonly compliant: boolean;
  readonly checks: readonly { id: string; passed: boolean; detail: string }[];
}

export class RuntimeComplianceManager {
  private readonly checks = new Map<string, ComplianceCheck>();

  addCheck(check: ComplianceCheck): void {
    if (this.checks.has(check.id)) {
      throw new PlatformError("compliance", `duplicate check "${check.id}"`);
    }
    this.checks.set(check.id, check);
  }

  /** A throwing check is a FAILED check — contained, never fatal. */
  report(): ComplianceReport {
    const results: { id: string; passed: boolean; detail: string }[] = [];
    for (const check of this.checks.values()) {
      try {
        const { passed, detail } = check.run();
        results.push({ id: check.id, passed, detail });
      } catch (error) {
        results.push({
          id: check.id,
          passed: false,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return { compliant: results.every((r) => r.passed), checks: results };
  }
}

/** Built-in checks wired by the platform kernel. */
export function builtinComplianceChecks(deps: {
  audit: AuditLayer;
  config: ConfigurationManager;
}): readonly ComplianceCheck[] {
  return [
    {
      id: "audit-chain-intact",
      run: () => ({
        passed: deps.audit.verify(),
        detail: deps.audit.verify() ? "hash chain verifies" : "audit chain broken — tampering",
      }),
    },
    {
      id: "no-secret-material-in-config",
      run: () => {
        const violations = deps.config.violations();
        return {
          passed: violations.length === 0,
          detail:
            violations.length === 0
              ? "configuration holds secret references only"
              : `raw secret material at: ${violations.join(", ")}`,
        };
      },
    },
  ];
}
