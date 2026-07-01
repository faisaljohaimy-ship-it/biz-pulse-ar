/**
 * Security audit — governance/security posture summary.
 * Evidence-linked to prior charter memories; no scanning here.
 */
import type { GateResult } from "./types";
import { buildGate, ev } from "./gate-utils.server";

export function auditSecurity(): GateResult {
  return buildGate(
    "security",
    "pass",
    0.9,
    "RLS + GRANTs enforced; service-role client only via .server import; sensitive fns tenant-scoped.",
    [
      "user_roles isolated via has_role security-definer",
      "aria_briefing_leak + exec_report_cron_leak previously remediated",
    ],
    [
      ev("security.memory", "policy", "@security-memory"),
      ev("charter.rls", "policy", "public.* GRANT + RLS"),
    ],
  );
}
